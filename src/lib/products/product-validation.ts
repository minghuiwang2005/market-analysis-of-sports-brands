import "server-only";
import { z } from "zod";
import { AppError } from "@/lib/api-response";
import type { ModelFieldDto, ProductLevel } from "@/lib/products/types";

const valuesSchema = z.record(z.string(), z.unknown()).default({});

export const createSpuSchema = z.object({
  spuCode: z.string().trim().min(1, "请填写 SPU 编码。").max(120, "SPU 编码不能超过 120 个字符。"),
  name: z.string().trim().min(1, "请填写商品名称。").max(240, "商品名称不能超过 240 个字符。"),
  brand: z.string().trim().min(1, "请填写品牌。").max(120, "品牌不能超过 120 个字符。"),
  values: valuesSchema,
});

export const createSkuSchema = z.object({
  skuCode: z.string().trim().min(1, "请填写 SKU 编码。").max(120, "SKU 编码不能超过 120 个字符。"),
  name: z.string().trim().min(1, "请填写 SKU 变体名称。").max(240, "SKU 名称不能超过 240 个字符。"),
  values: valuesSchema,
});

const listQuerySchema = z.object({
  q: z.string().trim().max(120, "搜索内容不能超过 120 个字符。").default(""),
  brand: z.string().trim().max(120).default(""),
  sport: z.string().trim().max(120).default(""),
  category: z.string().trim().max(120).default(""),
  status: z.enum(["active", "archived"]).default("active"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export function parseRequest<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (parsed.success) return parsed.data;
  const details = Object.fromEntries(
    parsed.error.issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message]),
  );
  throw new AppError("VALIDATION_ERROR", "请检查输入内容。", 422, details);
}

export function parseSpuInput(input: unknown) {
  return parseRequest(createSpuSchema, input);
}

export function parseSkuInput(input: unknown) {
  return parseRequest(createSkuSchema, input);
}

export function parseListQuery(searchParams: URLSearchParams) {
  return parseRequest(listQuerySchema, {
    q: searchParams.get("q") ?? "",
    brand: searchParams.get("brand") ?? "",
    sport: searchParams.get("sport") ?? "",
    category: searchParams.get("category") ?? "",
    status: searchParams.get("status") ?? "active",
    page: searchParams.get("page") ?? "1",
    pageSize: searchParams.get("pageSize") ?? "20",
  });
}

export function validateEntityId(value: string, label = "商品") {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new AppError("INVALID_ID", `${label}编号无效。`, 422);
  }
  return value;
}

function emptyValue(value: unknown) {
  return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
}

function normalizeValue(field: ModelFieldDto, value: unknown): unknown {
  if (emptyValue(value)) return null;

  if (["short_text", "long_text", "url", "select"].includes(field.type)) {
    if (typeof value !== "string") throw new AppError("INVALID_FIELD_VALUE", `${field.label}需要填写文本。`, 422, { [field.key]: "格式不正确" });
    const normalized = value.trim();
    if (!normalized) return null;
    if (field.type === "short_text" && normalized.length > 1000) throw new AppError("INVALID_FIELD_VALUE", `${field.label}不能超过 1000 个字符。`, 422, { [field.key]: "内容过长" });
    if (field.type === "long_text" && normalized.length > 10000) throw new AppError("INVALID_FIELD_VALUE", `${field.label}不能超过 10000 个字符。`, 422, { [field.key]: "内容过长" });
    if (field.type === "url") {
      try {
        const url = new URL(normalized);
        if (!new Set(["http:", "https:"]).has(url.protocol)) throw new Error();
      } catch {
        throw new AppError("INVALID_FIELD_VALUE", `${field.label}需要有效的 http 或 https 链接。`, 422, { [field.key]: "链接格式不正确" });
      }
    }
    if (field.type === "select" && !field.options.includes(normalized)) {
      throw new AppError("INVALID_FIELD_VALUE", `${field.label}的值不在可选项中。`, 422, { [field.key]: "请选择有效选项" });
    }
    return normalized;
  }

  if (field.type === "number") {
    const number = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
    if (!Number.isFinite(number)) throw new AppError("INVALID_FIELD_VALUE", `${field.label}需要有效数字。`, 422, { [field.key]: "请输入有效数字" });
    return number;
  }

  if (field.type === "boolean") {
    if (typeof value !== "boolean") throw new AppError("INVALID_FIELD_VALUE", `${field.label}需要选择是或否。`, 422, { [field.key]: "请选择是或否" });
    return value;
  }

  if (field.type === "date") {
    const parsedDate = typeof value === "string" ? new Date(`${value}T00:00:00Z`) : null;
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== value) {
      throw new AppError("INVALID_FIELD_VALUE", `${field.label}需要有效日期。`, 422, { [field.key]: "日期格式不正确" });
    }
    return value;
  }

  if (field.type === "multiselect") {
    if (!Array.isArray(value) || !value.every((item) => typeof item === "string" && field.options.includes(item))) {
      throw new AppError("INVALID_FIELD_VALUE", `${field.label}包含无效选项。`, 422, { [field.key]: "请选择有效选项" });
    }
    return [...new Set(value)];
  }

  throw new AppError("INVALID_FIELD_TYPE", "字段类型暂不支持。", 422, { [field.key]: "类型不支持" });
}

export function validateCustomValues(
  level: ProductLevel,
  fields: ModelFieldDto[],
  input: Record<string, unknown>,
  existing: Record<string, unknown> = {},
) {
  const customFields = fields.filter((field) => field.level === level && !field.isSystem && !field.archivedAt);
  const allowed = new Set(customFields.map((field) => field.key));
  const unknownKeys = Object.keys(input).filter((key) => !allowed.has(key));
  if (unknownKeys.length) {
    throw new AppError("FIELD_NOT_ACTIVE", "表单包含已归档或不属于该层级的字段，请刷新后重试。", 409, { [unknownKeys[0]]: "字段已不可用" });
  }

  const normalized: Record<string, unknown> = {};
  const providedKeys = new Set(Object.keys(input));
  for (const field of customFields) {
    const wasProvided = providedKeys.has(field.key);
    const candidate = wasProvided ? input[field.key] : existing[field.key];
    const value = normalizeValue(field, candidate);
    if (field.required && value === null) {
      throw new AppError("REQUIRED_FIELD", `请填写“${field.label}”。`, 422, { [field.key]: "此字段为必填项" });
    }
    if (wasProvided) normalized[field.key] = value;
  }
  return normalized;
}
