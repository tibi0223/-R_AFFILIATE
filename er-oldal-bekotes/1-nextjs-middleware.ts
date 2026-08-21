// ═══════════════════════════════════════════════════════════════════
// 1/2 — A ?ref= paraméter elmentése cookie-ba (Next.js middleware)
//
// Ha MÁR VAN middleware.ts az oldalban: csak a jelölt blokkot másold be
// a meglévő middleware függvénybe.
// Ha MÉG NINCS: ez a fájl egy az egyben bemásolható a projekt gyökerébe
// (vagy src/ alá) middleware.ts néven.
// ═══════════════════════════════════════════════════════════════════
import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // ── EZT A BLOKKOT MÁSOLD, ha már van middleware-etek ──────────────
  const ref = req.nextUrl.searchParams.get("ref");
  if (ref && /^[A-Za-z0-9_-]{4,32}$/.test(ref)) {
    res.cookies.set("er_ref", ref.toUpperCase(), {
      maxAge: 60 * 60 * 24 * 60, // 60 nap
      sameSite: "lax",
      secure: true,
      path: "/",
    });
  }
  // ───────────────────────────────────────────────────────────────────

  return res;
}
