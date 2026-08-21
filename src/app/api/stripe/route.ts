import Stripe from "stripe";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { stripeAmountToHuf } from "@/lib/money";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook fogadó.
 * Fontos: a rendszernek NINCS Stripe API kulcsa — csak a beérkező események
 * aláírását ellenőrzi a webhook signing secrettel. Pénzt mozgatni nem tud.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("STRIPE_WEBHOOK_SECRET nincs beállítva", { status: 500 });

  const body = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    // Az API kulcs itt csak a kliens példányosításához kell, hívást nem indítunk vele.
    const stripe = new Stripe("sk_nem_hasznalt_kulcs", { apiVersion: "2024-06-20" as Stripe.LatestApiVersion });
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch {
    return new Response("Érvénytelen aláírás", { status: 400 });
  }

  const supa = db();

  // Idempotencia: minden esemény pontosan egyszer fut le.
  const { error: dupErr } = await supa.from("stripe_events").insert({
    id: event.id,
    type: event.type,
    summary: summarize(event),
  });
  if (dupErr) return Response.json({ received: true, duplicate: true });

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "invoice.payment_succeeded":
        await onInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case "charge.refunded":
        await onRefund(event.data.object as Stripe.Charge);
        break;
      default:
        break; // más esemény: rögzítve, teendő nincs
    }
  } catch (e) {
    // Az esemény sora már bent van, ezért az újraküldés a duplikátum-védelem
    // miatt nem futna le újra. Jelöljük meg, hogy az Események oldalon látszódjon.
    console.error("Webhook feldolgozási hiba:", event.type, e);
    const msg = e instanceof Error ? e.message : String(e);
    await supa.from("stripe_events")
      .update({ summary: `FELDOLGOZÁSI HIBA: ${msg.slice(0, 200)}` })
      .eq("id", event.id);
  }

  return Response.json({ received: true });
}

function summarize(event: Stripe.Event): string {
  const o = event.data.object as unknown as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof o.customer === "string") parts.push(`customer=${o.customer}`);
  if (typeof o.client_reference_id === "string") parts.push(`ref=${o.client_reference_id}`);
  if (typeof o.amount_total === "number") parts.push(`amount_total=${o.amount_total}`);
  if (typeof o.amount_paid === "number") parts.push(`amount_paid=${o.amount_paid}`);
  if (typeof o.amount_refunded === "number") parts.push(`amount_refunded=${o.amount_refunded}`);
  if (typeof o.billing_reason === "string") parts.push(`reason=${o.billing_reason}`);
  return parts.join(" ");
}

async function findActiveAffiliateByCode(code: string | null | undefined) {
  if (!code) return null;
  const cleaned = code.trim();
  if (!/^[A-Za-z0-9_-]{4,32}$/.test(cleaned)) return null;
  const { data } = await db()
    .from("affiliates")
    .select("id,status")
    .eq("code", cleaned.toUpperCase())
    .maybeSingle();
  return data && data.status === "active" ? data : null;
}

/** Jutalék csak aktív partnernek keletkezik — felfüggesztettnek nem. */
async function isActiveAffiliate(affiliateId: string): Promise<boolean> {
  const { data } = await db().from("affiliates").select("status").eq("id", affiliateId).maybeSingle();
  return data?.status === "active";
}

async function createConversion(opts: {
  affiliateId: string;
  amountHuf: number;
  currency: string;
  isFirst: boolean;
  customerId?: string | null;
  sessionId?: string | null;
  invoiceId?: string | null;
  paymentIntent?: string | null;
}) {
  const { data, error } = await db()
    .from("conversions")
    .insert({
      affiliate_id: opts.affiliateId,
      stripe_customer_id: opts.customerId ?? null,
      stripe_session_id: opts.sessionId ?? null,
      stripe_invoice_id: opts.invoiceId ?? null,
      stripe_payment_intent: opts.paymentIntent ?? null,
      amount_huf: opts.amountHuf,
      refunded_huf: 0,
      currency: opts.currency,
      is_first: opts.isFirst,
    })
    .select("id")
    .single();
  return error ? null : data; // unique ütközés = ezt az eseményt már feldolgoztuk
}

/** Első (jutalékos) fizetés rögzítése + a hozzá tartozó jutalék létrehozása. */
async function createFirstConversion(opts: {
  affiliateId: string;
  amountHuf: number;
  currency: string;
  customerId?: string | null;
  sessionId?: string | null;
  invoiceId?: string | null;
  paymentIntent?: string | null;
}) {
  const conv = await createConversion({ ...opts, isFirst: true });
  if (!conv) return;

  // Felfüggesztett partner konverziója rögzül a statisztikában, de jutalékot nem hoz.
  if (!(await isActiveAffiliate(opts.affiliateId))) return;

  const settings = await getSettings();
  const hold = new Date();
  hold.setDate(hold.getDate() + settings.hold_days);
  await db().from("commissions").insert({
    affiliate_id: opts.affiliateId,
    conversion_id: conv.id,
    amount_huf: Math.round((opts.amountHuf * settings.commission_rate) / 100),
    rate: settings.commission_rate,
    status: "pending",
    hold_until: hold.toISOString().slice(0, 10),
  });
}

/** Első vásárlás: itt érkezik a client_reference_id (a partner kódja). */
async function onCheckoutCompleted(session: Stripe.Checkout.Session) {
  const affiliate = await findActiveAffiliateByCode(session.client_reference_id);
  if (!affiliate) return; // nem partneri vásárlás

  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;

  // Ügyfél ↔ partner megfeleltetés (megújulások és refund követéséhez)
  if (customerId) {
    await db().from("customers").upsert(
      { stripe_customer_id: customerId, affiliate_id: affiliate.id },
      { onConflict: "stripe_customer_id", ignoreDuplicates: true }
    );
  }

  const amount = session.amount_total ?? 0;
  if (amount <= 0) return; // pl. ingyenes próbaidőszak — az első terhelt számla számít majd

  await createFirstConversion({
    affiliateId: affiliate.id,
    amountHuf: stripeAmountToHuf(amount, session.currency ?? "huf"),
    currency: session.currency ?? "huf",
    customerId,
    sessionId: session.id,
    paymentIntent: typeof session.payment_intent === "string" ? session.payment_intent : null,
  });
}

/** Megújulások (statisztika) + próbaidőszak utáni első terhelés (jutalék). */
async function onInvoicePaid(invoice: Stripe.Invoice) {
  // Az első előfizetési számlát a checkout.session.completed már lefedte.
  if (invoice.billing_reason === "subscription_create") return;

  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? null;
  if (!customerId) return;

  const supa = db();
  const { data: map } = await supa.from("customers")
    .select("affiliate_id").eq("stripe_customer_id", customerId).maybeSingle();
  if (!map) return; // nem partneri ügyfél

  const amount = invoice.amount_paid ?? 0;
  if (amount <= 0) return;
  const amountHuf = stripeAmountToHuf(amount, invoice.currency ?? "huf");
  const paymentIntent = typeof invoice.payment_intent === "string" ? invoice.payment_intent : null;

  // Volt már első (jutalékos) fizetése ennek az ügyfélnek?
  const { count } = await supa.from("conversions")
    .select("*", { count: "exact", head: true })
    .eq("stripe_customer_id", customerId)
    .eq("is_first", true);

  if ((count ?? 0) === 0) {
    // Próbaidőszakos indulás: ez az első valódi terhelés → jutalék jár.
    await createFirstConversion({
      affiliateId: map.affiliate_id,
      amountHuf,
      currency: invoice.currency ?? "huf",
      customerId,
      invoiceId: invoice.id,
      paymentIntent,
    });
  } else {
    // Megújulás: rögzítjük statisztikának, jutalék nélkül (egyszeri modell).
    await createConversion({
      affiliateId: map.affiliate_id,
      amountHuf,
      currency: invoice.currency ?? "huf",
      isFirst: false,
      customerId,
      invoiceId: invoice.id,
      paymentIntent,
    });
  }
}

/**
 * Visszatérítés.
 * A charge.refunded RÉSZLEGES visszatérítéskor is megérkezik, és többször is
 * jöhet ugyanarra a terhelésre. Ezért mindig a Stripe-tól kapott halmozott
 * amount_refunded a mérvadó, és a jutalékot a megmaradt összeghez igazítjuk.
 */
async function onRefund(charge: Stripe.Charge) {
  const supa = db();
  const paymentIntent = typeof charge.payment_intent === "string" ? charge.payment_intent : null;
  const customerId = typeof charge.customer === "string" ? charge.customer : null;

  let conv: { id: string; amount_huf: number } | null = null;

  if (paymentIntent) {
    const { data } = await supa.from("conversions")
      .select("id,amount_huf").eq("stripe_payment_intent", paymentIntent)
      .order("occurred_at", { ascending: false }).limit(1);
    conv = (data ?? [])[0] ?? null;
  }
  if (!conv && customerId) {
    // Tartalék: ugyanannak az ügyfélnek több első vásárlása is lehet, ezért
    // NEM maybeSingle() (az több sorra hibára futna), hanem a legutóbbi.
    const { data } = await supa.from("conversions")
      .select("id,amount_huf").eq("stripe_customer_id", customerId).eq("is_first", true)
      .order("occurred_at", { ascending: false }).limit(1);
    conv = (data ?? [])[0] ?? null;
  }
  if (!conv) return;

  const currency = charge.currency ?? "huf";
  const refundedHuf = stripeAmountToHuf(charge.amount_refunded ?? 0, currency);
  const chargeHuf = stripeAmountToHuf(charge.amount ?? 0, currency);
  const full = (charge.amount_refunded ?? 0) >= (charge.amount ?? 0) || charge.refunded === true;

  await supa.from("conversions").update({ refunded_huf: refundedHuf }).eq("id", conv.id);

  const { data: comm } = await supa.from("commissions")
    .select("id,status,rate,amount_huf").eq("conversion_id", conv.id).maybeSingle();
  if (!comm) return;

  // Már kifizetett jutalékot nem írunk át — csak megjelöljük kézi rendezésre.
  if (comm.status === "paid") {
    await supa.from("commissions").update({
      note: full
        ? "Visszatérítés a kifizetés UTÁN, kézi rendezést igényel!"
        : `Részleges visszatérítés (${refundedHuf} Ft) a kifizetés UTÁN, kézi rendezést igényel!`,
    }).eq("id", comm.id);
    return;
  }
  if (comm.status === "reversed") return; // már visszavonva

  if (full) {
    await supa.from("commissions")
      .update({ status: "reversed", note: "Automatikus visszavonás: Stripe visszatérítés" })
      .eq("id", comm.id);
    return;
  }

  // Részleges: a jutalék a megmaradt összegre jár.
  const base = chargeHuf > 0 ? chargeHuf : conv.amount_huf;
  const remaining = Math.max(0, base - refundedHuf);
  const newAmount = Math.round((remaining * Number(comm.rate)) / 100);
  if (newAmount <= 0) {
    await supa.from("commissions")
      .update({ status: "reversed", note: "Automatikus visszavonás: teljes összeg visszatérítve" })
      .eq("id", comm.id);
    return;
  }
  await supa.from("commissions").update({
    amount_huf: newAmount,
    note: `Részleges visszatérítés: ${refundedHuf} Ft. A jutalék a megmaradt ${remaining} Ft-ra lett igazítva.`,
  }).eq("id", comm.id);
}
