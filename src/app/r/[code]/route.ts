import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { useSecureCookies } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Partneri link: https://<ez-az-app>/r/KOD
 * 1. rögzíti a kattintást,
 * 2. beállítja az er_ref cookie-t (ha COOKIE_DOMAIN meg van adva, a fő domainre is),
 * 3. átirányít az ÉR oldalára ?ref=KOD paraméterrel.
 */
export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const target = process.env.ER_REDIRECT_URL || "https://etkezesirendszer.hu/bemutato";
  const raw = (params.code || "").toUpperCase();

  if (!/^[A-Z0-9]{4,32}$/.test(raw)) {
    return NextResponse.redirect(target, 302);
  }

  const { data: aff } = await db()
    .from("affiliates")
    .select("id,status")
    .eq("code", raw)
    .maybeSingle();

  const url = new URL(target);
  const res = NextResponse.redirect(aff && aff.status === "active" ? withRef(url, raw) : url, 302);

  if (aff && aff.status === "active") {
    // kattintás rögzítése (hiba esetén sem akadályozza az átirányítást)
    try {
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
      const salt = process.env.SESSION_SECRET || "salt";
      await db().from("clicks").insert({
        affiliate_id: aff.id,
        ip_hash: ip ? createHash("sha256").update(ip + salt).digest("hex").slice(0, 32) : null,
        user_agent: (req.headers.get("user-agent") || "").slice(0, 300),
        referer: (req.headers.get("referer") || "").slice(0, 300),
      });
    } catch (e) {
      console.error("Kattintás rögzítési hiba:", e);
    }

    res.cookies.set("er_ref", raw, {
      maxAge: 60 * 60 * 24 * 60, // 60 nap
      sameSite: "lax",
      // http://localhost alatt (demó) a Secure jelző eldobatná a sütit
      secure: useSecureCookies(),
      path: "/",
      httpOnly: false, // a fogadó oldal kliensoldali kódja is olvashassa
      ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
    });
  }

  return res;
}

function withRef(url: URL, code: string): URL {
  const u = new URL(url.toString());
  u.searchParams.set("ref", code);
  return u;
}
