-- ═══════════════════════════════════════════════════════════════════
-- ÉR AFFILIATE — adatbázis séma
-- Használat: Supabase → SQL Editor → illeszd be az egészet → Run
-- ═══════════════════════════════════════════════════════════════════

-- Globális beállítások (egyetlen sor)
create table settings (
  id int primary key default 1 check (id = 1),
  commission_rate numeric not null default 30,   -- % a bruttó befizetésből
  hold_days int not null default 30,             -- tartási idő napokban
  min_payout_huf int not null default 20000,     -- kifizetési küszöb, Ft
  updated_at timestamptz not null default now()
);
insert into settings (id) values (1);

-- Admin fiókok (az elsőt a /admin/setup oldal hozza létre)
create table admins (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

-- Partnerek (affiliate-ek) — NEM ÉR-felhasználók, saját fiókjuk van itt.
-- Szándékosan minimális adat: név, e-mail, és a kifizetéshez a bankszámlaszám.
-- Céges adatot (cégnév, adószám, székhely) a rendszer NEM kér és nem tárol.
create table affiliates (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  name text not null,
  code text unique not null,                     -- a link kódja: /r/KOD
  status text not null default 'pending',        -- pending | active | suspended
  bank_account text,                             -- ide megy az utalás
  created_at timestamptz not null default now()
);

-- Kattintások a partneri linkeken
create table clicks (
  id bigint generated always as identity primary key,
  affiliate_id uuid not null references affiliates(id),
  ip_hash text,
  user_agent text,
  referer text,
  created_at timestamptz not null default now()
);
create index clicks_aff_idx on clicks (affiliate_id, created_at desc);

-- Stripe ügyfél → partner megfeleltetés (megújulások követéséhez)
create table customers (
  stripe_customer_id text primary key,
  affiliate_id uuid not null references affiliates(id),
  created_at timestamptz not null default now()
);

-- Minden beérkezett Stripe esemény (idempotencia + hibakeresés)
create table stripe_events (
  id text primary key,
  type text not null,
  summary text,
  received_at timestamptz not null default now()
);

-- Konverziók (fizetések)
create table conversions (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references affiliates(id),
  stripe_customer_id text,
  stripe_session_id text unique,
  stripe_invoice_id text unique,
  stripe_payment_intent text,
  amount_huf int not null,                       -- bruttó, forintban
  refunded_huf int not null default 0,           -- ebből visszatérítve
  currency text not null default 'huf',
  is_first boolean not null default true,        -- első fizetés vagy megújulás
  occurred_at timestamptz not null default now()
);
create index conversions_aff_idx on conversions (affiliate_id, occurred_at desc);
create index conversions_pi_idx on conversions (stripe_payment_intent);
create index conversions_cust_idx on conversions (stripe_customer_id, is_first);

-- Kifizetési körök
create table payout_batches (
  id uuid primary key default gen_random_uuid(),
  total_huf int not null default 0,
  note text,
  created_at timestamptz not null default now()
);

-- Jutalékok
create table commissions (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references affiliates(id),
  conversion_id uuid unique references conversions(id),
  amount_huf int not null,
  rate numeric not null,
  status text not null default 'pending',        -- pending | approved | paid | reversed
  hold_until date not null,
  batch_id uuid references payout_batches(id),
  note text,
  created_at timestamptz not null default now()
);
create index commissions_aff_idx on commissions (affiliate_id, status);
create index commissions_status_idx on commissions (status, hold_until);

-- ── Biztonság ──────────────────────────────────────────────────────
-- Minden hozzáférés a szerveren, a service_role kulccsal történik.
-- Az RLS bekapcsolva, szabályok nélkül: az anon/publikus kulcs semmit nem lát.
alter table settings enable row level security;
alter table admins enable row level security;
alter table affiliates enable row level security;
alter table clicks enable row level security;
alter table customers enable row level security;
alter table stripe_events enable row level security;
alter table conversions enable row level security;
alter table payout_batches enable row level security;
alter table commissions enable row level security;
