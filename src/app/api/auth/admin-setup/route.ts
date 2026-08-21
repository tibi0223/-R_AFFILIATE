import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, signSession, attachSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Csak addig működik, amíg egyáltalán nincs admin fiók.
  const { count } = await db().from("admins").select("*", { count: "exact", head: true });
  if ((count ?? 0) > 0) return NextResponse.redirect(new URL("/admin/belepes", req.url), 303);

  const f = await req.formData();
  const email = String(f.get("email") ?? "").trim().toLowerCase();
  const pw = String(f.get("password") ?? "");
  if (!email.includes("@") || pw.length < 8) {
    return NextResponse.redirect(new URL("/admin/setup?hiba=adatok", req.url), 303);
  }

  await db().from("admins").insert({ email, password_hash: await hashPassword(pw) });
  const { data: admin } = await db().from("admins").select("id").eq("email", email).single();

  const res = NextResponse.redirect(new URL("/admin", req.url), 303);
  attachSession(res, await signSession(admin!.id, "admin"));
  return res;
}
