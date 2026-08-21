import Link from "next/link";
import { db } from "@/lib/db";
import { formatFt } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const supa = db();
  const [
    { count: pendingAffs },
    { count: activeAffs },
    { count: clicks },
    { data: convs },
    { data: comms },
  ] = await Promise.all([
    supa.from("affiliates").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supa.from("affiliates").select("*", { count: "exact", head: true }).eq("status", "active"),
    supa.from("clicks").select("*", { count: "exact", head: true }),
    supa.from("conversions").select("amount_huf,is_first"),
    supa.from("commissions").select("amount_huf,status,note"),
  ]);

  const firstCount = (convs ?? []).filter((c) => c.is_first).length;
  const revenue = (convs ?? []).reduce((a, c) => a + c.amount_huf, 0);
  const sum = (st: string) => (comms ?? []).filter((c) => c.status === st).reduce((a, c) => a + c.amount_huf, 0);
  // A kifizetés utáni visszatérítésnél a tétel "paid" marad (a pénz tényleg elment),
  // csak megjegyzést kap. A figyelmeztetés ezért a megjegyzésre szűr, nem az állapotra.
  const attention = (comms ?? []).filter((c) => (c.note ?? "").includes("kifizetés UTÁN")).length;

  return (
    <>
      <h1>Áttekintés</h1>

      {(pendingAffs ?? 0) > 0 && (
        <div className="msg msg-info">
          <strong>{pendingAffs}</strong> partner vár jóváhagyásra. <Link href="/admin/partnerek">Partnerek kezelése →</Link>
        </div>
      )}
      {attention > 0 && (
        <div className="msg msg-err">
          <strong>{attention}</strong> jutaléknál a kifizetés UTÁN történt visszatérítés, ez kézi rendezést igényel. <Link href="/admin/jutalekok">Megnézem →</Link>
        </div>
      )}

      <div className="grid">
        <div className="stat"><div className="lbl">Aktív partner</div><div className="val">{activeAffs ?? 0}</div></div>
        <div className="stat"><div className="lbl">Kattintás</div><div className="val">{clicks ?? 0}</div></div>
        <div className="stat"><div className="lbl">Partneri előfizetés</div><div className="val">{firstCount}</div><div className="sub">{(convs ?? []).length - firstCount} megújulás</div></div>
        <div className="stat"><div className="lbl">Partneri forgalom</div><div className="val">{formatFt(revenue)}</div><div className="sub">bruttó</div></div>
      </div>
      <div className="grid">
        <div className="stat"><div className="lbl">Függő jutalék</div><div className="val">{formatFt(sum("pending"))}</div><div className="sub">tartási idő alatt</div></div>
        <div className="stat"><div className="lbl">Jóváhagyott</div><div className="val">{formatFt(sum("approved"))}</div><div className="sub">kifizetésre vár</div></div>
        <div className="stat"><div className="lbl">Kifizetett</div><div className="val">{formatFt(sum("paid"))}</div></div>
        <div className="stat"><div className="lbl">Visszavont</div><div className="val">{formatFt(sum("reversed"))}</div></div>
      </div>
    </>
  );
}
