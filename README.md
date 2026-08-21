# ÉR Affiliate rendszer

Teljes partnerprogram-rendszer az Étkezési Rendszerhez (etkezesirendszer.hu):
partneri linkek, kattintásmérés, Stripe-alapú konverziókövetés, jutalék-
nyilvántartás, admin felület, kifizetési CSV export.

**Ki akarod próbálni? → [DEMO.md](DEMO.md)** · 2 perc, fiókok nélkül, mintaadatokkal.
**Beüzemelés élesben: → [BEKOTES.md](BEKOTES.md)** · lépésről lépésre, ~30 perc.
**Hogyan működik pontosan? → [MUKODES.md](MUKODES.md)** · teljes működési leírás.
**Mit kell eldöntened? → [DONTESEK.md](DONTESEK.md)** · 20 kérdés, amiben te döntesz.

- Stack: Next.js 14 + Supabase (Postgres) + Stripe webhook. Vercelen fut.
- Az ÉR oldalba mindössze ~15 sort kell beépíteni: `er-oldal-bekotes/OLVASSEL.md`.
- A rendszernek nincs Stripe API kulcsa, csak webhook-értesítéseket fogad.
- A partnerről csak név, e-mail és bankszámlaszám kerül a rendszerbe. Céges
  adatot (cégnév, adószám, székhely) nem kér és nem tárol.

## Fejlesztés

```bash
npm install
cp .env.example .env.local   # töltsd ki
npm run dev
```

## Szerkezet

- `src/app/api/stripe`: Stripe webhook (konverzió, megújulás, teljes és részleges refund)
- `src/app/r/[code]`: partneri link redirect + kattintásrögzítés
- `src/app/partner`: partneri felület · `src/app/admin`: admin felület
- `src/app/actions.ts`: minden űrlap-művelet · `supabase/schema.sql`: adatbázis
- `src/lib/demo-store.ts`: a `DEMO_MODE=1` mögötti fájl-alapú mintaadatbázis
- `src/lib/ratelimit.ts`: belépés/regisztráció sebességkorlát
