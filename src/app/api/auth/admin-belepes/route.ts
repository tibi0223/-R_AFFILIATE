import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, signSession, attachSession } from "@/lib/auth";
import { allow, reset, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMIT = 10;                    // próbálkozás
const WINDOW = 15 * 60 * 1000;       // 15 perc

export async function POST(req: NextRequest) {
  const f = await req.formData();
  const email = String(f.get("email") ?? "").trim().toLowerCase();
  const pw = String(f.get("password") ?? "");

  const key = `admin-belepes:${clientIp(req)}`;
  if (!allow(key, LIMIT, WINDOW)) {
    return NextResponse.redirect(new URL("/admin/belepes?hiba=tul_sok", req.url), 303);
  }

  const { data: admin } = await db()
    .from("admins").select("id,password_hash").eq("email", email).maybeSingle();

  if (!admin || !(await verifyPassword(pw, admin.password_hash))) {
    return NextResponse.redirect(new URL("/admin/belepes?hiba=belepes", req.url), 303);
  }

  reset(key);
  const res = NextResponse.redirect(new URL("/admin", req.url), 303);
  attachSession(res, await signSession(admin.id, "admin"));
  return res;
}
