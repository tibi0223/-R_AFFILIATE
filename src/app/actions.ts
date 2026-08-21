"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession, hashPassword, verifyPassword } from "@/lib/auth";

// ── segédek ──────────────────────────────────────────────────────────

async function requireAdmin() {
  const s = await getSession();
  if (!s || s.role !== "admin") redirect("/admin/belepes");
  return s!;
}
async function requirePartner() {
  const s = await getSession();
  if (!s || s.role !== "partner") redirect("/belepes");
  return s!;
}
const clean = (v: FormDataEntryValue | null) => String(v ?? "").trim();

/** A jutalék/kifizetés adatok több oldalon is megjelennek — mindet frissítjük. */
function revalidateMoney() {
  revalidatePath("/admin");
  revalidatePath("/admin/jutalekok");
  revalidatePath("/admin/kifizetes");
  revalidatePath("/partner");
}

/** Felfüggesztett partner nem kerül be jóváhagyásba és kifizetési körbe sem. */
async function suspendedAffiliateIds(): Promise<Set<string>> {
  const { data } = await db().from("affiliates").select("id").eq("status", "suspended");
  return new Set((data ?? []).map((a: { id: string }) => a.id));
}

// ── partner: kifizetési adatok és jelszó ─────────────────────────────

export async function partnerSavePayout(formData: FormData) {
  const s = await requirePartner();
  const bank = clean(formData.get("bank_account"));
  await db().from("affiliates").update({ bank_account: bank }).eq("id", s.id);
  revalidatePath("/partner/adatok");
  revalidatePath("/partner");
  redirect("/partner/adatok?uzenet=mentve");
}

export async function partnerChangePassword(formData: FormData) {
  const s = await requirePartner();
  const current = String(formData.get("current_password") ?? "");
  const pw = String(formData.get("password") ?? "");
  const pw2 = String(formData.get("password2") ?? "");

  if (pw.length < 8) redirect("/partner/adatok?hiba=jelszo_rovid");
  if (pw !== pw2) redirect("/partner/adatok?hiba=jelszo_elter");

  const { data: aff } = await db().from("affiliates").select("password_hash").eq("id", s.id).single();
  if (!aff || !(await verifyPassword(current, aff.password_hash))) {
    redirect("/partner/adatok?hiba=jelszo_rossz");
  }
  await db().from("affiliates").update({ password_hash: await hashPassword(pw) }).eq("id", s.id);
  redirect("/partner/adatok?uzenet=jelszo_mentve");
}

// ── admin: partnerek ─────────────────────────────────────────────────

export async function setAffiliateStatus(formData: FormData) {
  await requireAdmin();
  const id = clean(formData.get("id"));
  const status = clean(formData.get("status"));
  if (!["pending", "active", "suspended"].includes(status)) redirect("/admin/partnerek");
  await db().from("affiliates").update({ status }).eq("id", id);
  revalidatePath("/admin/partnerek");
  revalidatePath("/admin");
  redirect("/admin/partnerek");
}

/**
 * Partneri jelszó beállítása az üzemeltető által.
 * E-mailt a rendszer nem küld, ezért nincs önkiszolgáló "elfelejtett jelszó":
 * az üzemeltető ad új jelszót, és azt juttatja el a partnerhez.
 */
export async function setPartnerPassword(formData: FormData) {
  await requireAdmin();
  const id = clean(formData.get("id"));
  const pw = String(formData.get("password") ?? "");
  if (pw.length < 8) redirect("/admin/partnerek?hiba=jelszo_rovid");
  await db().from("affiliates").update({ password_hash: await hashPassword(pw) }).eq("id", id);
  revalidatePath("/admin/partnerek");
  redirect("/admin/partnerek?uzenet=jelszo_mentve");
}

// ── admin: jutalékok ─────────────────────────────────────────────────

export async function approveCommission(formData: FormData) {
  await requireAdmin();
  const id = clean(formData.get("id"));
  await db().from("commissions").update({ status: "approved" }).eq("id", id).eq("status", "pending");
  revalidateMoney();
  redirect("/admin/jutalekok");
}

export async function approveAllDue(_formData: FormData) {
  await requireAdmin();
  const supa = db();
  const today = new Date().toISOString().slice(0, 10);
  const suspended = await suspendedAffiliateIds();

  const { data: due } = await supa.from("commissions")
    .select("id,affiliate_id").eq("status", "pending").lte("hold_until", today);
  const ids = (due ?? []).filter((c) => !suspended.has(c.affiliate_id)).map((c) => c.id);
  if (ids.length === 0) redirect("/admin/jutalekok?hiba=nincs_esedekes");

  await supa.from("commissions").update({ status: "approved" }).in("id", ids).eq("status", "pending");
  revalidateMoney();
  redirect("/admin/jutalekok?uzenet=jovahagyva");
}

export async function reverseCommission(formData: FormData) {
  await requireAdmin();
  const id = clean(formData.get("id"));
  await db().from("commissions").update({ status: "reversed", note: "Kézi visszavonás (admin)" })
    .eq("id", id).in("status", ["pending", "approved"]);
  revalidateMoney();
  redirect("/admin/jutalekok");
}

// ── admin: kifizetési kör ────────────────────────────────────────────

export async function createPayoutBatch(_formData: FormData) {
  await requireAdmin();
  const supa = db();

  const { data: rows } = await supa
    .from("commissions")
    .select("id,amount_huf,affiliate_id,affiliates(bank_account,status)")
    .eq("status", "approved")
    .is("batch_id", null);
  const { data: settingsRow } = await supa.from("settings").select("min_payout_huf").eq("id", 1).single();
  const minPayout = Number(settingsRow?.min_payout_huf ?? 20000);

  // partnerenként összegzünk; csak aktív partner, küszöb felett, bankszámlával
  const byAff = new Map<string, { total: number; ids: string[]; payable: boolean }>();
  for (const r of rows ?? []) {
    const aff: any = Array.isArray(r.affiliates) ? r.affiliates[0] : r.affiliates;
    const rec = byAff.get(r.affiliate_id) ?? { total: 0, ids: [], payable: false };
    rec.total += r.amount_huf;
    rec.ids.push(r.id);
    rec.payable = Boolean(aff?.bank_account) && aff?.status !== "suspended";
    byAff.set(r.affiliate_id, rec);
  }
  const includeIds: string[] = [];
  let total = 0;
  for (const rec of byAff.values()) {
    if (rec.total >= minPayout && rec.payable) {
      includeIds.push(...rec.ids);
      total += rec.total;
    }
  }
  if (includeIds.length === 0) redirect("/admin/kifizetes?hiba=nincs_tetele");

  const { data: batch } = await supa.from("payout_batches")
    .insert({ total_huf: total, note: "Kifizetési kör" })
    .select("id").single();

  // A szűkítés megismétlése az íráskor is: ha közben egy tétel állapotot váltott
  // vagy már körbe került, nem írjuk felül.
  await supa.from("commissions")
    .update({ status: "paid", batch_id: batch!.id })
    .in("id", includeIds)
    .eq("status", "approved")
    .is("batch_id", null);
  revalidateMoney();
  redirect(`/admin/kifizetes?uzenet=kor_letrehozva&batch=${batch!.id}`);
}

// ── admin: beállítások ───────────────────────────────────────────────

export async function saveSettings(formData: FormData) {
  await requireAdmin();
  const rate = Number(formData.get("commission_rate"));
  const hold = Number(formData.get("hold_days"));
  const minp = Number(formData.get("min_payout_huf"));
  if (!(rate >= 0 && rate <= 100) || !(hold >= 0 && hold <= 365) || !(minp >= 0)) {
    redirect("/admin/beallitasok?hiba=ertekek");
  }
  await db().from("settings").update({
    commission_rate: rate, hold_days: hold, min_payout_huf: minp,
    updated_at: new Date().toISOString(),
  }).eq("id", 1);
  revalidatePath("/admin/beallitasok");
  redirect("/admin/beallitasok?uzenet=mentve");
}

export async function changeAdminPassword(formData: FormData) {
  const s = await requireAdmin();
  const pw = String(formData.get("password") ?? "");
  if (pw.length < 8) redirect("/admin/beallitasok?hiba=jelszo_rovid");
  await db().from("admins").update({ password_hash: await hashPassword(pw) }).eq("id", s.id);
  redirect("/admin/beallitasok?uzenet=jelszo_mentve");
}
