/**
 * Egyszerű, függőség nélküli sebességkorlát a belépési és regisztrációs
 * végpontokra. Memóriában tart nyilván, folyamatonként.
 *
 * Fontos korlát: szerver nélküli (Vercel) környezetben több példány is futhat,
 * így a korlát példányonként külön él — ez a jelszó-találgatást lassítja, de
 * nem szünteti meg. Erős jelszó és a bcrypt költsége a másik két védvonal.
 * Ha ennél többre van szükség, ide kell egy megosztott számláló (pl. Upstash).
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/** Időnként takarítunk, hogy a Map ne nőjön korlátlanul. */
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}

/**
 * @returns true, ha a kérés MEHET; false, ha korlátba ütközött.
 */
export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}

/** Sikeres belépés után nullázzuk a számlálót. */
export function reset(key: string) {
  buckets.delete(key);
}

/** A kérés forrás-IP-je a szokásos proxy fejlécekből. */
export function clientIp(req: { headers: Headers }): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "ismeretlen";
}
