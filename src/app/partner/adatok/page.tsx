import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { partnerSavePayout, partnerChangePassword } from "@/app/actions";

export const dynamic = "force-dynamic";

const HIBAK: Record<string, string> = {
  jelszo_rovid: "Az új jelszó legalább 8 karakter legyen.",
  jelszo_elter: "A két új jelszó nem egyezik.",
  jelszo_rossz: "A jelenlegi jelszó nem stimmel.",
};

export default async function Adatok({ searchParams }: { searchParams: { uzenet?: string; hiba?: string } }) {
  const session = (await getSession())!;
  const { data: aff } = await db()
    .from("affiliates")
    .select("name,email,bank_account")
    .eq("id", session.id)
    .single();

  return (
    <div style={{ maxWidth: 560 }}>
      <h1>Fiók és kifizetés</h1>
      <p className="lead">
        A jutalék utalásához egyetlen adat kell: a bankszámlaszámod. Céges adatot
        (cégnév, adószám, székhely) nem kérünk és nem tárolunk.
      </p>

      {searchParams.uzenet === "mentve" && <div className="msg msg-ok">Adatok elmentve.</div>}
      {searchParams.uzenet === "jelszo_mentve" && <div className="msg msg-ok">Jelszó módosítva.</div>}
      {searchParams.hiba && <div className="msg msg-err">{HIBAK[searchParams.hiba] ?? "Ismeretlen hiba."}</div>}

      <div className="card">
        <h2>Kifizetési adatok</h2>
        <form className="stack" action={partnerSavePayout}>
          <div>
            <label htmlFor="bank_account">Bankszámlaszám</label>
            <input
              id="bank_account"
              name="bank_account"
              defaultValue={aff?.bank_account ?? ""}
              placeholder="11111111-22222222-33333333"
              inputMode="text"
            />
            <div className="hint">
              Enélkül nem kerülhetsz be a kifizetési körbe. A számla a te nevedre
              ({aff?.name}) szóljon.
            </div>
          </div>
          <div>
            <button type="submit">Mentés</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Jelszó módosítása</h2>
        <form className="stack" action={partnerChangePassword}>
          <div>
            <label htmlFor="current_password">Jelenlegi jelszó</label>
            <input id="current_password" name="current_password" type="password" required autoComplete="current-password" />
          </div>
          <div>
            <label htmlFor="password">Új jelszó</label>
            <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
            <div className="hint">Legalább 8 karakter.</div>
          </div>
          <div>
            <label htmlFor="password2">Új jelszó még egyszer</label>
            <input id="password2" name="password2" type="password" required minLength={8} autoComplete="new-password" />
          </div>
          <div>
            <button type="submit" className="btn-ghost">Jelszó módosítása</button>
          </div>
        </form>
        <p className="hint">
          Elfelejtetted a jelszavad? A rendszer nem küld e-mailt, ezért írj az üzemeltetőnek,
          és ő ad neked újat.
        </p>
      </div>
    </div>
  );
}
