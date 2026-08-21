import Link from "next/link";

const HIBAK: Record<string, string> = {
  adatok: "Kérjük, add meg a neved és egy érvényes e-mail címet.",
  jelszo_rovid: "A jelszó legalább 8 karakter legyen.",
  jelszo_elter: "A két jelszó nem egyezik.",
  email_foglalt: "Ezzel az e-mail címmel már van fiók. Lépj be helyette.",
  tul_sok: "Túl sok regisztráció ugyanerről a gépről. Próbáld újra később.",
  ismeretlen: "Váratlan hiba történt, próbáld újra.",
};

export default function Regisztracio({ searchParams }: { searchParams: { hiba?: string } }) {
  return (
    <div className="narrow">
      <h1>Partner regisztráció</h1>
      <p style={{ color: "var(--muted)" }}>
        A regisztráció után az üzemeltető jóváhagyja a fiókod, és máris kapod az egyedi linkedet.
      </p>
      {searchParams.hiba && <div className="msg msg-err">{HIBAK[searchParams.hiba] ?? "Ismeretlen hiba."}</div>}
      <div className="card">
        <form className="stack" method="POST" action="/api/auth/partner-regisztracio">
          <div>
            <label htmlFor="name">Név</label>
            <input id="name" name="name" required autoComplete="name" />
          </div>
          <div>
            <label htmlFor="email">E-mail cím</label>
            <input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div>
            <label htmlFor="password">Jelszó</label>
            <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
            <div className="hint">Legalább 8 karakter.</div>
          </div>
          <div>
            <label htmlFor="password2">Jelszó még egyszer</label>
            <input id="password2" name="password2" type="password" required minLength={8} autoComplete="new-password" />
          </div>
          <button type="submit">Regisztráció</button>
        </form>
      </div>
      <p style={{ fontSize: 14 }}>
        Van már fiókod? <Link href="/belepes">Belépés</Link>
      </p>
    </div>
  );
}
