import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export const SESSION_COOKIE = "er_sess";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 nap

function secret() {
  return new TextEncoder().encode(process.env.SESSION_SECRET || "fejlesztesi-titok-csere-eles-elott");
}

export type Session = { id: string; role: "admin" | "partner" };

/** Aláírt munkamenet-token készítése. */
export async function signSession(id: string, role: Session["role"]): Promise<string> {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

/**
 * A munkamenet-sütit MINDIG a válaszra tesszük rá (route handlerben).
 * Fontos: Server Actionből cookies().set() + redirect() kombinációban a
 * Next.js elveszíti a Set-Cookie fejlécet, ezért a belépés route handler.
 */
export function attachSession(res: NextResponse, token: string) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // demó módban http://localhost fut, ott a Secure jelző eldobatná a sütit
    secure: useSecureCookies(),
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function clearSession(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
}

/** true, ha a sütire rá kell tenni a Secure jelzőt (élesben igen, demóban nem). */
export function useSecureCookies(): boolean {
  return process.env.NODE_ENV === "production" && process.env.DEMO_MODE !== "1";
}

/** Az aktuális munkamenet kiolvasása szerverkomponensben / actionben. */
export async function getSession(): Promise<Session | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const role = payload.role;
    if (role !== "admin" && role !== "partner") return null;
    return { id: String(payload.sub), role };
  } catch {
    return null;
  }
}

export function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}
export function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

/** Partneri hivatkozási kód: 8 karakter, könnyen olvasható ábécé. */
export function generateCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

/**
 * Ideiglenes jelszó javaslata, ha az üzemeltető partneri jelszót állít vissza.
 * Nem kriptográfiai titok, csak egy kényelmes, felolvasható kezdőérték.
 */
export function suggestPassword(): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}
