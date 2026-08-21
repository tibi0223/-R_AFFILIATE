import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminBelepes({ searchParams }: { searchParams: { hiba?: string } }) {
  let hasAdmin = true;
  try {
    const { count } = await db().from("admins").select("*", { count: "exact", head: true });
    hasAdmin = (count ?? 0) > 0;
  } catch {
    /* env még nincs beállítva, a hibát a belépési kísérlet jelzi */
  }

  return (
    <div className="narrow">
      <h1>Üzemeltetői belépés</h1>
      {!hasAdmin && (
        <div className="msg msg-info">
          Még nincs admin fiók. <Link href="/admin/setup">Hozd létre az elsőt itt →</Link>
        </div>
      )}
      {searchParams.hiba === "belepes" && <div className="msg msg-err">Hibás e-mail cím vagy jelszó.</div>}
      {searchParams.hiba === "tul_sok" && <div className="msg msg-err">Túl sok belépési kísérlet. Várj néhány percet, aztán próbáld újra.</div>}
      <div className="card">
        <form className="stack" method="POST" action="/api/auth/admin-belepes">
          <div>
            <label htmlFor="email">E-mail cím</label>
            <input id="email" name="email" type="email" required />
          </div>
          <div>
            <label htmlFor="password">Jelszó</label>
            <input id="password" name="password" type="password" required />
          </div>
          <button type="submit">Belépés</button>
        </form>
      </div>
    </div>
  );
}
