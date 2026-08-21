import { db } from "@/lib/db";
import { formatFt, formatDate, formatDateTime } from "@/lib/money";
import { approveCommission, approveAllDue, reverseCommission } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function Jutalekok({ searchParams }: { searchParams: { uzenet?: string; hiba?: string } }) {
  const { data: comms } = await db()
    .from("commissions")
    .select("id,amount_huf,rate,status,hold_until,note,created_at,affiliates(name,email),conversions(amount_huf,occurred_at)")
    .order("created_at", { ascending: false })
    .limit(200);

  const today = new Date().toISOString().slice(0, 10);
  const dueCount = (comms ?? []).filter((c) => c.status === "pending" && c.hold_until <= today).length;

  return (
    <>
      <h1>Jutalékok</h1>
      {searchParams.uzenet === "jovahagyva" && <div className="msg msg-ok">Az esedékes jutalékok jóváhagyva.</div>}
      {searchParams.hiba === "nincs_esedekes" && <div className="msg msg-err">Nincs jóváhagyható tétel. (Felfüggesztett partner jutaléka nem hagyható jóvá.)</div>}

      {dueCount > 0 && (
        <div className="msg msg-info" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span><strong>{dueCount}</strong> jutalék tartási ideje lejárt, jóváhagyható.</span>
          <form className="inline-form" action={approveAllDue}>
            <button className="btn-sm" type="submit">Összes esedékes jóváhagyása</button>
          </form>
        </div>
      )}

      <div className="tablecard"><div className="scroll">
        {(comms ?? []).length === 0 ? (
          <div className="empty">Még nincs jutalék. Az első partneri vásárlás után itt jelenik meg.</div>
        ) : (
          <table>
            <thead>
              <tr><th>Létrejött</th><th>Partner</th><th>Vásárlás</th><th>Jutalék</th><th>Állapot</th><th>Felszabadul</th><th></th></tr>
            </thead>
            <tbody>
              {(comms ?? []).map((c) => {
                const aff: any = Array.isArray(c.affiliates) ? c.affiliates[0] : c.affiliates;
                const conv: any = Array.isArray(c.conversions) ? c.conversions[0] : c.conversions;
                return (
                  <tr key={c.id}>
                    <td className="n">{formatDateTime(c.created_at)}</td>
                    <td><strong>{aff?.name ?? "?"}</strong><div className="hint">{aff?.email}</div></td>
                    <td className="n">{conv ? formatFt(conv.amount_huf) : "—"}</td>
                    <td className="n"><strong>{formatFt(c.amount_huf)}</strong><div className="hint">{Number(c.rate)}%</div></td>
                    <td>
                      {c.status === "pending" && <span className="badge b-pending">Függőben</span>}
                      {c.status === "approved" && <span className="badge b-approved">Jóváhagyva</span>}
                      {c.status === "paid" && <span className="badge b-paid">Kifizetve</span>}
                      {c.status === "reversed" && <span className="badge b-reversed">Visszavonva</span>}
                      {c.note ? <div className="hint">{c.note}</div> : null}
                    </td>
                    <td className="n">{c.status === "pending" ? formatDate(c.hold_until) : "—"}</td>
                    <td>
                      <div className="row-actions">
                        {c.status === "pending" && (
                          <form className="inline-form" action={approveCommission}>
                            <input type="hidden" name="id" value={c.id} />
                            <button className="btn-sm" type="submit">Jóváhagy</button>
                          </form>
                        )}
                        {(c.status === "pending" || c.status === "approved") && (
                          <form className="inline-form" action={reverseCommission}>
                            <input type="hidden" name="id" value={c.id} />
                            <button className="btn-sm btn-ghost" type="submit">Visszavon</button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div></div>
      <p className="hint">
        A jutalék a tartási idő lejárta után hagyható jóvá. Teljes Stripe-visszatérítés automatikusan
        visszavonja az érintett jutalékot, részleges visszatérítés pedig arányosan csökkenti. Ha a
        visszatérítés a kifizetés után érkezik, a tétel „Kifizetve” marad, és csak megjelölést kap,
        mert a pénz addigra elment: azt kézzel kell rendezni.
      </p>
    </>
  );
}
