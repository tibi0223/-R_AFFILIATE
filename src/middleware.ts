import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const OPEN_ADMIN = ["/admin/belepes", "/admin/setup"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const need = pathname.startsWith("/admin") ? "admin" : pathname.startsWith("/partner") ? "partner" : null;
  if (!need || OPEN_ADMIN.includes(pathname)) return NextResponse.next();

  const token = req.cookies.get("er_sess")?.value;
  try {
    if (!token) throw new Error("nincs token");
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.SESSION_SECRET || "fejlesztesi-titok-csere-eles-elott")
    );
    if (payload.role !== need) throw new Error("rossz szerep");
    return NextResponse.next();
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = need === "admin" ? "/admin/belepes" : "/belepes";
    url.search = "";
    return NextResponse.redirect(url);
  }
}

export const config = { matcher: ["/admin/:path*", "/partner/:path*"] };
