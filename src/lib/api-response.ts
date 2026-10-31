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

export function errorResponse(error: unknown) {
  if (error instanceof DatabaseConfigurationError) {
    return Response.json(
      {
        error: {
          code: "DATABASE_NOT_CONFIGURED",
          message: "尚未连接 Neon 数据库。复制 .env.example 为 .env.local，并填写数据库连接信息。",
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
          message: error.message,
          ...(error.details ? { fields: error.details } : {}),
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
      { error: { code: "DUPLICATE_VALUE", message: "该编码或唯一字段值已存在，请检查后重试。" } },
      { status: 409 },
    );
  }
  if (databaseCode === "23503") {
    return Response.json(
      { error: { code: "INVALID_RELATION", message: "关联记录不存在或仍被其他记录引用。" } },
      { status: 409 },
    );
  }

  return Response.json(
    {
      error: {
        code: "DATABASE_UNAVAILABLE",
        message: "暂时无法读取或保存 Neon 数据，请确认数据库连接和迁移状态后重试。",
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
    return errorResponse(error);
  }
}
