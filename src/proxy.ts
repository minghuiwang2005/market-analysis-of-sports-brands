import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { isLocale, type Locale } from "@/lib/i18n/locale";

const localeCookie = "site_locale";

function localizedPath(path: string): { locale: Locale; publicPath: string } | null {
  const match = path.match(/^\/(zh|en)(?=\/|$)(.*)$/);
  if (!match || !isLocale(match[1])) return null;
  return { locale: match[1], publicPath: match[2] || "/" };
}

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const internalLocale = localizedPath(path);
  const publicPath = internalLocale?.publicPath ?? path;
  const apiPath = publicPath.startsWith("/api/");
  const loginPath = publicPath === "/login";
  const authApiPath = path.startsWith("/api/auth/");
  const localePreferencePath = path === "/api/preferences/locale";

  if (authApiPath || localePreferencePath) return NextResponse.next();
  if (loginPath) {
    if (internalLocale) return NextResponse.next();
    const locale = request.cookies.get(localeCookie)?.value;
    const rewrite = request.nextUrl.clone();
    rewrite.pathname = `/${isLocale(locale) ? locale : "zh"}/login`;
    return NextResponse.rewrite(rewrite);
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!verifySessionToken(token)) {
    if (apiPath) return Response.json({ error: { code: "UNAUTHENTICATED", message: "请先登录管理员账号。" } }, { status: 401 });
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `${publicPath}${request.nextUrl.search}`);
    return NextResponse.redirect(login);
  }

  if (apiPath) return NextResponse.next();
  if (internalLocale) return NextResponse.next();
  const cookieLocale = request.cookies.get(localeCookie)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : "zh";
  const rewrite = request.nextUrl.clone();
  rewrite.pathname = `/${locale}${path}`;
  return NextResponse.rewrite(rewrite);
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|images/).*)"] };
