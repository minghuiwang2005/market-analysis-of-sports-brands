import { NextResponse } from "next/server";
import { AppError, errorResponse, readJson } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/auth/guard";
import { isLocale } from "@/lib/i18n/locale";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await readJson(request) as { locale?: unknown };
    if (typeof body.locale !== "string" || !isLocale(body.locale)) {
      throw new AppError("INVALID_LOCALE", "语言选项无效。", 422);
    }

    const response = NextResponse.json({ data: { locale: body.locale } });
    response.cookies.set("site_locale", body.locale, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
