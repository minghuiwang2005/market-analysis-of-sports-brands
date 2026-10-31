import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "sports_admin_session";
export const SESSION_LIFETIME_SECONDS = 60 * 60 * 8;

export type AdminSession = { subject: string; expiresAt: number };

function secret() {
  const value = process.env.AUTH_SESSION_SECRET;
  if (!value || Buffer.byteLength(value) < 32) throw new Error("缺少 AUTH_SESSION_SECRET（至少 32 字节）。");
  return value;
}

function signature(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(subject: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ subject, expiresAt: now + SESSION_LIFETIME_SECONDS * 1000 })).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function verifySessionToken(token: string | undefined, now = Date.now()): AdminSession | null {
  if (!token) return null;
  try {
    const [payload, supplied, extra] = token.split(".");
    if (!payload || !supplied || extra) return null;
    const expected = Buffer.from(signature(payload));
    const actual = Buffer.from(supplied);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AdminSession;
    return typeof session.subject === "string" && Number.isFinite(session.expiresAt) && session.expiresAt > now ? session : null;
  } catch {
    return null;
  }
}
