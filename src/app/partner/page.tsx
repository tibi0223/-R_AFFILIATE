import { headers } from "next/headers";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatFt, formatDateTime } from "@/lib/money";
import CopyButton from "@/components/CopyButton";

export const dynamic = "force-dynamic";

export default async function PartnerHome() {
  const session = (await getSession())!;
  const supa = db();

  const { data: aff } = await supa
    .from("affiliates")
    .select("id,name,code,status,bank_account")
    .eq("id", session.id)
    .single();
  if (!aff) return <div className="msg msg-err">A fiók nem található.</div>;

  const [{ count: clickCount }, { data: convs }, { data: comms }] = await Promise.all([
    supa.from("clicks").select("*", { count: "exact", head: true }).eq("affiliate_id", aff.id),
    supa.from("conversions").select("amount_huf,is_first,occurred_at").eq("affiliate_id", aff.id).order("occurred_at", { ascending: false }),
    supa.from("commissions").select("amount_huf,status,hold_until,created_at").eq("affiliate_id", aff.id).order("created_at", { ascending: false }),
  ]);

  const firstConvs = (convs ?? []).filter((c) => c.is_first);
  const renewals = (convs ?? []).filter((c) => !c.is_first);
  const sum = (st: string[]) => (comms ?? []).filter((c) => st.includes(c.status)).reduce((a, c) => a + c.amount_huf, 0);

  const host = headers().get("host") ?? "";
  const proto = host.includes("localhost") ? "http" : "https";
  const link = `${proto}://${host}/r/${aff.code}`;

  return (
    <>
      <h1>Szia, {aff.name}!</h1>

      {aff.status === "pending" && (
        <div className="msg msg-info">
          A fiókod <strong>jóváhagyásra vár</strong>. Amint az üzemeltető jóváhagyja, itt jelenik meg az egyedi linked, és azonnal indulhat a megosztás.
        </div>
      )}
      {aff.status === "suspended" && (
        <div className="msg msg-err">A fiókod fel van függesztve. Kérdés esetén vedd fel a kapcsolatot az üzemeltetővel.</div>
      )}

      {aff.status === "active" && (
        <div className="card">
          <h2>Az egyedi linked</h2>
          <div className="linkbox">
            <code>{link}</code>
            <CopyButton text={link} />
          </div>
          <p className="hint" style={{ marginTop: 10 }}>
            Ezt oszd meg bárhol: bejegyzésben, videóleírásban, hírlevélben. Minden kattintást és az abból lett előfizetéseket automatikusan mérjük.
          </p>
          {!aff.bank_account && (
            <p className="hint" style={{ color: "var(--accent)" }}>
              Tipp: add meg a <Link href="/partner/adatok">bankszámlaszámodat</Link>, e nélkül nem tudunk utalni.
            </p>
          )}
        </div>
      )}

      <div className="grid">
        <div className="stat"><div className="lbl">Kattintás</div><div className="val">{clickCount ?? 0}</div></div>
        <div className="stat"><div className="lbl">Előfizetés</div><div className="val">{firstConvs.length}</div><div className="sub">{renewals.length} megújulás</div></div>
        <div className="stat"><div className="lbl">Függő jutalék</div><div className="val">{formatFt(sum(["pending"]))}</div><div className="sub">a tartási idő alatt</div></div>
        <div className="stat"><div className="lbl">Jóváhagyva</div><div className="val">{formatFt(sum(["approved"]))}</div><div className="sub">a következő kifizetésben</div></div>
        <div className="stat"><div className="lbl">Kifizetve</div><div className="val">{formatFt(sum(["paid"]))}</div></div>
      </div>

      <h2>Jutalékaid</h2>
      <div className="tablecard"><div className="scroll">
        {(comms ?? []).length === 0 ? (
          <div className="empty">Még nincs jutalékod. Oszd meg a linkedet, és itt jelenik meg az első!</div>
        ) : (
          <table>
            <thead><tr><th>Dátum</th><th>Összeg</th><th>Állapot</th><th>Felszabadul</th></tr></thead>
            <tbody>
              {(comms ?? []).slice(0, 30).map((c, i) => (
                <tr key={i}>
                  <td className="n">{formatDateTime(c.created_at)}</td>
                  <td className="n"><strong>{formatFt(c.amount_huf)}</strong></td>
                  <td><StatusBadge status={c.status} /></td>
                  <td className="n">{c.status === "pending" ? new Date(c.hold_until).toLocaleDateString("hu-HU") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div></div>
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    pending: { cls: "b-pending", label: "Függőben" },
    approved: { cls: "b-approved", label: "Jóváhagyva" },
    paid: { cls: "b-paid", label: "Kifizetve" },
    reversed: { cls: "b-reversed", label: "Visszavonva" },
  };
  const m = map[status] ?? { cls: "b-gray", label: status };
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}
