# Eldöntendő kérdések a rendszer tulajdonosának

Ez a lista azokat a pontokat gyűjti össze, ahol a rendszernek **választania kellett**
valamilyen viselkedés között, és a választás nem magától értetődő. Mindegyikhez oda
van írva, mi történik **most**, mi a másik lehetőség, és **hol kell hozzányúlni**,
ha másképp akarod.

A legtöbbnél az alapértelmezés használható úgy, ahogy van. Az a fontos, hogy tudj róluk,
mert pénzről és partneri elvárásokról szólnak, és utólag magyarázkodni kellemetlen.

Jelölés:
- **[BEÁLLÍTÁS]** = az admin felület Beállítások oldalán átírható, kód nélkül.
- **[KÓD]** = fejlesztői módosítás kell hozzá, meg van adva a fájl.
- **[DÖNTÉS]** = nem a rendszeren múlik, hanem rajtad (szabályzat, szerződés, könyvelés).

A táblázat végén van egy üres oszlop, ahol a saját döntésedet rögzítheted.

---

## 1. Melyik partner kapja a jutalékot, ha a vevő többön keresztül is járt? **[KÓD]**

**Most:** az **utolsó** kattintás nyer. Ha valaki előbb Anna, majd Péter linkjén jön,
Péter kapja a jutalékot. A partneri kód egy sütiben van, és minden új kattintás felülírja.

**Másik lehetőség:** az **első** kattintás nyer (a süti csak akkor íródik, ha még üres).
Ez a partner szempontjából „igazságosabb” annak, aki felfedezte a vevőt, de bosszantó
annak, aki ténylegesen meggyőzte.

**Hol:** `er-oldal-bekotes/1-nextjs-middleware.ts` és `3-univerzalis-snippet.html`
(mindkettőben a süti írása előtt kell megnézni, létezik-e már), valamint
`src/app/r/[code]/route.ts`.

> Az iparági többség az utolsó kattintást használja. Amit **nem** szabad: menet közben
> megváltoztatni, amikor a partnereidnek már ígértél valamit.

---

## 2. Meddig érvényes egy kattintás? **[KÓD]**

**Most:** **60 nap.** Aki ma kattint és 59 nap múlva fizet elő, azt még a partnernek számoljuk.

**Másik lehetőség:** 30 nap (szigorúbb, olcsóbb), vagy 90 nap (bőkezűbb, vonzóbb a partnereknek).

**Hol:** `src/app/r/[code]/route.ts` (`maxAge`), és ugyanez a szám az
`er-oldal-bekotes/` két fájljában. **Mindháromban egyszerre kell átírni.**

---

## 3. Jár-e jutalék a megújulásokért? **[KÓD]**

**Most:** **nem.** Egyszeri jutalék az első fizetés után. A megújulásokat a rendszer
rögzíti és mutatja statisztikaként, de pénzt nem generál.

**Másik lehetőség:** minden megújulás után is jár jutalék (visszatérő modell). Ez a
partnereknek sokkal vonzóbb, neked viszont tartós költség minden előfizető után.

**Hol:** `src/app/api/stripe/route.ts`, az `onInvoicePaid` függvény „megújulás” ága.

> Ez a legnagyobb pénzügyi tétel a listában. Előbb számold ki, mennyi egy előfizető
> élettartam-értéke, és csak utána ígérj visszatérő jutalékot.

---

## 4. Miből számoljuk a jutalékot: bruttóból vagy nettóból? **[KÓD] [DÖNTÉS]**

**Most:** a Stripe-tól kapott **teljes fizetett összegből**, tehát a bruttóból,
ÁFÁ-val együtt, kedvezmény levonása után.

**Másik lehetőség:** ÁFA nélküli alapból. 27% ÁFA mellett ez érezhetően kisebb jutalék.

**Hol:** `src/app/api/stripe/route.ts`, `createFirstConversion` (`amountHuf` szorzása
a kulccsal). Ha nettóból számolnál, a bruttót előbb el kell osztani 1,27-tel.

> Amit itt eldöntesz, azt **írd bele a partneri tájékoztatóba**. A „30% jutalék” mondat
> önmagában félreérthető.

---

## 5. Mi történjen részleges visszatérítésnél? **[KÓD]**

**Most:** a jutalék **arányosan csökken**. 38 990 Ft-ból 10 000 Ft visszatérítése után
a jutalék a maradék 28 990 Ft-ra jár, és a tétel kap egy magyarázó megjegyzést.

**Másik lehetőség:** bármilyen visszatérítés a **teljes** jutalékot visszavonja
(egyszerűbb szabály, a partnernek kedvezőtlen).

**Hol:** `src/app/api/stripe/route.ts`, `onRefund`.

> Ha nálatok nincs részleges visszatérítés, ez a kódrész soha nem fut le, tehát
> nem kell vele foglalkozni.

---

## 6. Mi legyen, ha a visszatérítés a kifizetés UTÁN érkezik? **[DÖNTÉS]**

**Most:** a rendszer **nem nyúl a pénzhez**, csak megjelöli a tételt
(„kézi rendezést igényel”) és kiírja az admin Áttekintésre.

**Másik lehetőség:** automatikusan levonni a partner következő kifizetéséből.
Ez technikailag megoldható, de vitát szül, ha a partnernek nincs következő kifizetése.

**Ehhez neked kell szabályt írni:** elnyeled a veszteséget, levonod a következő körből,
vagy visszakéred? Bármelyik jó, csak legyen leírva a partneri feltételekben, mielőtt
először előfordul.

---

## 7. Mennyi legyen a tartási idő? **[BEÁLLÍTÁS]**

**Most:** **30 nap.** Ennyi ideig „függő” a jutalék, és csak utána hagyható jóvá.
Ez fedezi a 14 napos elállást és a késve érkező visszatérítéseket.

**Mérlegelés:** ha éves csomagot is árultok, vagy hosszabb pénzvisszafizetési garanciátok
van, **45 vagy 60 nap** a biztonságos. Ha nincs garancia és ritka a visszatérítés, 14 nap is elég.

**Hol:** admin felület → Beállítások → Tartási idő.

---

## 8. Mennyi legyen a kifizetési küszöb? **[BEÁLLÍTÁS] [DÖNTÉS]**

**Most:** **20 000 Ft.** Aki ez alatt van, nem kerül a körbe, az összege átgördül a következőre.

**Amit érdemes végiggondolni:** mi történik azzal, aki soha nem éri el a küszöböt?
Örökre bent ragad a pénze. Sok programnál van egy szabály, hogy évente egyszer
küszöb alatt is kifizetnek, vagy a partner kérheti. A rendszer ezt nem tudja magától;
ha ilyet ígérsz, a küszöböt kell ideiglenesen lejjebb venni a kör lezárása előtt.

---

## 9. Mi történik, ha megváltoztatod a jutalékkulcsot? **[BEÁLLÍTÁS]**

**Most:** az új kulcs **csak az ezután érkező vásárlásokra** érvényes. A már létrejött
jutalékok a saját, régi kulcsukkal maradnak, és ez a százalék látszik is a Jutalékok oldalon.

Ez szándékos: visszamenőleg átszámolni valakinek a már megígért jutalékát nem szép dolog.
Ha mégis ezt akarod, kézzel kell átírni az adatbázisban.

---

## 10. Mi legyen a felfüggesztett partner már megszerzett jutalékával? **[KÓD]**

**Most:** **befagy.** Nem hagyható jóvá, nem kerül kifizetési körbe. A felfüggesztés
visszavonható, akkor újra elérhető lesz.

**Másik lehetőség:** a felfüggesztés csak az új jutalékokat állítja le, a régiek kifizethetők.

**Hol:** `src/app/actions.ts`, `approveAllDue` és `createPayoutBatch`.

> A jelenlegi viselkedés csalás gyanúja esetén helyes (nem fizetsz, amíg nem tisztázódott).
> Ha viszont csak azért függesztesz fel valakit, mert abbahagyta, akkor kissé kemény.

---

## 11. Használhatja-e a partner a saját linkjét? **[DÖNTÉS]**

**Most:** **igen, semmi nem tiltja.** Ha egy partner a saját linkjén fizet elő,
30% kedvezményt ad magának.

A rendszer ezt nem tudja megbízhatóan kiszűrni (a vásárlói e-mail nem is kerül bele).
Ez **szabályzati kérdés**: írd bele a partneri feltételekbe, hogy szabad-e, és ha nem,
a Partnerek oldalon fel tudod függeszteni azt, akiről kiderül.

---

## 12. Ha ugyanaz a vevő másik partneren keresztül vásárol újra? **[KÓD]**

**Most:** ha új Stripe-vásárlás indul egy másik partner linkjéről, **az új partner
kap jutalékot** rá. A már futó előfizetés megújulásai viszont továbbra is az első
partnerhez tartoznak (és megújulásért amúgy sem jár jutalék, lásd 3. pont).

**Másik lehetőség:** egy vevő életében csak egyszer keletkezhessen jutalék.

**Hol:** `src/app/api/stripe/route.ts`, `onCheckoutCompleted`.

---

## 13. Mi van, ha nem forintban fizetnek? **[KÓD]**

**Most:** a rendszer **forintra van kihegyezve.** Ha egy vásárlás euróban érkezik,
az összeget forintként fogja nyilvántartani, tehát a jutalék hibás lesz.

Amíg csak forintos árazásotok van, ez nem probléma. **Ha valaha euróban is árultok,
szólni kell**, mert árfolyam-átváltást kell beletenni.

**Hol:** `src/lib/money.ts`, `stripeAmountToHuf`.

---

## 14. Ki lehet partner? **[DÖNTÉS]**

**Most:** bárki regisztrálhat, és **te hagyod jóvá**. Jóváhagyás nélkül a linkje nem él,
és jutalék sem keletkezik.

A rendszer nem szűr semmit. Ha van elvárásod (minimum követőszám, tematikai illeszkedés,
nem versenytárs), az a te döntésed a Jóváhagy gomb megnyomása előtt. Érdemes leírni
magadnak, mert a visszautasítást meg kell tudni indokolni.

---

## 15. Kap-e bárki e-mailt? **[KÓD]**

**Most:** **senki, semmikor.** Nincs e-mail küldés a rendszerben.

Ez azt jelenti, hogy:
- az új partner regisztrációjáról **nem kapsz értesítést** (hetente nézz rá a Partnerek oldalra),
- a partner nem kap értesítést a jóváhagyásról, sem a kifizetésről,
- **nincs önkiszolgáló elfelejtett jelszó.** Ha a partner kizárja magát, a Partnerek oldalon
  te adsz neki új jelszót, és eljuttatod hozzá.

**Ha kell e-mail:** egy szolgáltató (pl. Resend, Postmark) beépítése kb. fél nap munka.

---

## 16. Minden kattintás számít? **[KÓD] [DÖNTÉS]**

**Most:** igen, minden megnyitás a `/r/KÓD` címen. Ebben benne vannak a keresőrobotok,
a link-előnézeti botok (Facebook, Slack) és a böngésző-előtöltések is.

Ez a **kattintásszámot felfelé torzítja.** A jutalékot nem érinti, mert az kizárólag
valódi Stripe-fizetésből keletkezik. Ha a partnereidnek pontos kattintásszámot ígérsz,
érdemes bot-szűrést tenni bele.

**Hol:** `src/app/r/[code]/route.ts`.

---

## 17. Meddig őrizzük a kattintási adatokat? **[DÖNTÉS]**

**Most:** **örökre.** A rendszer minden kattintáshoz eltárol egy visszafejthetetlen
IP-lenyomatot (nem magát az IP-t), a böngésző azonosítóját és a hivatkozó oldalt.

Adatvédelmi szempontból érdemes megőrzési időt megadni (pl. 12 hónap), és a régieket
törölni. Ez a Supabase felületén egy egyszerű ütemezett törlés, de **kell hozzá döntés**,
és bele kell írni az adatkezelési tájékoztatóba.

---

## 18. A partneri kód formája **[KÓD]**

**Most:** automatikusan generált **8 karakteres** kód (pl. `K7MQP2XR`), összetéveszthető
betűk nélkül (nincs benne 0, O, I, 1, L).

**Amit kérni fognak:** saját, beszédes kód (`ANNA`, `FITBLOG`). A rendszer ezt nem
kínálja fel, de a Supabase felületén kézzel átírható a partner `code` mezője, ha
egyedi és nem ütközik.

---

## 19. Tud-e a partner fiókot törölni? **[KÓD]**

**Most:** **nem**, önkiszolgáló törlés nincs. Ha valaki kéri, a Supabase felületén
kell törölni, de figyelj: ha vannak hozzá tartozó jutalékok, azokat előbb rendezni kell.

Alternatíva: felfüggeszted, ami gyakorlatilag ugyanaz, csak a történet megmarad.

---

## 20. Jogi anyagok **[DÖNTÉS]**

A csomag **nem tartalmaz** partneri ÁSZF-et és adatkezelési tájékoztatót. Ezek nélkül
ne indulj el. Amit mindenképp le kell írni bennük, a fenti lista alapján:

- a jutalék mértéke és **mire jár** (bruttó vagy nettó, első vásárlás vagy megújulás is),
- az attribúció szabálya (utolsó kattintás, 60 nap),
- a tartási idő és a kifizetési küszöb,
- mi történik visszatérítéskor, és mi a kifizetés utáni visszatérítésnél,
- szabad-e a saját linket használni,
- a kattintási adatok kezelése és megőrzési ideje,
- a felfüggesztés esetei és következményei,
- a kifizetés adózási módja (számla, kifizetői teher, magánszemély vagy vállalkozó).

> A rendszer szándékosan **nem kér céges adatot** a partnertől. Ez a kifizetés adózási
> kezelését rád hárítja: a könyvelőddel tisztázd, hogyan fizetsz magánszemélynek, és
> milyen dokumentum kell hozzá.

---

## Döntési lap

Töltsd ki, és tedd el. Ha egy fejlesztő később hozzányúl, ebből fogja tudni, mi volt a szándék.

| # | Kérdés | Alapértelmezés | A te döntésed |
|---|---|---|---|
| 1 | Attribúció | utolsó kattintás | |
| 2 | Attribúciós ablak | 60 nap | |
| 3 | Jutalék megújulásra | nem jár | |
| 4 | Jutalék alapja | bruttó | |
| 5 | Részleges visszatérítés | arányos csökkentés | |
| 6 | Refund a kifizetés után | csak megjelölés | |
| 7 | Tartási idő | 30 nap | |
| 8 | Kifizetési küszöb | 20 000 Ft | |
| 9 | Kulcsváltás visszamenőleg | nem | |
| 10 | Felfüggesztett partner jutaléka | befagy | |
| 11 | Saját link használata | engedett | |
| 12 | Vevő másik partneren át újra | új jutalék | |
| 13 | Nem forintos fizetés | nincs kezelve | |
| 14 | Partneri belépési feltétel | nincs | |
| 15 | E-mail értesítés | nincs | |
| 16 | Bot-kattintások szűrése | nincs | |
| 17 | Kattintási adat megőrzése | korlátlan | |
| 18 | Egyedi partneri kód | nincs | |
| 19 | Fiók törlése | nincs | |
| 20 | ÁSZF és adatkezelés | nincs a csomagban | |
