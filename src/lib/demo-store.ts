/**
 * ═══════════════════════════════════════════════════════════════════
 * DEMÓ MÓD — mock adatbázis kipróbáláshoz
 *
 * Ha a DEMO_MODE=1 környezeti változó be van állítva, az app nem
 * Supabase-hez kapcsolódik, hanem ehhez a fájl-alapú mini-adatbázishoz,
 * előre feltöltött mintaadatokkal. Így a teljes felület kipróbálható
 * Supabase- és Stripe-fiók nélkül.
 *
 * Belépések demó módban:
 *   admin:   admin@demo.hu   / demo1234
 *   partner: partner@demo.hu / demo1234
 *
 * ÉLES KÖRNYEZETBEN A DEMO_MODE-OT SOHA NE ÁLLÍTSD BE.
 * ═══════════════════════════════════════════════════════════════════
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";

const SEED_VERSION = 4;
const DIR = path.join(process.cwd(), ".demo");
const FILE = path.join(DIR, "data.json");

type Row = Record<string, any>;
type Store = any;

const UNIQUES: Record<string, string[]> = {
  affiliates: ["email", "code"],
  admins: ["email"],
  stripe_events: ["id"],
  customers: ["stripe_customer_id"],
  conversions: ["stripe_session_id", "stripe_invoice_id"],
  commissions: ["conversion_id"],
};

const DEFAULTS: Record<string, Row> = {
  affiliates: { status: "pending", bank_account: null },
  conversions: { is_first: true, currency: "huf", refunded_huf: 0, stripe_session_id: null, stripe_invoice_id: null, stripe_payment_intent: null, stripe_customer_id: null },
  commissions: { status: "pending", batch_id: null, note: null },
  payout_batches: { total_huf: 0, note: null },
  clicks: { ip_hash: null, user_agent: null, referer: null },
};

const RELATIONS: Record<string, Record<string, { table: string; localKey: string }>> = {
  commissions: {
    affiliates: { table: "affiliates", localKey: "affiliate_id" },
    conversions: { table: "conversions", localKey: "conversion_id" },
  },
  conversions: {
    affiliates: { table: "affiliates", localKey: "affiliate_id" },
  },
};

function load(): Store {
  if (!fs.existsSync(FILE)) return seed();
  for (let i = 0; i < 5; i++) {
    try {
      const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
      if (data?._meta?.seed_version !== SEED_VERSION) return seed();
      return data;
    } catch {
      // párhuzamos írás közben olvastunk — rövid várakozás, újra
      const until = Date.now() + 25;
      while (Date.now() < until) { /* várakozás */ }
    }
  }
  return seed();
}
function save(store: Store) {
  fs.mkdirSync(DIR, { recursive: true });
  const tmp = FILE + "." + process.pid + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(store, null, 1));
  fs.renameSync(tmp, FILE); // atomikus csere
}

// ── mintaadatok ──────────────────────────────────────────────────────
function seed(): Store {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const iso = (offsetDays: number) => new Date(now - offsetDays * day).toISOString();
  const dateOnly = (offsetDays: number) => new Date(now - offsetDays * day).toISOString().slice(0, 10);
  const hash = bcrypt.hashSync("demo1234", 10);

  const anna = randomUUID(), peter = randomUUID(), lilla = randomUUID(), mark = randomUUID(), dora = randomUUID();
  const store: Store = {
    _meta: { seed_version: SEED_VERSION, note: "DEMÓ ADATOK — törölhető, újraindításkor újragenerálódik" },
    settings: [{ id: 1, commission_rate: 30, hold_days: 30, min_payout_huf: 20000, updated_at: iso(40) }],
    admins: [{ id: randomUUID(), email: "admin@demo.hu", password_hash: hash, created_at: iso(45) }],
    affiliates: [
      { id: anna, email: "partner@demo.hu", password_hash: hash, name: "Kiss Anna", code: "ANNA24",
        status: "active", bank_account: "11711000-12345678-00000000", created_at: iso(44) },
      { id: peter, email: "peter@fitneszblog.hu", password_hash: hash, name: "Nagy Péter", code: "PETERFIT",
        status: "active", bank_account: "", created_at: iso(30) },
      { id: lilla, email: "lilla@egeszsegkonyha.hu", password_hash: hash, name: "Tóth Lilla", code: "LILLA7",
        status: "active", bank_account: "10300002-10600000-49020017", created_at: iso(21) },
      { id: mark, email: "mark@futoklub.hu", password_hash: hash, name: "Szabó Márk", code: "MARKRUN",
        status: "pending", bank_account: "", created_at: iso(2) },
      { id: dora, email: "dora@receptnaplo.hu", password_hash: hash, name: "Horváth Dóra", code: "DORA5",
        status: "active", bank_account: "12010422-01234567-00100008", created_at: iso(52) },
    ],
    clicks: [] as Row[],
    customers: [
      { stripe_customer_id: "cus_demo_A1", affiliate_id: anna, created_at: iso(38) },
      { stripe_customer_id: "cus_demo_A2", affiliate_id: anna, created_at: iso(26) },
      { stripe_customer_id: "cus_demo_A3", affiliate_id: anna, created_at: iso(9) },
      { stripe_customer_id: "cus_demo_P1", affiliate_id: peter, created_at: iso(18) },
      { stripe_customer_id: "cus_demo_L1", affiliate_id: lilla, created_at: iso(6) },
      { stripe_customer_id: "cus_demo_L2", affiliate_id: lilla, created_at: iso(4) },
      { stripe_customer_id: "cus_demo_D1", affiliate_id: dora, created_at: iso(47) },
    ],
    stripe_events: [
      { id: "evt_demo_001", type: "checkout.session.completed", summary: "customer=cus_demo_A1 ref=ANNA24 amount_total=12599000", received_at: iso(38) },
      { id: "evt_demo_002", type: "checkout.session.completed", summary: "customer=cus_demo_A2 ref=ANNA24 amount_total=3899000", received_at: iso(26) },
      { id: "evt_demo_003", type: "invoice.payment_succeeded", summary: "customer=cus_demo_A2 amount_paid=3899000 reason=subscription_cycle", received_at: iso(12) },
      { id: "evt_demo_004", type: "checkout.session.completed", summary: "customer=cus_demo_P1 ref=PETERFIT amount_total=3899000", received_at: iso(18) },
      { id: "evt_demo_005", type: "charge.refunded", summary: "customer=cus_demo_P1", received_at: iso(11) },
      { id: "evt_demo_006", type: "checkout.session.completed", summary: "customer=cus_demo_A3 ref=ANNA24 amount_total=7199000", received_at: iso(9) },
      { id: "evt_demo_007", type: "checkout.session.completed", summary: "customer=cus_demo_L1 ref=LILLA7 amount_total=1499000", received_at: iso(6) },
      { id: "evt_demo_008", type: "checkout.session.completed", summary: "customer=cus_demo_L2 ref=LILLA7 amount_total=3899000", received_at: iso(4) },
      { id: "evt_demo_009", type: "charge.refunded", summary: "customer=cus_demo_L2 amount_refunded=1949500", received_at: iso(3) },
      { id: "evt_demo_010", type: "charge.refunded", summary: "customer=cus_demo_D1 amount_refunded=7199000", received_at: iso(5) },
    ],
    conversions: [] as Row[],
    payout_batches: [] as Row[],
    commissions: [] as Row[],
  };

  // kattintások szórva az elmúlt ~40 napban
  const addClicks = (aff: string, n: number, maxAge: number, ref: string) => {
    for (let i = 0; i < n; i++) {
      store.clicks.push({
        id: store.clicks.length + 1,
        affiliate_id: aff,
        ip_hash: randomUUID().replace(/-/g, "").slice(0, 32),
        user_agent: "Mozilla/5.0 (demo)",
        referer: ref,
        created_at: iso(Math.random() * maxAge),
      });
    }
  };
  addClicks(anna, 212, 42, "https://instagram.com/");
  addClicks(peter, 87, 28, "https://fitneszblog.hu/");
  addClicks(lilla, 34, 14, "https://facebook.com/");

  const conv = (aff: string, cust: string, huf: number, isFirst: boolean, ageDays: number, sess?: string, inv?: string, refunded = 0) => {
    const id = randomUUID();
    store.conversions.push({
      id, affiliate_id: aff, stripe_customer_id: cust,
      stripe_session_id: sess ?? null, stripe_invoice_id: inv ?? null,
      stripe_payment_intent: "pi_" + id.slice(0, 8),
      amount_huf: huf, refunded_huf: refunded, currency: "huf", is_first: isFirst, occurred_at: iso(ageDays),
    });
    return id;
  };
  const comm = (aff: string, convId: string, huf: number, status: string, holdOffset: number, ageDays: number, note?: string | null, batch?: string) => {
    store.commissions.push({
      id: randomUUID(), affiliate_id: aff, conversion_id: convId,
      amount_huf: Math.round(huf * 0.3), rate: 30, status,
      hold_until: dateOnly(-holdOffset), batch_id: batch ?? null,
      note: note ?? null, created_at: iso(ageDays),
    });
  };

  // Anna: kifizetett (korábbi kör), jóváhagyott, esedékes-függő, friss-függő + megújulás
  const batchId = randomUUID();
  store.payout_batches.push({ id: batchId, total_huf: 37797, note: "Kifizetési kör", created_at: iso(8) });
  const cA1 = conv(anna, "cus_demo_A1", 125990, true, 38, "cs_demo_a1");
  comm(anna, cA1, 125990, "paid", 8, 38, null, batchId);
  const cA2 = conv(anna, "cus_demo_A2", 38990, true, 26, "cs_demo_a2");
  comm(anna, cA2, 38990, "approved", -4, 26); // hold lejárt, jóváhagyva
  conv(anna, "cus_demo_A2", 38990, false, 12, undefined, "in_demo_a2r"); // megújulás
  const cA3 = conv(anna, "cus_demo_A3", 71990, true, 9, "cs_demo_a3");
  comm(anna, cA3, 71990, "approved", -1, 9); // hold lejárt, jóváhagyva → kifizethető (Anna: 11697+21597=33294)
  const cA4 = conv(anna, "cus_demo_A1", 38990, true, 32, "cs_demo_a4");
  comm(anna, cA4, 38990, "pending", -2, 32); // hold LEJÁRT (hold_until a múltban) → "esedékes" banner
  const cA5 = conv(anna, "cus_demo_A3", 14990, true, 3, "cs_demo_a5");
  comm(anna, cA5, 14990, "pending", 27, 3); // friss, a tartási idő még tart

  // Péter: jóváhagyott jutalék, de nincs bankszámla + kifizetés utáni refund eset
  const cP1 = conv(peter, "cus_demo_P1", 38990, true, 18, "cs_demo_p1");
  comm(peter, cP1, 38990, "approved", -10, 18);
  const cP2 = conv(peter, "cus_demo_P1", 38990, true, 40, "cs_demo_p2");
  comm(peter, cP2, 38990, "reversed", -15, 40, "Automatikus visszavonás: Stripe visszatérítés");

  // Lilla: küszöb alatti jóváhagyott jutalék + egy részlegesen visszatérített tétel
  const cL1 = conv(lilla, "cus_demo_L1", 14990, true, 6, "cs_demo_l1");
  comm(lilla, cL1, 14990, "approved", -2, 6);
  const cL2 = conv(lilla, "cus_demo_L2", 38990, true, 4, "cs_demo_l2", undefined, 19495);
  store.commissions.push({
    id: randomUUID(), affiliate_id: lilla, conversion_id: cL2,
    amount_huf: Math.round((38990 - 19495) * 0.3), rate: 30, status: "pending",
    hold_until: dateOnly(-26), batch_id: null,
    note: "Részleges visszatérítés: 19495 Ft. A jutalék a megmaradt 19495 Ft-ra lett igazítva.",
    created_at: iso(4),
  });

  // Dóra: volt egy korábbi kifizetési köre, és a visszatérítés AZUTÁN érkezett.
  // A tétel "kifizetve" marad (a pénz tényleg elment), csak megjelölést kap.
  const batchDora = randomUUID();
  store.payout_batches.push({ id: batchDora, total_huf: 21597, note: "Kifizetési kör", created_at: iso(20) });
  const cD1 = conv(dora, "cus_demo_D1", 71990, true, 47, "cs_demo_d1", undefined, 71990);
  comm(dora, cD1, 71990, "paid", 17, 47,
    "Visszatérítés a kifizetés UTÁN, kézi rendezést igényel!", batchDora);
  addClicks(dora, 61, 50, "https://receptnaplo.hu/");

  save(store);
  return store;
}

// ── supabase-szerű lekérdező ────────────────────────────────────────
type Filter = { kind: "eq" | "is" | "in" | "lte"; col: string; val: any };

class Query {
  private op: "select" | "insert" | "update" | "upsert" = "select";
  private filters: Filter[] = [];
  private orderBy: { col: string; asc: boolean } | null = null;
  private limitN: number | null = null;
  private selectStr = "*";
  private countMode = false;
  private headMode = false;
  private singleMode: "single" | "maybe" | null = null;
  private payload: any = null;
  private upsertOpts: any = null;
  private returning = false;

  constructor(private table: string) {}

  select(cols?: string, opts?: { count?: string; head?: boolean }) {
    if (this.op === "insert" || this.op === "upsert") { this.returning = true; if (cols) this.selectStr = cols; return this; }
    this.op = "select";
    if (cols) this.selectStr = cols;
    if (opts?.count) this.countMode = true;
    if (opts?.head) this.headMode = true;
    return this;
  }
  insert(payload: any) { this.op = "insert"; this.payload = payload; return this; }
  update(payload: any) { this.op = "update"; this.payload = payload; return this; }
  upsert(payload: any, opts?: any) { this.op = "upsert"; this.payload = payload; this.upsertOpts = opts; return this; }
  eq(col: string, val: any) { this.filters.push({ kind: "eq", col, val }); return this; }
  is(col: string, val: any) { this.filters.push({ kind: "is", col, val }); return this; }
  in(col: string, val: any[]) { this.filters.push({ kind: "in", col, val }); return this; }
  lte(col: string, val: any) { this.filters.push({ kind: "lte", col, val }); return this; }
  order(col: string, opts?: { ascending?: boolean }) { this.orderBy = { col, asc: opts?.ascending !== false }; return this; }
  limit(n: number) { this.limitN = n; return this; }
  single() { this.singleMode = "single"; return this; }
  maybeSingle() { this.singleMode = "maybe"; return this; }

  then<T1 = any, T2 = never>(onOk?: ((v: any) => T1 | PromiseLike<T1>) | null, onErr?: ((e: any) => T2 | PromiseLike<T2>) | null) {
    return Promise.resolve(this.exec()).then(onOk as any, onErr as any);
  }

  private match(row: Row): boolean {
    return this.filters.every((f) => {
      const v = row[f.col];
      if (f.kind === "eq") return v === f.val;
      if (f.kind === "is") return v === f.val || (f.val === null && v == null);
      if (f.kind === "in") return f.val.includes(v);
      if (f.kind === "lte") return v != null && String(v) <= String(f.val);
      return true;
    });
  }

  private attachRelations(row: Row): Row {
    const rels = RELATIONS[this.table];
    if (!rels || !this.selectStr.includes("(")) return row;
    const out = { ...row };
    const re = /(\w+)\(([^)]*)\)/g;
    let m: RegExpExecArray | null;
    const store = load();
    while ((m = re.exec(this.selectStr))) {
      const relName = m[1];
      const rel = rels[relName];
      if (!rel) continue;
      const target = ((store[rel.table] ?? []) as Row[]).find((r: Row) => r.id === row[rel.localKey]) ?? null;
      out[relName] = target ? { ...target } : null;
    }
    return out;
  }

  private exec() {
    const store = load();
    const rows: Row[] = store[this.table] ?? (store[this.table] = []);

    if (this.op === "select") {
      let result = rows.filter((r: Row) => this.match(r));
      if (this.orderBy) {
        const { col, asc } = this.orderBy;
        result = [...result].sort((a, b) => (String(a[col]) < String(b[col]) ? -1 : 1) * (asc ? 1 : -1));
      }
      if (this.limitN != null) result = result.slice(0, this.limitN);
      if (this.countMode && this.headMode) return { data: null, error: null, count: result.length };
      const mapped = result.map((r: Row) => this.attachRelations({ ...r }));
      if (this.singleMode) {
        const row = mapped[0] ?? null;
        if (this.singleMode === "single" && !row) return { data: null, error: { message: "0 sor" } };
        return { data: row, error: null };
      }
      return { data: mapped, error: null, count: mapped.length };
    }

    if (this.op === "insert" || this.op === "upsert") {
      const items = Array.isArray(this.payload) ? this.payload : [this.payload];
      const inserted: Row[] = [];
      for (const item of items) {
        for (const ucol of UNIQUES[this.table] ?? []) {
          if (item[ucol] != null && rows.some((r: Row) => r[ucol] === item[ucol])) {
            if (this.op === "upsert" && this.upsertOpts?.ignoreDuplicates) return { data: null, error: null };
            return { data: null, error: { message: `duplicate key value violates unique constraint "${this.table}_${ucol}_key"` } };
          }
        }
        const row: Row = { id: randomUUID(), created_at: new Date().toISOString(), ...(DEFAULTS[this.table] ?? {}), ...item };
        if (this.table === "clicks") row.id = rows.length + 1;
        rows.push(row);
        inserted.push(row);
      }
      save(store);
      if (this.returning) {
        const data = this.singleMode ? inserted[0] ?? null : inserted;
        return { data, error: null };
      }
      return { data: null, error: null };
    }

    if (this.op === "update") {
      let n = 0;
      for (const r of rows) {
        if (this.match(r)) { Object.assign(r, this.payload); n++; }
      }
      save(store);
      return { data: null, error: null, count: n };
    }

    return { data: null, error: { message: "ismeretlen művelet" } };
  }
}

export function demoDb(): any {
  return { from: (table: string) => new Query(table) };
}
