import { DatabaseConfigurationError } from "@/lib/db";
import { headers } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, string>;

  constructor(
    code: string,
    message: string,
    status = 400,
    details?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function successResponse<T>(data: T, status = 200) {
  return Response.json({ data }, { status });
}

export async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new AppError("INVALID_JSON", "请求内容不是有效的 JSON。", 422);
  }
}

const englishErrorMessages: Record<string, string> = {
  INVALID_JSON: "The request body is not valid JSON.",
  UNAUTHENTICATED: "Please sign in as an administrator.",
  INVALID_ORIGIN: "The request origin could not be verified.",
  DATABASE_NOT_CONFIGURED: "Neon is not configured. Set DATABASE_URL in the deployment environment.",
  DATABASE_UNAVAILABLE: "Neon is temporarily unavailable. Check the database connection and migration status.",
  DUPLICATE_VALUE: "That code or unique value already exists.",
  INVALID_RELATION: "The related record does not exist or is still referenced elsewhere.",
  MODEL_TEST_FAILED: "The model provider rejected the connection test.",
  MODEL_TEST_TIMEOUT: "The model provider did not respond before the timeout.",
  VALIDATION_ERROR: "Please review the highlighted fields.",
  NBA_ATHLETE_NOT_FOUND: "Select a published NBA athlete or create an unlinked candidate assessment.",
  MODEL_NOT_CONFIGURED: "No SES model version has been published yet.",
  MODEL_VERSION_NOT_FOUND: "The requested model version does not exist.",
  MODEL_CONFIGURATION_INVALID: "The saved model configuration is invalid.",
  EVALUATION_NOT_FOUND: "The assessment was not found.",
  EVALUATION_FINALIZED: "This finalized assessment is read-only. Create a recalculation draft to make changes.",
  EVALUATION_CREATE_FAILED: "The assessment could not be created.",
  METRIC_NOT_FOUND: "This metric is not part of the selected model.",
  INVALID_EVALUATION_SOURCE: "Sources must belong to this metric, remain un-rejected, and be public by the assessment date.",
  EVIDENCE_AFTER_AS_OF: "Metric periods must end on or before the assessment date.",
  INVALID_ELIGIBILITY_SOURCE: "Eligibility sources must be verified, belong to this assessment, and be public by the assessment date.",
  ELIGIBILITY_SOURCE_REQUIRED: "Add a public source before setting the competitor contract status.",
  INSUFFICIENT_EVALUATION_DATA: "Coverage or required dimensions are insufficient to finalize this assessment.",
  MAJOR_CONCERN_REVIEW_PENDING: "Resolve the major reputation concern before finalizing this assessment.",
  METRIC_REVIEW_PENDING: "Review pending metric scores or clear their unverified values before finalizing.",
  EVALUATION_FINALIZE_CONFLICT: "The assessment changed while it was being finalized. Refresh and try again.",
  EVALUATION_FINALIZE_FAILED: "The assessment could not be finalized. Refresh and try again.",
  MODEL_VERSION_EXISTS: "That model version already exists and cannot be overwritten.",
  INVALID_RESEARCH_SOURCES: "Provide between 1 and 30 valid sources.",
  INVALID_ID: "The record ID is invalid.",
};

function localeFromCookie(cookie: string | null) {
  const value = cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith("site_locale="))?.slice("site_locale=".length);
  return value === "en" ? "en" : "zh";
}

export function errorResponse(error: unknown, locale: "zh" | "en" = "zh") {
  const english = locale === "en";
  if (error instanceof DatabaseConfigurationError) {
    return Response.json(
      {
        error: {
          code: "DATABASE_NOT_CONFIGURED",
          message: english ? englishErrorMessages.DATABASE_NOT_CONFIGURED : "尚未连接 Neon 数据库。复制 .env.example 为 .env.local，并填写数据库连接信息。",
        },
      },
      { status: 503 },
    );
  }

  if (error instanceof AppError) {
    return Response.json(
      {
        error: {
          code: error.code,
          message: english ? englishErrorMessages[error.code] ?? "The request could not be completed. Please try again." : error.message,
          ...(error.details?.diagnostic ? { diagnostic: error.details.diagnostic } : {}),
          ...(error.details ? { fields: english ? Object.fromEntries(Object.keys(error.details).filter((key) => key !== "diagnostic").map((key) => [key, "Please check this field."])) : Object.fromEntries(Object.entries(error.details).filter(([key]) => key !== "diagnostic")) } : {}),
        },
      },
      { status: error.status },
    );
  }

  const databaseCode =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";
  if (databaseCode === "23505") {
    return Response.json(
      { error: { code: "DUPLICATE_VALUE", message: english ? englishErrorMessages.DUPLICATE_VALUE : "该编码或唯一字段值已存在，请检查后重试。" } },
      { status: 409 },
    );
  }
  if (databaseCode === "23503") {
    return Response.json(
      { error: { code: "INVALID_RELATION", message: english ? englishErrorMessages.INVALID_RELATION : "关联记录不存在或仍被其他记录引用。" } },
      { status: 409 },
    );
  }

  return Response.json(
    {
      error: {
        code: "DATABASE_UNAVAILABLE",
        message: english ? englishErrorMessages.DATABASE_UNAVAILABLE : "暂时无法读取或保存 Neon 数据，请确认数据库连接和迁移状态后重试。",
      },
    },
    { status: 503 },
  );
}

export async function withApiErrors<T>(operation: () => Promise<T>, status = 200) {
  try {
    const requestHeaders = await headers();
    const cookie = requestHeaders.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`));
    if (!verifySessionToken(cookie?.slice(SESSION_COOKIE.length + 1))) throw new AppError("UNAUTHENTICATED", "请先登录管理员账号。", 401);
    const origin = requestHeaders.get("origin");
    if (origin) {
      const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
      let sourceHost = "";
      try { sourceHost = new URL(origin).host; } catch { /* rejected below */ }
      if (!host || sourceHost !== host) throw new AppError("INVALID_ORIGIN", "请求来源校验失败。", 403);
    }
    return successResponse(await operation(), status);
  } catch (error) {
    const requestHeaders = await headers();
    return errorResponse(error, localeFromCookie(requestHeaders.get("cookie")));
  }
}

export { localeFromCookie };
