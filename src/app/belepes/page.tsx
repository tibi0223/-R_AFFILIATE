import Link from "next/link";

const HIBAK: Record<string, string> = {
  belepes: "Hibás e-mail cím vagy jelszó.",
  felfuggesztve: "Ez a partnerfiók fel van függesztve. Kérdés esetén írj az üzemeltetőnek.",
  tul_sok: "Túl sok belépési kísérlet. Várj néhány percet, aztán próbáld újra.",
};

export default function Belepes({ searchParams }: { searchParams: { hiba?: string; uzenet?: string } }) {
  return (
    <div className="narrow">
      <h1>Partner belépés</h1>
      <p style={{ color: "var(--muted)" }}>Az ÉR Partnerprogram fiókodba.</p>
      {searchParams.uzenet === "regisztralva" && (
        <div className="msg msg-ok">Sikeres regisztráció! Belépés után látod a fiókod állapotát, a linkedet pedig jóváhagyás után kapod meg.</div>
      )}
      {searchParams.hiba && <div className="msg msg-err">{HIBAK[searchParams.hiba] ?? "Ismeretlen hiba."}</div>}
      <div className="card">
        <form className="stack" method="POST" action="/api/auth/partner-belepes">
          <div>
            <label htmlFor="email">E-mail cím</label>
            <input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div>
            <label htmlFor="password">Jelszó</label>
            <input id="password" name="password" type="password" required autoComplete="current-password" />
          </div>
          <button type="submit">Belépés</button>
        </form>
      </div>
      <p style={{ fontSize: 14 }}>
        Még nincs fiókod? <Link href="/regisztracio">Regisztrálj partnernek</Link>
      </p>
    </div>
  );
}
