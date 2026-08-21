import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function Esemenyek() {
  const { data: events } = await db()
    .from("stripe_events")
    .select("id,type,summary,received_at")
    .order("received_at", { ascending: false })
    .limit(100);

  return (
    <>
      <h1>Stripe események</h1>
      <p className="hint">
        Az utolsó 100 beérkezett esemény, nyers formában. Ha egy vásárlás nem jelenik meg a jutalékok között, először itt nézd meg, megérkezett-e egyáltalán.
      </p>
      <div className="tablecard"><div className="scroll">
        {(events ?? []).length === 0 ? (
          <div className="empty">
            Még nem érkezett esemény. Ellenőrizd, hogy a Stripe webhook be van-e állítva erre a címre: <code>/api/stripe</code>
          </div>
        ) : (
          <table>
            <thead><tr><th>Időpont</th><th>Típus</th><th>Részletek</th><th>Esemény ID</th></tr></thead>
            <tbody>
              {(events ?? []).map((e) => (
                <tr key={e.id}>
                  <td className="n">{formatDateTime(e.received_at)}</td>
                  <td><code>{e.type}</code></td>
                  <td style={{ fontSize: 12.5, color: "var(--muted)" }}>{e.summary || "—"}</td>
                  <td className="n" style={{ fontSize: 12 }}><code>{e.id}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div></div>
    </>
  );
}
