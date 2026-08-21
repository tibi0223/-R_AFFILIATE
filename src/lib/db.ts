import { createClient, SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Szerveroldali Supabase kliens (service_role kulccsal). Soha nem kerül a böngészőbe.
 * DEMO_MODE=1 esetén fájl-alapú mintaadatbázist használ (lásd: src/lib/demo-store.ts) —
 * ez kizárólag kipróbáláshoz való, élesben soha ne legyen bekapcsolva.
 */
export function db(): SupabaseClient {
  if (process.env.DEMO_MODE === "1") {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { demoDb } = require("./demo-store");
    return demoDb() as SupabaseClient;
  }
  if (!cached) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "Hiányzó SUPABASE_URL vagy SUPABASE_SERVICE_ROLE_KEY környezeti változó. Lásd: BEKOTES.md 1–2. lépés."
      );
    }
    cached = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
