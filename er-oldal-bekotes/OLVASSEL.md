# ÉR-oldali bekötés: 2 apró módosítás

Ez a mappa azt a keveset tartalmazza, amit az **etkezesirendszer.hu** oldalba kell
beépíteni. Minden más (partnerfelület, admin, adatbázis, webhook) a külön affiliate
appban fut, ehhez a kódhoz nem kell hozzányúlni.

## Mit csinál a két módosítás?

1. A partneri linkből érkező `?ref=KOD` paramétert elmenti egy 60 napos cookie-ba
   (így akkor is megvan, ha a látogató csak napokkal később fizet elő).
2. Fizetéskor ezt a kódot átadja a Stripe-nak `client_reference_id`-ként.
   A Stripe ezt visszaküldi a webhookban, ebből tudja az affiliate rendszer,
   melyik partnernek jár a jutalék.

## Melyik fájlt használd?

- **Next.js oldal esetén:** `1-nextjs-middleware.ts` + `2-checkout-egy-sor.ts`
- **Bármilyen más oldal (WordPress, statikus, egyéb):** `3-univerzalis-snippet.html`
  a `<head>`-be, és a szerveroldali checkout-kódban a 2-es fájl logikája
  (a `er_ref` cookie értékét kell `client_reference_id`-ként átadni).
- **Ha Stripe Payment Linkeket használtok** (buy.stripe.com linkek a gombokon):
  elég a 3-as snippet, az automatikusan rárakja a kódot a Payment Link URL-ekre,
  szerveroldali módosítás egyáltalán nem kell.

## Fontos

- Ha a `ref` paraméter vagy a cookie hiányzik (nem partneri látogató), minden
  pontosan úgy működik, mint eddig. A módosítás semmit nem tud elrontani a fizetésben.
- A `client_reference_id`-t a Stripe változtatás nélkül továbbítja, személyes adat
  nem kerül át az affiliate rendszerbe.
