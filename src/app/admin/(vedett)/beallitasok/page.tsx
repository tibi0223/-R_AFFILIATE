import { getSettings } from "@/lib/settings";
import { saveSettings, changeAdminPassword } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function Beallitasok({ searchParams }: { searchParams: { uzenet?: string; hiba?: string } }) {
  const s = await getSettings();
  return (
    <div style={{ maxWidth: 560 }}>
      <h1>Beállítások</h1>
      {searchParams.uzenet === "mentve" && <div className="msg msg-ok">Beállítások elmentve. Az új értékek a következő vásárlástól érvényesek.</div>}
      {searchParams.uzenet === "jelszo_mentve" && <div className="msg msg-ok">Jelszó módosítva.</div>}
      {searchParams.hiba === "ertekek" && <div className="msg msg-err">Érvénytelen értékek. Jutalék: 0–100%, tartás: 0–365 nap.</div>}
      {searchParams.hiba === "jelszo_rovid" && <div className="msg msg-err">A jelszó legalább 8 karakter legyen.</div>}

      <div className="card">
        <h2>Jutalékszabályok</h2>
        <form className="stack" action={saveSettings}>
          <div>
            <label htmlFor="commission_rate">Jutalék (%) a bruttó befizetett összegből</label>
            <input id="commission_rate" name="commission_rate" type="number" step="0.5" min={0} max={100} defaultValue={s.commission_rate} required />
          </div>
          <div>
            <label htmlFor="hold_days">Tartási idő (nap)</label>
            <input id="hold_days" name="hold_days" type="number" min={0} max={365} defaultValue={s.hold_days} required />
            <div className="hint">Ennyi ideig „függő” a jutalék, ez fedezi a 14 napos elállást és a visszatérítéseket. Éves csomag hangsúlyos értékesítésénél 45–60 nap ajánlott.</div>
          </div>
          <div>
            <label htmlFor="min_payout_huf">Kifizetési küszöb (Ft)</label>
            <input id="min_payout_huf" name="min_payout_huf" type="number" min={0} step={1000} defaultValue={s.min_payout_huf} required />
            <div className="hint">E alatt a jutalék a következő körre gördül át.</div>
          </div>
          <button type="submit">Mentés</button>
        </form>
      </div>

      <div className="card">
        <h2>Admin jelszó módosítása</h2>
        <form className="stack" action={changeAdminPassword}>
          <div>
            <label htmlFor="password">Új jelszó</label>
            <input id="password" name="password" type="password" minLength={8} required />
          </div>
          <button type="submit" className="btn-ghost" style={{ color: "var(--text)" }}>Jelszó módosítása</button>
        </form>
      </div>
    </div>
  );
}
