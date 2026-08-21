import { db } from "@/lib/db";
import { formatDate } from "@/lib/money";
import { setAffiliateStatus, setPartnerPassword } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function Partnerek({ searchParams }: { searchParams: { uzenet?: string; hiba?: string } }) {
  const { data: affs } = await db()
    .from("affiliates")
    .select("id,name,email,code,status,bank_account,created_at")
    .order("created_at", { ascending: false });

  return (
    <>
      <h1>Partnerek</h1>
      <p className="lead">
        A partner csak nevet, e-mailt és bankszámlaszámot ad meg. Jóváhagyás után
        azonnal él a linkje.
      </p>

      {searchParams.uzenet === "jelszo_mentve" && <div className="msg msg-ok">Az új jelszó elmentve. Juttasd el a partnernek.</div>}
      {searchParams.hiba === "jelszo_rovid" && <div className="msg msg-err">A jelszó legalább 8 karakter legyen.</div>}

      <div className="tablecard"><div className="scroll">
        {(affs ?? []).length === 0 ? (
          <div className="empty">Még nincs regisztrált partner.</div>
        ) : (
          <table>
            <thead>
              <tr><th>Név</th><th>Kód</th><th>Bankszámla</th><th>Állapot</th><th>Regisztrált</th><th></th></tr>
            </thead>
            <tbody>
              {(affs ?? []).map((a) => (
                <tr key={a.id}>
                  <td><strong>{a.name}</strong><div className="hint">{a.email}</div></td>
                  <td className="n"><code>{a.code}</code></td>
                  <td>
                    {a.bank_account
                      ? <span className="mono-sm">{a.bank_account}</span>
                      : <span className="badge b-gray">nincs megadva</span>}
                  </td>
                  <td>
                    {a.status === "pending" && <span className="badge b-pending">Jóváhagyásra vár</span>}
                    {a.status === "active" && <span className="badge b-active">Aktív</span>}
                    {a.status === "suspended" && <span className="badge b-suspended">Felfüggesztve</span>}
                  </td>
                  <td className="n">{formatDate(a.created_at)}</td>
                  <td>
                    <div className="row-actions">
                      {a.status !== "active" && (
                        <form className="inline-form" action={setAffiliateStatus}>
                          <input type="hidden" name="id" value={a.id} />
                          <input type="hidden" name="status" value="active" />
                          <button className="btn-sm" type="submit">Jóváhagy</button>
                        </form>
                      )}
                      {a.status === "active" && (
                        <form className="inline-form" action={setAffiliateStatus}>
                          <input type="hidden" name="id" value={a.id} />
                          <input type="hidden" name="status" value="suspended" />
                          <button className="btn-sm btn-ghost" type="submit">Felfüggeszt</button>
                        </form>
                      )}
                      {a.status === "suspended" && (
                        <form className="inline-form" action={setAffiliateStatus}>
                          <input type="hidden" name="id" value={a.id} />
                          <input type="hidden" name="status" value="pending" />
                          <button className="btn-sm btn-ghost" type="submit">Feloldás</button>
                        </form>
                      )}
                      <details className="pw">
                        <summary>Új jelszó</summary>
                        <form className="pw-form" action={setPartnerPassword}>
                          <input type="hidden" name="id" value={a.id} />
                          <input
                            name="password"
                            type="text"
                            minLength={8}
                            required
                            placeholder="legalább 8 karakter"
                            autoComplete="off"
                          />
                          <button className="btn-sm" type="submit">Beállít</button>
                        </form>
                        <div className="hint">
                          A rendszer nem küld e-mailt. Írd be az új jelszót, majd juttasd el a partnernek.
                        </div>
                      </details>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div></div>
    </>
  );
}
