import { type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Utalási lista CSV letöltése egy kifizetési körhöz. Excel-kompatibilis (BOM + pontosvessző). */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "admin") return new Response("Nincs jogosultság", { status: 403 });

  const supa = db();
  const { data: batch } = await supa.from("payout_batches").select("id,created_at").eq("id", params.id).maybeSingle();
  if (!batch) return new Response("A kör nem található", { status: 404 });

  const { data: rows } = await supa
    .from("commissions")
    .select("amount_huf,affiliate_id,affiliates(name,bank_account,email)")
    .eq("batch_id", params.id);

  const byAff = new Map<string, { name: string; bank: string; email: string; total: number; count: number }>();
  for (const r of rows ?? []) {
    const aff: any = Array.isArray(r.affiliates) ? r.affiliates[0] : r.affiliates;
    const rec = byAff.get(r.affiliate_id) ?? {
      name: aff?.name ?? "", bank: aff?.bank_account ?? "", email: aff?.email ?? "", total: 0, count: 0,
    };
    rec.total += r.amount_huf;
    rec.count += 1;
    byAff.set(r.affiliate_id, rec);
  }

  // Az Excel a "=" / "+" / "-" / "@" kezdetű mezőt képletnek hinné — elé teszünk egy aposztrófot.
  const esc = (s: string) => {
    const v = String(s ?? "");
    const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const shortId = batch.id.slice(0, 8).toUpperCase();
  const lines = [
    ["Partner neve", "Bankszámlaszám", "E-mail", "Tételek száma", "Utalandó összeg (Ft)", "Közlemény"].map(esc).join(";"),
    ...[...byAff.values()].map((p) =>
      [p.name, p.bank, p.email, String(p.count), String(p.total), `ER-AFF-${shortId}`].map(esc).join(";")
    ),
  ];
  const csv = "﻿" + lines.join("\r\n");
  const date = new Date(batch.created_at).toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="utalasi-lista-${date}-${shortId}.csv"`,
    },
  });
}
