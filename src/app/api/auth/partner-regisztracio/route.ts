import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, generateCode } from "@/lib/auth";
import { allow, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMIT = 5;                     // regisztráció
const WINDOW = 60 * 60 * 1000;       // óránként, IP-nként

const back = (req: NextRequest, q: string) =>
  NextResponse.redirect(new URL(`/regisztracio?hiba=${q}`, req.url), 303);

export async function POST(req: NextRequest) {
  if (!allow(`regisztracio:${clientIp(req)}`, LIMIT, WINDOW)) return back(req, "tul_sok");

  const f = await req.formData();
  const name = String(f.get("name") ?? "").trim();
  const email = String(f.get("email") ?? "").trim().toLowerCase();
  const pw = String(f.get("password") ?? "");
  const pw2 = String(f.get("password2") ?? "");

  if (!name || !email.includes("@")) return back(req, "adatok");
  if (pw.length < 8) return back(req, "jelszo_rovid");
  if (pw !== pw2) return back(req, "jelszo_elter");

  const password_hash = await hashPassword(pw);
  for (let i = 0; i < 3; i++) {
    const { error } = await db().from("affiliates").insert({
      name, email, password_hash, code: generateCode(), status: "pending",
    });
    if (!error) return NextResponse.redirect(new URL("/belepes?uzenet=regisztralva", req.url), 303);
    if (String(error.message).includes("affiliates_email_key")) return back(req, "email_foglalt");
  }
  return back(req, "ismeretlen");
}
