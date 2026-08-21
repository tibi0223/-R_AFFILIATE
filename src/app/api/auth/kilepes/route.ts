import { NextResponse, type NextRequest } from "next/server";
import { clearSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A kijelentkezés SZÁNDÉKOSAN csak POST-ra működik.
 * GET-es kijelentkező linket a Next.js link-előtöltése (és bármelyik
 * böngésző- vagy vírusirtó-előtöltő) magától meghívna, ami spontán
 * kiléptetné a felhasználót. Ezért űrlap + gomb, nem link.
 */
export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/", req.url), 303);
  clearSession(res);
  return res;
}
