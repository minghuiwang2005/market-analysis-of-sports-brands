import "server-only";
import { AppError } from "@/lib/api-response";
import { SESSION_COOKIE, verifySessionToken, type AdminSession } from "@/lib/auth/session";

export function requireAdminSession(request: Request): AdminSession {
  const cookie = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  const token = cookie?.slice(SESSION_COOKIE.length + 1);
  const session = verifySessionToken(token);
  if (!session) throw new AppError("UNAUTHENTICATED", "请先登录管理员账号。", 401);
  return session;
}

export function assertSameOrigin(request: Request) {
  if (request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS") return;
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.slice(0, -1);
  if (!origin || !host || origin !== `${proto}://${host}`) throw new AppError("INVALID_ORIGIN", "请求来源校验失败。", 403);
}

export async function withAdminApiErrors<T>(request: Request, operation: () => Promise<T>, status = 200) {
  const { errorResponse, successResponse } = await import("@/lib/api-response");
  try {
    requireAdminSession(request);
    assertSameOrigin(request);
    return successResponse(await operation(), status);
  } catch (error) {
    return errorResponse(error);
  }
}
