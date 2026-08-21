import Link from "next/link";

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="topbar">
        <div className="topbar-in">
          <Link className="brand" href="/partner">ÉR <b>Partnerprogram</b></Link>
          <nav>
            <Link href="/partner">Áttekintés</Link>
            <Link href="/partner/adatok">Fiók és kifizetés</Link>
            <form method="POST" action="/api/auth/kilepes"><button type="submit" className="navbtn">Kilépés</button></form>
          </nav>
        </div>
      </div>
      <div className="wrap">{children}</div>
    </>
  );
}
