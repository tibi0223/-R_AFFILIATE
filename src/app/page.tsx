import Link from "next/link";

export default function Home() {
  return (
    <div className="hero">
      <span className="eyebrow">Partnerprogram</span>
      <h1>
        Ajánld az Étkezési Rendszert,<br />
        és <span style={{ color: "var(--accent)" }}>jutalékot kapsz</span> érte.
      </h1>
      <p className="lead">
        Kapsz egy egyedi linket. Minden kattintást és az abból lett előfizetést
        automatikusan mérjük, a jutalékodat pedig utaljuk. Céges adatot nem kérünk.
      </p>

      <div className="steps">
        <div className="step">
          <div className="num">1</div>
          <p>
            <span className="t">Regisztrálsz</span>
            <span className="d">Név, e-mail, jelszó. Jóváhagyás után azonnal él a linked.</span>
          </p>
        </div>
        <div className="step">
          <div className="num">2</div>
          <p>
            <span className="t">Megosztod a linket</span>
            <span className="d">Bejegyzésben, videóleírásban, hírlevélben, bárhol.</span>
          </p>
        </div>
        <div className="step">
          <div className="num">3</div>
          <p>
            <span className="t">Jutalékot kapsz</span>
            <span className="d">Minden általad hozott előfizetés után, havi utalással.</span>
          </p>
        </div>
      </div>

      <div className="cta">
        <Link className="btn" href="/regisztracio">Partner leszek</Link>
        <Link className="btn btn-ghost" href="/belepes">Belépés</Link>
      </div>

      <p className="footer">
        <Link href="/admin/belepes" style={{ color: "var(--faint)" }}>Üzemeltetői belépés</Link>
      </p>
    </div>
  );
}
