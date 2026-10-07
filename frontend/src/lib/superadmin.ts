import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "cottson-superadmin";
const attempts = globalThis as typeof globalThis & { superadminAttempts?: { count: number; until: number } };
export function allowLoginAttempt() {
  if (!attempts.superadminAttempts || attempts.superadminAttempts.until < Date.now()) {
    attempts.superadminAttempts = { count: 0, until: Date.now() + 60000 };
  }
  return ++attempts.superadminAttempts.count <= 20;
}
export function sameSecret(a: string, b: string) {
  const left = Buffer.from(a), right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export function sessionToken(expiry: number) {
  return `${expiry}.${createHmac("sha256", process.env.SUPERADMIN_PASSWORD!).update(`superadmin:${expiry}`).digest("hex")}`;
}
export async function isSuperadmin() {
  if (!process.env.SUPERADMIN_PASSWORD) return false;
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  const expiry = Number(token.split(".")[0]);
  return Number.isSafeInteger(expiry) && expiry > Date.now() && sameSecret(token, sessionToken(expiry));
}
