import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/login" || path.startsWith("/api/auth/")) return NextResponse.next();
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (verifySessionToken(token)) return NextResponse.next();
  if (path.startsWith("/api/")) return Response.json({ error: { code: "UNAUTHENTICATED", message: "请先登录管理员账号。" } }, { status: 401 });
  const login = new URL("/login", request.url);
  login.searchParams.set("next", `${path}${request.nextUrl.search}`);
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|images/).*)"] };
