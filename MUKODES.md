# ÉR Affiliate: teljes működési leírás

Ez a dokumentum azt írja le, **mit csinál a rendszer, mikor és miért**. Nem beüzemelési
útmutató (az a `BEKOTES.md`), és nem is a nyitott kérdések listája (az a `DONTESEK.md`).
Ez a referencia: ha valami furcsát látsz a felületen, vagy egy fejlesztőnek át kell adni
a rendszert, itt találod meg a választ.

**Tartalom**
1. [Mit old meg a rendszer](#1-mit-old-meg-a-rendszer)
2. [A pénz útja, elejétől a végéig](#2-a-pénz-útja-elejétől-a-végéig)
3. [Szereplők és jogosultságok](#3-szereplők-és-jogosultságok)
4. [Adatmodell](#4-adatmodell)
5. [Állapotok és átmenetek](#5-állapotok-és-átmenetek)
6. [A Stripe-értesítések feldolgozása](#6-a-stripe-értesítések-feldolgozása)
7. [A jutalék kiszámítása](#7-a-jutalék-kiszámítása)
8. [Kifizetési kör és az utalási lista](#8-kifizetési-kör-és-az-utalási-lista)
9. [Az oldalak és végpontok listája](#9-az-oldalak-és-végpontok-listája)
10. [Biztonság](#10-biztonság)
11. [Adatvédelem: mit tárol és mit nem](#11-adatvédelem-mit-tárol-és-mit-nem)
12. [Üzemeltetés és hibakeresés](#12-üzemeltetés-és-hibakeresés)
13. [Ismert korlátok](#13-ismert-korlátok)

---

## 1. Mit old meg a rendszer

Partnerek (bloggerek, influenszerek, ismerősök) egyedi linket kapnak. Aki azon a linken
keresztül lesz ÉR-előfizető, az után a partner jutalékot kap. A rendszer méri a
kattintásokat, a Stripe-tól megtudja, mikor történt valódi fizetés, kiszámolja a jutalékot,
nyilvántartja az állapotát, és a hónap végén készít egy utalási listát.

**Amit a rendszer nem csinál:** nem utal pénzt, nem küld e-mailt, és nem fér hozzá a
Stripe fiókodhoz. Csak értesítéseket fogad a Stripe-tól, és azokat könyveli.

Ez fontos: a rendszer **könyvelő, nem pénztáros.**

---

## 2. A pénz útja, elejétől a végéig

```
1. A partner megosztja:      https://partner.etkezesirendszer.hu/r/ANNA24
                                          │
2. Valaki rákattint  ────────────────────►│  a rendszer rögzíti a kattintást,
                                          │  beállítja az "er_ref" sütit (60 nap),
                                          │  és átirányít:
                                          ▼
3.                            etkezesirendszer.hu/bemutato?ref=ANNA24
                                          │
                                          │  az ÉR oldalba beépített 15 sor
                                          │  elmenti a kódot a saját sütijébe
                                          ▼
4. A látogató (akár napokkal később) előfizet
                                          │
                                          │  a checkout hívás átadja a kódot
                                          │  client_reference_id néven
                                          ▼
5. Stripe ──── checkout.session.completed ────► /api/stripe
                                          │
                                          │  a rendszer: megkeresi a partnert,
                                          │  rögzíti a konverziót és a jutalékot
                                          ▼
6. Jutalék "Függőben" állapotban, tartási idő alatt (alap: 30 nap)
                                          │
                                          │  admin: "Összes esedékes jóváhagyása"
                                          ▼
7. Jutalék "Jóváhagyva", kifizetésre vár
                                          │
                                          │  admin: "Kör lezárása"
                                          ▼
8. Jutalék "Kifizetve" + CSV utalási lista ──► a te bankod felülete ──► a partner számlája
```

Bármelyik ponton érkezhet visszatérítés a Stripe-tól, ami a 6. és 7. lépésben lévő
jutalékot csökkenti vagy visszavonja. A 8. után már csak megjelölést kap
(lásd: [7. fejezet](#7-a-jutalék-kiszámítása)).

---

## 3. Szereplők és jogosultságok

| Szereplő | Hol lép be | Mit lát és mit tud |
|---|---|---|
| **Látogató** | nincs belépés | nyitóoldal, regisztráció, partneri linkek |
| **Partner** | `/belepes` | csak a **saját** adatait: link, kattintásszám, saját jutalékok, bankszámlaszám, jelszócsere |
| **Üzemeltető (admin)** | `/admin/belepes` | mindent: partnerek, összes jutalék, kifizetés, Stripe események, beállítások |

A partner **soha** nem lát más partnert, más jutalékát, és nem éri el az admin oldalakat.
Ezt két rétegben biztosítjuk: a middleware kizárja a rossz szerepkört még az oldal
betöltése előtt, az oldalak és műveletek pedig a saját azonosítójukra szűrnek.

Az **első admin fiókot** a `/admin/setup` oldal hozza létre. Ez az oldal csak addig
érhető el, amíg egyáltalán nincs admin: utána magától eltűnik, és többé nem használható.

---

## 4. Adatmodell

Kilenc tábla, mind a te Supabase projektedben. A séma: `supabase/schema.sql`.

| Tábla | Mit tárol | Kulcs tudnivaló |
|---|---|---|
| `settings` | jutalékkulcs, tartási idő, kifizetési küszöb | pontosan egy sor, `id = 1` |
| `admins` | az üzemeltetői fiókok | jelszó bcrypt hashelve |
| `affiliates` | a partnerek | név, e-mail, jelszó-hash, kód, állapot, bankszámlaszám. **Céges adat nincs.** |
| `clicks` | kattintások a partneri linkeken | IP helyett visszafejthetetlen lenyomat |
| `customers` | Stripe vevő → partner megfeleltetés | ez köti a megújulásokat a partnerhez |
| `stripe_events` | minden beérkezett Stripe esemény | az `id` elsődleges kulcs, ez adja az ismétlés elleni védelmet |
| `conversions` | a fizetések | bruttó összeg, visszatérített összeg, első vagy megújulás |
| `commissions` | a jutalékok | összeg, kulcs, állapot, felszabadulás dátuma, kifizetési kör |
| `payout_batches` | a lezárt kifizetési körök | összeg, időpont |

Egy jutalék **pontosan egy** konverzióhoz tartozik (`conversion_id` egyedi). Ez zárja ki,
hogy ugyanabból a vásárlásból kétszer keletkezzen pénz.

Minden táblán be van kapcsolva a Row Level Security, szabályok nélkül. Vagyis a nyilvános
Supabase kulccsal **semmit nem lehet olvasni**. Minden hozzáférés a szerveren történik,
a titkos `service_role` kulccsal, ami soha nem kerül böngészőbe.

---

## 5. Állapotok és átmenetek

### Partner állapota

```
   regisztrál
       │
       ▼
  ┌──────────┐  admin: Jóváhagy   ┌────────┐  admin: Felfüggeszt  ┌──────────────┐
  │ pending  │ ─────────────────► │ active │ ───────────────────► │  suspended   │
  │ vár      │                    │ aktív  │ ◄─────────────────── │ felfüggesztve│
  └──────────┘                    └────────┘   admin: Feloldás    └──────────────┘
                                                (pending állapotba)
```

- **pending:** be tud lépni, de a linkje **nem működik** és jutalék sem keletkezik.
  A felületén ezt üzenet is jelzi.
- **active:** minden megy.
- **suspended:** nem tud belépni, a linkje nem működik, új jutalék nem keletkezik,
  a **meglévő jutalékai nem hagyhatók jóvá és nem kerülnek kifizetési körbe.**

### Jutalék állapota

```
              Stripe: első fizetés
                      │
                      ▼
               ┌─────────────┐
               │  Függőben   │  a tartási idő alatt
               │  (pending)  │
               └─────────────┘
                 │         │
   admin jóváhagy│         │ Stripe: teljes visszatérítés
   (a tartás után)│        │ vagy admin: Visszavon
                 ▼         ▼
          ┌────────────┐  ┌─────────────┐
          │ Jóváhagyva │  │ Visszavonva │  végállapot
          │ (approved) │  │ (reversed)  │
          └────────────┘  └─────────────┘
                 │              ▲
   admin: kör    │              │ Stripe: teljes visszatérítés
   lezárása      │              │ vagy admin: Visszavon
                 ▼              │
          ┌────────────┐        │
          │ Kifizetve  │────────┘ NEM lép ide vissza:
          │  (paid)    │          kifizetés után a visszatérítés
          └────────────┘          csak megjegyzést tesz rá
```

**Részleges visszatérítés** nem állapotváltás: a jutalék marad ott, ahol van,
csak az **összege csökken**, és kap egy magyarázó megjegyzést.

---

## 6. A Stripe-értesítések feldolgozása

A Stripe három eseményt küld a `/api/stripe` címre. Minden beérkező kérésnél
**először az aláírást ellenőrizzük** a webhook titokkal. Aláírás nélkül vagy hibás
aláírással a kérés 400-as hibával elutasításra kerül, feldolgozás nélkül.

### Ismétlés elleni védelem

A feldolgozás előtt beírjuk az esemény azonosítóját a `stripe_events` táblába.
Ha az azonosító már ott van, a kérés azonnal befejeződik. Ezért van az, hogy
**ugyanaz az esemény pontosan egyszer fut le**, akkor is, ha a Stripe újraküldi
(hálózati hiba, időtúllépés esetén ez rendszeresen előfordul).

### `checkout.session.completed`: első vásárlás

1. Kikeressük a partnert a `client_reference_id` alapján. Ha nincs ilyen kód,
   vagy a partner nem aktív: **nem történik semmi**, ez egy sima, nem partneri vásárlás.
2. Feljegyezzük a Stripe vevő és a partner összetartozását (a későbbi megújulásokhoz).
3. Ha a fizetett összeg nulla (ingyenes próbaidőszak indul), itt megállunk.
   A jutalék majd az első **valódi terhelésnél** keletkezik.
4. Létrehozzuk a konverziót és a jutalékot.

### `invoice.payment_succeeded`: megújulás vagy próbaidő utáni első terhelés

1. Az előfizetés **legelső** számláját kihagyjuk, mert azt már a checkout esemény lefedte.
2. Megkeressük, melyik partnerhez tartozik a vevő. Ha egyikhez sem: nem történik semmi.
3. Ha ennek a vevőnek **még nem volt** jutalékos fizetése (tehát próbaidővel indult),
   akkor ez az első valódi terhelés: **jutalék keletkezik.**
4. Egyébként megújulás: rögzítjük a statisztikába, **jutalék nélkül.**

### `charge.refunded`: visszatérítés

Ez az esemény **részleges** visszatérítésnél is megérkezik, és ugyanarra a terhelésre
többször is jöhet. Ezért mindig a Stripe-tól kapott **halmozott visszatérített összeg**
a mérvadó, nem a különbözet.

1. Megkeressük az érintett konverziót (először a fizetési azonosító alapján,
   ha az nincs, a vevő legutóbbi első vásárlása alapján).
2. Feljegyezzük a konverzión, mennyi ment vissza.
3. A jutalékot [a 7. fejezet](#7-a-jutalék-kiszámítása) szabályai szerint igazítjuk.

### Ha a feldolgozás közben hiba történik

Az esemény sora már bent van, tehát az újraküldés az ismétlésvédelem miatt úgysem futna le.
Ezért a rendszer a hibát **beleírja az esemény összefoglalójába**, és az azonnal látszik
az admin **Események** oldalán `FELDOLGOZÁSI HIBA:` kezdettel. Nem tűnik el csendben.

---

## 7. A jutalék kiszámítása

**Az alapképlet:**

```
jutalék = kerekít( bruttó fizetett összeg × jutalékkulcs / 100 )
```

- A **bruttó** a Stripe-tól kapott ténylegesen fizetett összeg, ÁFÁ-val, kedvezmény után.
- A **jutalékkulcs** az az érték, ami a vásárlás pillanatában a Beállításokban áll (alap: 30%).
  Ez a szám bele van írva a jutalék sorába, tehát **a kulcs későbbi módosítása nem
  változtatja meg a már létrejött jutalékokat.**
- A **felszabadulás dátuma** = a vásárlás napja + tartási idő (alap: 30 nap).

**Példa.** 38 990 Ft-os csomag, 30% kulcs: `38990 × 0,30 = 11 697 Ft`, felszabadul 30 nap múlva.

### Visszatérítés esetén

| Eset | A jutalék állapota | Mi történik |
|---|---|---|
| Teljes visszatérítés, a jutalék még Függőben vagy Jóváhagyva | **Visszavonva** | az egész jutalék elesik |
| **Részleges** visszatérítés, a jutalék még Függőben vagy Jóváhagyva | marad, ahol volt | az összeg a **megmaradt** részre számolódik újra |
| Bármilyen visszatérítés, a jutalék már **Kifizetve** | marad Kifizetve | csak **megjegyzést** kap, hogy kézi rendezést igényel, és az admin Áttekintésen figyelmeztetés jelenik meg |
| Részleges visszatérítés, ami a teljes összeget eléri | **Visszavonva** | ugyanaz, mint a teljes |

**Példa részleges visszatérítésre.** 38 990 Ft-os vásárlásból 10 000 Ft megy vissza.
A megmaradt összeg 28 990 Ft, ennek a 30%-a **8 697 Ft**. A jutalék erre módosul, és
odakerül a magyarázat, hogy miért.

---

## 8. Kifizetési kör és az utalási lista

A **Kifizetés** oldal a jóváhagyott, még ki nem fizetett jutalékokat mutatja
**partnerenként összesítve**. Egy partner akkor kerül a körbe, ha mind a három igaz:

1. az összege **eléri a küszöböt** (alap: 20 000 Ft),
2. **megadta a bankszámlaszámát**,
3. **nincs felfüggesztve**.

Aki kimarad, azt a táblázat megmutatja, és odaírja, hogy miért (`küszöb alatt`,
`nincs bankszámla`, `felfüggesztve`). Az összege nem vész el: átgördül a következő körre.

A **Kör lezárása** gomb egyben:
- létrehoz egy kifizetési kört,
- a beletartozó tételeket **Kifizetve** állapotba teszi,
- elkészíti az utalási listát.

A CSV Excel-barát (BOM, pontosvessző elválasztó), és a következő oszlopokat tartalmazza:

```
Partner neve ; Bankszámlaszám ; E-mail ; Tételek száma ; Utalandó összeg (Ft) ; Közlemény
```

A **Közlemény** oszlop egy `ER-AFF-XXXXXXXX` formátumú azonosító, ami a kifizetési körre
utal. Ezt írd az utalás közleményébe, így később bármelyik utalás visszakereshető.

A CSV bármikor újra letölthető a Korábbi körök táblázatból.

> A tényleges utalást **te végzed** a bankod felületén. A rendszer ehhez csak a listát adja.

---

## 9. Az oldalak és végpontok listája

### Nyilvános

| Cím | Mit csinál |
|---|---|
| `/` | nyitóoldal a partnereknek |
| `/regisztracio` | partneri regisztráció |
| `/belepes` | partneri belépés |
| `/r/KÓD` | **a partneri link.** Rögzíti a kattintást, sütit tesz, átirányít az ÉR oldalára |
| `/api/stripe` | a Stripe webhook fogadója (csak érvényes aláírással) |

### Partneri (belépés után)

| Cím | Mit csinál |
|---|---|
| `/partner` | áttekintés: egyedi link, kattintásszám, saját jutalékok |
| `/partner/adatok` | bankszámlaszám megadása, jelszócsere |

### Üzemeltetői (admin belépés után)

| Cím | Mit csinál |
|---|---|
| `/admin/setup` | az első admin fiók létrehozása (utána megszűnik) |
| `/admin/belepes` | üzemeltetői belépés |
| `/admin` | áttekintés, figyelmeztetések, összesítők |
| `/admin/partnerek` | jóváhagyás, felfüggesztés, partneri jelszó beállítása |
| `/admin/jutalekok` | jutalékok listája, jóváhagyás, kézi visszavonás |
| `/admin/kifizetes` | esedékes kifizetések, kör lezárása, korábbi körök |
| `/admin/kifizetes/AZONOSÍTÓ` | az adott kör CSV utalási listája |
| `/admin/esemenyek` | a beérkezett Stripe események nyers listája |
| `/admin/beallitasok` | jutalékkulcs, tartási idő, küszöb, admin jelszó |

---

## 10. Biztonság

**Jelszavak.** Bcrypt hashelve tárolódnak. Az eredeti jelszót senki nem tudja kiolvasni,
sem te, sem a rendszer.

**Munkamenet.** Aláírt token egy `httpOnly` sütiben, 7 napig érvényes. A böngészőben
futó kód nem fér hozzá. A token magában hordozza, hogy admin vagy partner, és ezt
minden oldalbetöltésnél ellenőrizzük.

**Szerepkör-szétválasztás.** A middleware kizárja a rossz szerepkört, mielőtt bármelyik
védett oldal betöltődne. Ezen felül minden oldal és művelet külön is ellenőrzi.

**Stripe.** A rendszernek **nincs Stripe API kulcsa.** Csak a beérkező értesítések
aláírását ellenőrzi. Nem tud lekérdezni, fizetni, visszatéríteni. Ha valaki megszerezné
a rendszer teljes hozzáférését, a Stripe fiókodhoz akkor sem jutna hozzá.

**Adatbázis.** Row Level Security minden táblán, szabályok nélkül: a nyilvános kulccsal
semmi nem olvasható. A titkos kulcs csak a szerveren, a Vercel környezeti változói között él.

**Sebességkorlát.** Belépés: 10 próbálkozás 15 percenként. Regisztráció: 5 óránként, gépenként.
*Korlát:* szerver nélküli környezetben (Vercel) több példány is futhat, ezért a számláló
példányonként külön él. Ez lassítja a próbálkozást, de nem tesz feleslegessé egy erős jelszót.

**Kijelentkezés.** Szándékosan csak űrlappal (POST) működik. Egy kijelentkező linket a
böngésző- és vírusirtó-előtöltők maguktól meghívnának, ami spontán kiléptetne.

**CSV és Excel.** Az exportált mezők elé, ha `=`, `+`, `-` vagy `@` karakterrel kezdődnének,
aposztróf kerül, hogy az Excel ne képletként értelmezze őket.

---

## 11. Adatvédelem: mit tárol és mit nem

**A vásárlókról:**

| Tárol | Nem tárol |
|---|---|
| a Stripe belső vevőazonosítója (`cus_...`) | név |
| a fizetett összeg és a pénznem | e-mail cím |
| a fizetés időpontja | lakcím, telefonszám |
| a Stripe fizetési azonosítók | bankkártya-adat (soha nem is látja) |

A rendszerből tehát **nem lehet megmondani, ki vásárolt.** Csak azt, hogy egy adott
Stripe-azonosítójú vevő mennyit fizetett, és melyik partneren keresztül érkezett.

**A partnerekről:** név, e-mail cím, jelszó-hash, a partneri kód, az állapot, és a
bankszámlaszám. **Céges adatot (cégnév, adószám, székhely) a rendszer nem kér és nem tárol.**

**A kattintásokról:** a látogató IP-címéből képzett, **visszafejthetetlen lenyomat**
(nem maga az IP), a böngésző azonosítója, és a hivatkozó oldal. Ezekre a megőrzési időt
neked kell meghatároznod, lásd `DONTESEK.md` 17. pont.

---

## 12. Üzemeltetés és hibakeresés

### A havi rutin

1. **Hetente:** Partnerek oldal, az újakat jóváhagyod. (E-mailt a rendszer nem küld,
   szóval magadtól kell ránézni.)
2. **Havonta:** Jutalékok oldal → „Összes esedékes jóváhagyása”.
3. **Utána:** Kifizetés oldal → „Kör lezárása” → CSV letöltése → utalás a bankodból.
4. **Ha figyelmeztetés van az Áttekintésen** (kifizetés utáni visszatérítés), azt kézzel rendezed.

### Ha egy vásárlás nem jelenik meg

Nézd meg **ebben a sorrendben**:

1. **Admin → Események.** Ott van egyáltalán a Stripe esemény?
   - **Nincs semmi:** a webhook nem érkezik meg. Stripe Dashboard → Developers → Webhooks,
     nézd meg a végpont állapotát és a hibás kézbesítéseket. Ellenőrizd, hogy a
     `STRIPE_WEBHOOK_SECRET` a Vercelen egyezik a Stripe-ban látható titokkal.
   - **Ott van, de `FELDOLGOZÁSI HIBA:` kezdetű:** a hibaüzenet ott olvasható.
   - **Ott van, `ref=` nélkül:** a partneri kód nem jutott el a Stripe-ig. Ez az ÉR-oldali
     bekötés (6. lépés a `BEKOTES.md`-ben): a `client_reference_id` sor hiányzik vagy
     a süti nem jött létre.
   - **Ott van `ref=KÓD`-dal, de nincs jutalék:** a partner valószínűleg nem `active`.
     Nézd meg a Partnerek oldalon.
2. **Admin → Jutalékok.** Ha ott van, csak „Függőben”, akkor minden rendben,
   csak a tartási idő tart még.

### Ha egy partner nem tud belépni

- **Elfelejtette a jelszavát:** Partnerek oldal → az ő sorában „Új jelszó” → beírsz egyet →
  eljuttatod hozzá. A rendszer nem küld e-mailt.
- **„Túl sok belépési kísérlet”:** a sebességkorlát lépett be, 15 perc múlva újra próbálhatja.
- **„A fiókod fel van függesztve”:** a Partnerek oldalon oldd fel.

### Ha a kifizetési kör gomb nem jelenik meg

Nincs olyan partner, aki mind a három feltételt teljesíti (küszöb, bankszámla,
nincs felfüggesztve). A táblázat megmutatja, kinél mi hiányzik.

### A demó mód

A `DEMO_MODE=1` környezeti változó egy fájl alapú mintaadatbázisra kapcsol,
Supabase és Stripe nélkül. Kipróbálásra való. **Élesben soha ne legyen beállítva.**
Ha be van kapcsolva, a felület tetején végig ott egy figyelmeztető sáv.

---

## 13. Ismert korlátok

Ezeket tudni kell, mielőtt meglepetés lesz belőlük:

1. **Nincs e-mail küldés.** Sem értesítés, sem elfelejtett jelszó. A partneri jelszót
   az üzemeltető állítja be és adja át.
2. **Csak forint.** Más pénznemű fizetésnél az összeg hibásan, forintként kerül a rendszerbe.
3. **A kattintásszám felfelé torzít**, mert a botokat és a link-előnézeteket is számolja.
   A jutalékot ez nem érinti, az kizárólag valódi fizetésből keletkezik.
4. **A sebességkorlát példányonként él** szerver nélküli környezetben.
5. **Nincs egyedi (beszédes) partneri kód** a felületen; a Supabase-ben kézzel átírható.
6. **Nincs önkiszolgáló fióktörlés** a partnernek.
7. **Nincs ÁSZF és adatkezelési tájékoztató** a csomagban.
8. **A visszatérítés párosítása** a Stripe fizetési azonosítóján alapul. Ha az valamiért
   hiányzik, a rendszer a vevő legutóbbi első vásárlásához köti. Ritka esetben ez
   melléfoghat, ezért van kézi „Visszavon” gomb a Jutalékok oldalon.

A nyitott **döntési kérdések** (mit hogyan akarsz) külön dokumentumban: `DONTESEK.md`.
