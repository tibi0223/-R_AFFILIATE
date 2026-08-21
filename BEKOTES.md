# ÉR AFFILIATE: beüzemelési útmutató a tulajdonosnak

Ez a csomag egy **teljes, kész affiliate (partnerprogram) rendszer** az Étkezési
Rendszerhez. Mindent a saját fiókjaidban futtatsz, a készítőnek semmilyen
hozzáférése nem marad, és a rendszer működése nem függ tőle.

**Ami kell hozzá:** egy Supabase fiók (ingyenes), egy Vercel fiók (ingyenes),
és a meglévő Stripe fiókod. **Ami NEM kell:** Stripe API kulcs. A rendszer
csak értesítéseket kap a Stripe-tól, a Stripe fiókodhoz nem fér hozzá, pénzt
mozgatni nem tud.

Teljes beüzemelési idő: **kb. 30–40 perc.**

> **Előbb kipróbálnád?** A `DEMO.md` leírása alapján a teljes felület elindítható
> a saját gépeden, mintaadatokkal, mindenféle fiók nélkül, két perc alatt.

> **Mielőtt élesben elindulsz, olvasd el a `DONTESEK.md` fájlt.** Húsz olyan kérdést
> gyűjt össze, ahol a rendszernek választania kellett, és a választás nem magától
> értetődő: kinek jár a jutalék két partner között, meddig érvényes egy kattintás,
> bruttóból vagy nettóból számoljon. Ezeket neked kell eldöntened, és beleírni a
> partneri feltételekbe. A rendszer részletes működését a `MUKODES.md` írja le.

---

## Mit tud a rendszer?

- **Partner (affiliate) felület**: regisztráció, belépés, egyedi link,
  kattintás- és jutalék-statisztika, bankszámlaszám megadása, jelszócsere.
- **Admin felület** (a tiéd): partnerek jóváhagyása és felfüggesztése,
  partneri jelszó beállítása, jutalékok kezelése, kifizetési kör lezárása,
  CSV utalási lista, beállítások.
- **Automatikus mérés**: a Stripe minden fizetésről értesíti a rendszert:
  első vásárlás (jutalék keletkezik), megújulás (statisztika), visszatérítés
  (teljesnél a jutalék visszavonása, részlegesnél arányos csökkentése).
- **Alapbeállítások:** 30% jutalék a bruttó összegből, 30 nap tartási idő,
  20 000 Ft kifizetési küszöb. Mind átírható az admin Beállítások oldalán.
- A tényleges utalást te végzed banki felületen, a rendszer által készített
  utalási lista (CSV) alapján.

### Milyen adatot kér a partnertől?

Szándékosan keveset: **név, e-mail cím, jelszó**, és a kifizetéshez
**bankszámlaszám**. Céges adatot (cégnév, adószám, székhely) a rendszer nem
kér és nem tárol. A kifizetés adózási kezelése (számla, kifizetői teher,
magánszemély vs. vállalkozó) rád tartozik, ezt érdemes a könyvelőddel
egyeztetni, mielőtt az első kört elindítod.

---

## 1. lépés · Adatbázis (Supabase) · ~5 perc

1. Regisztrálj / lépj be: https://supabase.com
2. **New project** → név: pl. `er-affiliate` → régió: `Central EU (Frankfurt)`
   → adj meg egy erős adatbázis-jelszót (jegyezd fel).
3. Bal menü → **SQL Editor** → **New query** → másold be a csomagban lévő
   `supabase/schema.sql` fájl TELJES tartalmát → **Run**.
   Zöld „Success” üzenetet kell látnod.
4. Bal menü → **Project Settings → API**, és másold ki:
   - **Project URL** (pl. `https://abcdefgh.supabase.co`)
   - **service_role** kulcs (a „Project API keys” alatt, a hosszabb, titkos kulcs)

⚠️ A service_role kulcs teljes hozzáférést ad az adatbázishoz. Csak a Vercel
környezeti változói közé kerülhet, soha sehova máshova.

## 2. lépés · Az app feltöltése (Vercel) · ~10 perc

1. Regisztrálj / lépj be: https://vercel.com (legegyszerűbb GitHub fiókkal).
2. Tedd fel a csomagot egy **privát** GitHub repóba
   (github.com → New repository → Private → a fájlok feltöltése), majd
   Vercel → **Add New → Project** → válaszd ki a repót.
   *(Alternatíva GitHub nélkül: telepítsd a Vercel CLI-t (`npm i -g vercel`),
   majd a csomag mappájában futtasd: `vercel --prod`.)*
3. A deploy beállításánál nyisd le az **Environment Variables** részt, és vedd
   fel ezeket (magyarázat a csomag `.env.example` fájljában):

   | Név | Érték |
   |---|---|
   | `SUPABASE_URL` | az 1. lépésben kimásolt Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | az 1. lépésben kimásolt service_role kulcs |
   | `SESSION_SECRET` | egy hosszú véletlen szöveg (pl. innen: https://generate-secret.vercel.app/32) |
   | `ER_REDIRECT_URL` | `https://etkezesirendszer.hu/bemutato` |
   | `COOKIE_DOMAIN` | `.etkezesirendszer.hu` *(csak ha a 3. lépésben aldomaint állítasz be)* |

   A `STRIPE_WEBHOOK_SECRET`-et majd az 5. lépésben adod hozzá.
   A `DEMO_MODE` élesben SOHA ne legyen beállítva.
4. **Deploy** → a végén kapsz egy címet, pl. `er-affiliate.vercel.app`.

## 3. lépés · Saját cím (ajánlott) · ~5 perc

1. Vercel → a projekt → **Settings → Domains** → add hozzá:
   `partner.etkezesirendszer.hu`
2. A domain szolgáltatódnál vegyél fel egy CNAME rekordot:
   `partner` → `cname.vercel-dns.com`
3. Ha ez megvan, állítsd be a `COOKIE_DOMAIN=.etkezesirendszer.hu` környezeti
   változót is (Settings → Environment Variables), majd **Redeploy**.
   Ettől a partneri kattintás cookie-ja a fő oldaladon is látszik, így pontosabb a mérés.

*(E lépés nélkül is működik minden, csak a linkek `...vercel.app` címűek lesznek.)*

## 4. lépés · Admin fiók · ~1 perc

Nyisd meg: `https://partner.etkezesirendszer.hu/admin/setup`
(vagy a vercel.app címen ugyanez). Add meg az e-mail címed és egy erős jelszót.
Ez az oldal csak az első admin létrehozásáig él, utána automatikusan megszűnik.

## 5. lépés · Stripe webhook · ~3 perc

1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**
2. **Endpoint URL:** `https://partner.etkezesirendszer.hu/api/stripe`
3. **Select events**, pontosan ez a három:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `charge.refunded`
4. **Add endpoint**, majd az oldalon másold ki a **Signing secret**-et (`whsec_...`).
5. Vercel → Settings → Environment Variables → új változó:
   `STRIPE_WEBHOOK_SECRET` = a kimásolt érték → **Redeploy**.

## 6. lépés · Két apró módosítás az ÉR oldalban · ~10 perc

A csomag `er-oldal-bekotes/` mappájában minden le van írva (`OLVASSEL.md`):

1. A `?ref=` paraméter mentése cookie-ba (`1-nextjs-middleware.ts`, vagy nem
   Next.js oldalnál a `3-univerzalis-snippet.html`).
2. Egyetlen új sor a Stripe Checkout Session létrehozásánál
   (`2-checkout-egy-sor.ts`): `client_reference_id: <az er_ref cookie értéke>`.

Ha Stripe **Payment Linkeket** használsz, elég a 3-as snippet a `<head>`-be,
ilyenkor szerveroldali módosítás egyáltalán nem kell.

## 7. lépés · Teszt · ~5 perc

1. Az admin **Partnerek** oldalán hagyd jóvá a saját teszt-partneredet
   (regisztrálj egyet a `/regisztracio` oldalon).
2. Nyisd meg a partner linkjét (`/r/KÓD`). Az admin áttekintőben megjelenik
   a kattintás, és az ÉR oldalára érkezel `?ref=KÓD`-dal.
3. Végezz egy próbavásárlást (legkisebb csomag), a partneri linken indulva.
4. Az admin **Események** oldalán perceken belül látod a Stripe eseményt,
   a **Jutalékok** oldalon pedig a kiszámolt jutalékot „Függőben” állapotban.
5. A próbavásárlást a Stripe-ban visszatérítheted. Figyeld meg, hogy a
   jutalék automatikusan „Visszavonva” lesz. Ha csak részben térítesz vissza,
   a jutalék a megmaradt összegre igazodik.

---

## Napi használat

- **Új partner regisztrált** → Partnerek oldal → Jóváhagy. (E-mailt a rendszer
  nem küld, érdemes hetente egyszer ránézni.)
- **Partner elfelejtette a jelszavát** → Partnerek oldal → az adott sornál
  „Új jelszó” → beírod az újat → elküldöd neki. (Önkiszolgáló jelszó-emlékeztető
  nincs, mert a rendszer nem küld e-mailt.)
- **Jutalékok** → a tartási idő lejárta után „Összes esedékes jóváhagyása”.
- **Havonta egyszer** → Kifizetés oldal → „Kör lezárása” → CSV letöltése →
  utalás a bankodból → kész. A rendszer mindent megjelöl kifizetettként.
- **Ha valami nem stimmel** → Események oldal: megérkezett-e egyáltalán a
  Stripe esemény. Ha ott nincs semmi, a webhook beállítást ellenőrizd (5. lépés).

## Fontos tudnivalók

- A jutalék **csak sikeres fizetés után** keletkezik; a regisztráció önmagában nem ér pénzt.
- A partner **nem előfizetője** az ÉR-nek, bárki lehet partner, akit jóváhagysz.
- **Felfüggesztett partner** nem kap új jutalékot, a meglévői nem hagyhatók jóvá,
  és nem kerül kifizetési körbe sem. A felfüggesztés visszavonható.
- A rendszer **személyes vásárlói adatot nem tárol**: a Stripe-tól kapott
  ügyfél-azonosítón és összegen kívül semmit. Vásárlói név/e-mail nem kerül bele.
- A partnerről is csak név, e-mail és bankszámlaszám kerül a rendszerbe.
- A belépés és a regisztráció **sebességkorlátozott** (IP-nként). Szerver nélküli
  környezetben ez példányonként él, tehát lassít, de nem tesz feleslegessé egy
  erős admin jelszót.
- A partneri ÁSZF-et és adatkezelési tájékoztatót jogásszal érdemes átnézetni,
  ez a csomag ezt nem tartalmazza.
