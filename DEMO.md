# Demó mód: a felület kipróbálása 2 perc alatt

Supabase, Stripe és bármilyen fiók **nélkül** elindítható, mintaadatokkal feltöltve.
Így végig lehet kattintani az egész rendszert, mielőtt bárki bármit beüzemelne.

## Indítás

Szükséges: Node.js 18+ ([nodejs.org](https://nodejs.org), az „LTS" verzió jó).

Windowson elég duplán kattintani az `INDITAS-WINDOWS.bat` fájlra. Kézzel:

```bash
# a kicsomagolt mappában:
npm install
cp .env.demo .env.local
npm run dev
```

Ezután nyisd meg: **http://localhost:3000**

## Demó belépések

| Szerep | E-mail | Jelszó |
|---|---|---|
| Üzemeltető (admin) | `admin@demo.hu` | `demo1234` |
| Partner | `partner@demo.hu` | `demo1234` |

## Mit érdemes végigpróbálni?

**Partnerként** (`partner@demo.hu`)
1. Áttekintés: egyedi link, kattintásszám, jutalékok állapot szerint
2. „Másolás" gomb a linken
3. Fiók és kifizetés: bankszámlaszám megadása, jelszócsere

**Üzemeltetőként** (`admin@demo.hu`)
1. Áttekintés: a jóváhagyásra váró partner és a kifizetés utáni visszatérítés figyelmeztetése
2. Partnerek → „Jóváhagy" egy várakozó partneren (Szabó Márk).
   Ugyanitt az „Új jelszó" gombbal tudsz partneri jelszót beállítani.
3. Jutalékok → „Összes esedékes jóváhagyása".
   Itt egyben látszik az összes eset: függőben lévő, jóváhagyott, kifizetett,
   visszavont, Tóth Lillánál egy **részlegesen** visszatérített (a jutalék a
   megmaradt összegre igazodott), Horváth Dóránál pedig egy olyan, ahol a
   visszatérítés a **kifizetés után** érkezett, ezért a tétel „Kifizetve" maradt,
   és csak megjelölést kapott.
4. Kifizetés → „Kör lezárása és utalási lista készítése" → CSV letöltése
   (látszik, hogy a bankszámla nélküli és a küszöb alatti partner kimarad)
5. Események → a beérkezett Stripe-értesítések nyers listája
6. Beállítások → jutalék %, tartási idő, kifizetési küszöb átírása

**Partneri link:** próbáld ki a `http://localhost:3000/r/ANNA24` címet.
Rögzíti a kattintást, beállítja a sütit, és átirányít az ÉR oldalára `?ref=ANNA24`-gyel.
(Az admin Áttekintésen nő a kattintásszám.)

## Amit a demó nem tud

- **Nincs valódi Stripe.** A vásárlások és a jutalékok mintaadatok. Éles Stripe
  webhookkal ugyanez a folyamat automatikusan fut le.
- Az adatok a `.demo/data.json` fájlban vannak. Töröld a mappát, és újraindításkor
  visszaáll az eredeti mintaállapot.

## Visszaállás éles módra

A `.env.local` fájlból töröld a `DEMO_MODE=1` sort, és töltsd ki a valódi
Supabase/Stripe adatokat a `.env.example` alapján. A telepítés lépései: **BEKOTES.md**.
