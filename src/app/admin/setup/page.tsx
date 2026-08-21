import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Setup({ searchParams }: { searchParams: { hiba?: string } }) {
  const { count } = await db().from("admins").select("*", { count: "exact", head: true });
  if ((count ?? 0) > 0) redirect("/admin/belepes");

  return (
    <div className="narrow">
      <h1>Első beüzemelés</h1>
      <p style={{ color: "var(--muted)" }}>
        Hozd létre az üzemeltetői (admin) fiókot. Ez az oldal csak addig érhető el, amíg nincs admin, utána automatikusan eltűnik.
      </p>
      {searchParams.hiba === "adatok" && (
        <div className="msg msg-err">Érvényes e-mail cím és legalább 8 karakteres jelszó szükséges.</div>
      )}
      <div className="card">
        <form className="stack" method="POST" action="/api/auth/admin-setup">
          <div>
            <label htmlFor="email">E-mail cím</label>
            <input id="email" name="email" type="email" required />
          </div>
          <div>
            <label htmlFor="password">Jelszó</label>
            <input id="password" name="password" type="password" required minLength={8} />
            <div className="hint">Legalább 8 karakter. Jelszókezelőben tárold!</div>
          </div>
          <button type="submit">Admin fiók létrehozása</button>
        </form>
      </div>
    </div>
  );
}
