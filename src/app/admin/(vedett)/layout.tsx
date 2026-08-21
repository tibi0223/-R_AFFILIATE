import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminGuardedLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/admin/belepes");
  return (
    <>
      <div className="topbar">
        <div className="topbar-in">
          <Link className="brand" href="/admin">ÉR <b>Affiliate admin</b></Link>
          <nav>
            <Link href="/admin">Áttekintés</Link>
            <Link href="/admin/partnerek">Partnerek</Link>
            <Link href="/admin/jutalekok">Jutalékok</Link>
            <Link href="/admin/kifizetes">Kifizetés</Link>
            <Link href="/admin/esemenyek">Események</Link>
            <Link href="/admin/beallitasok">Beállítások</Link>
            <form method="POST" action="/api/auth/kilepes"><button type="submit" className="navbtn">Kilépés</button></form>
          </nav>
        </div>
      </div>
      <div className="wrap">{children}</div>
    </>
  );
}
