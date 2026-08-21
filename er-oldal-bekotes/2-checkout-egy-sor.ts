// ═══════════════════════════════════════════════════════════════════
// 2/2 — A kód átadása a Stripe-nak fizetéskor (EGYETLEN új sor)
//
// Keresd meg az oldalban, ahol a stripe.checkout.sessions.create(...)
// hívás van, és add hozzá a client_reference_id sort.
// ═══════════════════════════════════════════════════════════════════
import { cookies } from "next/headers"; // Next.js App Router esetén

const session = await stripe.checkout.sessions.create({
  // ... minden meglévő beállítás VÁLTOZATLANUL marad ...

  // ↓ EZ AZ EGYETLEN ÚJ SOR ↓
  client_reference_id: cookies().get("er_ref")?.value ?? undefined,
});

// Pages Router / API route esetén ugyanez:
//   client_reference_id: req.cookies["er_ref"] ?? undefined,
//
// Más backend (PHP, Python, stb.): olvasd ki az "er_ref" cookie-t,
// és add át client_reference_id néven a Checkout Session létrehozásánál.
export {};
declare const stripe: any;
