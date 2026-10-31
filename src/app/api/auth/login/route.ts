import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { AppError, errorResponse, readJson } from "@/lib/api-response";
import { checkLoginRateLimit, recordLoginFailure } from "@/lib/auth/login-rate-limit";
import { assertSameOrigin } from "@/lib/auth/guard";
import { verifyAdminPassword } from "@/lib/auth/password";
import { createSessionToken, SESSION_COOKIE, SESSION_LIFETIME_SECONDS } from "@/lib/auth/session";

const loginSchema = z.object({ username: z.string().min(1).max(120), password: z.string().min(1).max(1024), next: z.string().optional() });

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const sourceHash = await checkLoginRateLimit(request);
    const parsed = loginSchema.safeParse(await readJson(request));
    if (!parsed.success) throw new AppError("INVALID_CREDENTIALS", "用户名或密码错误。", 401);
    const { username, password, next } = parsed.data;
    const expectedUser = process.env.ADMIN_USERNAME;
    const passwordHash = process.env.ADMIN_PASSWORD_HASH;
    if (!expectedUser || !passwordHash) throw new AppError("AUTH_NOT_CONFIGURED", "管理员登录尚未配置 ADMIN_USERNAME 和 ADMIN_PASSWORD_HASH。", 503);
    const actualUser = Buffer.from(username);
    const expectedUserBytes = Buffer.from(expectedUser);
    const usernameMatches = actualUser.length === expectedUserBytes.length && timingSafeEqual(actualUser, expectedUserBytes);
    const passwordMatches = await verifyAdminPassword(password, passwordHash);
    if (!usernameMatches || !passwordMatches) {
      await recordLoginFailure(sourceHash);
      throw new AppError("INVALID_CREDENTIALS", "用户名或密码错误。", 401);
    }
    const safeNext = next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/products";
    const token = createSessionToken(expectedUser);
    const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
    return Response.json({ data: { redirectTo: safeNext } }, { headers: { "Set-Cookie": `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_LIFETIME_SECONDS}${secure}` } });
  } catch (error) { return errorResponse(error); }
}
