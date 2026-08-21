import Link from "next/link";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatFt, formatDateTime } from "@/lib/money";
import { createPayoutBatch } from "@/app/actions";

export const dynamic = "force-dynamic";

type Rec = { name: string; email: string; bank: string; status: string; total: number; count: number };

export default async function Kifizetes({ searchParams }: { searchParams: { uzenet?: string; hiba?: string; batch?: string } }) {
  const supa = db();
  const settings = await getSettings();

  const { data: rows } = await supa
    .from("commissions")
    .select("id,amount_huf,affiliate_id,affiliates(name,bank_account,email,status)")
    .eq("status", "approved")
    .is("batch_id", null);

  const byAff = new Map<string, Rec>();
  for (const r of rows ?? []) {
    const aff: any = Array.isArray(r.affiliates) ? r.affiliates[0] : r.affiliates;
    const rec = byAff.get(r.affiliate_id) ?? {
      name: aff?.name ?? "?", email: aff?.email ?? "",
      bank: aff?.bank_account ?? "", status: aff?.status ?? "active", total: 0, count: 0,
    };
    rec.total += r.amount_huf;
    rec.count += 1;
    byAff.set(r.affiliate_id, rec);
  }
  const partners = [...byAff.values()].sort((a, b) => b.total - a.total);
  const payable = (p: Rec) => Boolean(p.bank) && p.status !== "suspended";
  const eligible = partners.filter((p) => p.total >= settings.min_payout_huf && payable(p));
  const eligibleTotal = eligible.reduce((a, p) => a + p.total, 0);

  const { data: batches } = await supa
    .from("payout_batches")
    .select("id,total_huf,created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  const reason = (p: Rec) => {
    if (p.status === "suspended") return "felfüggesztve";
    if (!p.bank) return "nincs bankszámla";
    return "küszöb alatt";
  };

  return (
    <>
      <h1>Kifizetés</h1>
      <p className="lead">
        Havonta egyszer: lezárod a kört, letöltöd az utalási listát, és a bankod
        felületén elutalod. A rendszer pénzt nem mozgat.
      </p>

      {searchParams.uzenet === "kor_letrehozva" && (
        <div className="msg msg-ok">
          Kifizetési kör létrehozva, a tételek „kifizetve” állapotba kerültek.{" "}
          {searchParams.batch && <a href={`/admin/kifizetes/${searchParams.batch}`}>Utalási lista (CSV) letöltése →</a>}
        </div>
      )}
      {searchParams.hiba === "nincs_tetele" && (
        <div className="msg msg-err">Nincs olyan partner, aki elérné a küszöböt ÉS megadta volna a bankszámlaszámát.</div>
      )}

      <div className="card">
        <h2>Esedékes kifizetések</h2>
        <p className="hint">
          Jóváhagyott, még ki nem fizetett jutalékok partnerenként. A körbe azok kerülnek,
          akik elérik a <strong>{formatFt(settings.min_payout_huf)}</strong> küszöböt, megadták a
          bankszámlaszámukat, és nincsenek felfüggesztve.
        </p>
        <div className="tablecard"><div className="scroll">
          {partners.length === 0 ? (
            <div className="empty">Most nincs kifizetésre váró jutalék.</div>
          ) : (
            <table>
              <thead><tr><th>Partner</th><th>Bankszámlaszám</th><th>Tétel</th><th>Összeg</th><th>Körbe kerül?</th></tr></thead>
              <tbody>
                {partners.map((p, i) => {
                  const inRound = p.total >= settings.min_payout_huf && payable(p);
                  return (
                    <tr key={i}>
                      <td><strong>{p.name}</strong><div className="hint">{p.email}</div></td>
                      <td>{p.bank ? <span className="mono-sm">{p.bank}</span> : <span className="badge b-suspended">hiányzik</span>}</td>
                      <td className="n">{p.count} db</td>
                      <td className="n"><strong>{formatFt(p.total)}</strong></td>
                      <td>{inRound ? <span className="badge b-approved">igen</span> : <span className="badge b-gray">{reason(p)}</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div></div>
        {eligible.length > 0 && (
          <form action={createPayoutBatch}>
            <button type="submit">
              Kör lezárása és utalási lista készítése ({eligible.length} partner, {formatFt(eligibleTotal)})
            </button>
            <p className="hint" style={{ marginTop: 10 }}>
              A gomb a tételeket „kifizetve” állapotba teszi és elkészíti a CSV utalási listát.
              A tényleges utalást ezután banki felületen kell elvégezni.
            </p>
          </form>
        )}
      </div>

      <h2>Korábbi körök</h2>
      <div className="tablecard"><div className="scroll">
        {(batches ?? []).length === 0 ? (
          <div className="empty">Még nem volt kifizetési kör.</div>
        ) : (
          <table>
            <thead><tr><th>Időpont</th><th>Összeg</th><th>Utalási lista</th></tr></thead>
            <tbody>
              {(batches ?? []).map((b) => (
                <tr key={b.id}>
                  <td className="n">{formatDateTime(b.created_at)}</td>
                  <td className="n"><strong>{formatFt(b.total_huf)}</strong></td>
                  <td><Link href={`/admin/kifizetes/${b.id}`}>CSV letöltése</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div></div>
    </>
  );
}
