import "server-only";
import { createHmac } from "node:crypto";
import { and, count, eq, gt, lt } from "drizzle-orm";
import { AppError } from "@/lib/api-response";
import { getDatabase } from "@/lib/db";
import { adminLoginAttempts } from "@/lib/db/schema";

function digest(value: string) {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) throw new AppError("AUTH_NOT_CONFIGURED", "管理员登录尚未配置 AUTH_SESSION_SECRET。", 503);
  return createHmac("sha256", secret).update(value).digest("hex");
}

export async function checkLoginRateLimit(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const source = forwarded || request.headers.get("x-real-ip") || "unknown";
  const sourceHash = digest(source);
  const database = getDatabase();
  const cutoff = new Date(Date.now() - 15 * 60 * 1000);
  await database.delete(adminLoginAttempts).where(lt(adminLoginAttempts.attemptedAt, new Date(Date.now() - 24 * 60 * 60 * 1000)));
  const [{ value }] = await database.select({ value: count() }).from(adminLoginAttempts)
    .where(and(eq(adminLoginAttempts.sourceHash, sourceHash), gt(adminLoginAttempts.attemptedAt, cutoff)));
  if (value >= 5) throw new AppError("LOGIN_RATE_LIMITED", "登录尝试次数过多，请 15 分钟后重试。", 429);
  return sourceHash;
}

export async function recordLoginFailure(sourceHash: string) {
  await getDatabase().insert(adminLoginAttempts).values({ sourceHash });
}
