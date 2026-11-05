import { getLocaleMessages, type Locale, type TranslationKey } from "./types";
import type { ProductFieldType } from "@/lib/products/types";

const builtInFieldKeys: Record<string, TranslationKey> = {
  spu_code: "fieldLabels.spu_code",
  name: "fieldLabels.name",
  brand: "fieldLabels.brand",
  category: "fieldLabels.category",
  sport: "fieldLabels.sport",
  series: "fieldLabels.series",
  product_line: "fieldLabels.product_line",
  target_audience: "fieldLabels.target_audience",
  primary_use: "fieldLabels.primary_use",
  release_date: "fieldLabels.release_date",
  description: "fieldLabels.description",
  official_url: "fieldLabels.official_url",
  image_url: "fieldLabels.image_url",
  sku_code: "fieldLabels.sku_code",
  spu_id: "fieldLabels.spu_id",
  color_name: "fieldLabels.color_name",
  color_code: "fieldLabels.color_code",
  size: "fieldLabels.size",
  size_system: "fieldLabels.size_system",
  width: "fieldLabels.width",
  gtin: "fieldLabels.gtin",
  mpn: "fieldLabels.mpn",
  launch_status: "fieldLabels.launch_status",
  signing_athlete: "fieldLabels.signing_athlete",
};

const serverErrors: Record<string, TranslationKey> = {
  INVALID_CREDENTIALS: "apiErrors.INVALID_CREDENTIALS",
  AUTH_NOT_CONFIGURED: "apiErrors.AUTH_NOT_CONFIGURED",
  UNAUTHENTICATED: "apiErrors.UNAUTHENTICATED",
  INVALID_ORIGIN: "apiErrors.INVALID_ORIGIN",
  DATABASE_NOT_CONFIGURED: "apiErrors.DATABASE_NOT_CONFIGURED",
  DATABASE_UNAVAILABLE: "apiErrors.DATABASE_UNAVAILABLE",
  DUPLICATE_VALUE: "apiErrors.DUPLICATE_VALUE",
  INVALID_RELATION: "apiErrors.INVALID_RELATION",
  INVALID_JSON: "apiErrors.INVALID_JSON",
  INVALID_LOCALE: "apiErrors.INVALID_LOCALE",
  INVALID_ID: "apiErrors.INVALID_ID",
  INVALID_STATUS: "apiErrors.INVALID_STATUS",
  INVALID_PAGINATION: "apiErrors.INVALID_PAGINATION",
  INVALID_LEVEL: "apiErrors.INVALID_LEVEL",
  VALIDATION_ERROR: "apiErrors.VALIDATION_ERROR",
  SPU_NOT_FOUND: "apiErrors.SPU_NOT_FOUND",
  SKU_NOT_FOUND: "apiErrors.SKU_NOT_FOUND",
  INVALID_FIELD_VALUE: "apiErrors.INVALID_FIELD_VALUE",
  INVALID_FIELD_TYPE: "apiErrors.INVALID_FIELD_TYPE",
  FIELD_NOT_ACTIVE: "apiErrors.FIELD_NOT_ACTIVE",
  REQUIRED_FIELD: "apiErrors.REQUIRED_FIELD",
  DUPLICATE_FIELD_VALUE: "apiErrors.DUPLICATE_FIELD_VALUE",
  FIELD_NOT_FOUND: "apiErrors.FIELD_NOT_FOUND",
  SYSTEM_FIELD_LOCKED: "apiErrors.SYSTEM_FIELD_LOCKED",
  FIELD_TYPE_HAS_VALUES: "apiErrors.FIELD_TYPE_HAS_VALUES",
  FIELD_VALUES_NOT_UNIQUE: "apiErrors.FIELD_VALUES_NOT_UNIQUE",
  MODEL_TEST_FAILED: "apiErrors.MODEL_TEST_FAILED",
  INVALID_MODEL_CONFIG: "apiErrors.INVALID_MODEL_CONFIG",
  MODEL_CONFIG_NOT_FOUND: "apiErrors.MODEL_CONFIG_NOT_FOUND",
  MODEL_ENCRYPTION_NOT_CONFIGURED: "apiErrors.MODEL_ENCRYPTION_NOT_CONFIGURED",
  LOGIN_RATE_LIMITED: "apiErrors.LOGIN_RATE_LIMITED",
  UNSAFE_MODEL_URL: "apiErrors.UNSAFE_MODEL_URL",
  PARENT_ARCHIVED: "apiErrors.PARENT_ARCHIVED",
  SPU_ALREADY_ARCHIVED: "apiErrors.SPU_ALREADY_ARCHIVED",
  SPU_NOT_ARCHIVED: "apiErrors.SPU_NOT_ARCHIVED",
  SKU_ALREADY_ARCHIVED: "apiErrors.SKU_ALREADY_ARCHIVED",
  SKU_NOT_ARCHIVED: "apiErrors.SKU_NOT_ARCHIVED",
  REQUEST_FAILED: "apiErrors.REQUEST_FAILED",
};

const fieldErrorKeys: Record<string, TranslationKey> = {
  "请填写 SPU 编码。": "fieldErrors.spuCodeRequired",
  "SPU 编码不能超过 120 个字符。": "fieldErrors.spuCodeTooLong",
  "请填写商品名称。": "fieldErrors.productNameRequired",
  "商品名称不能超过 240 个字符。": "fieldErrors.productNameTooLong",
  "请填写品牌。": "fieldErrors.brandRequired",
  "请填写 SKU 编码。": "fieldErrors.skuCodeRequired",
  "SKU 编码不能超过 120 个字符。": "fieldErrors.skuCodeTooLong",
  "请填写 SKU 变体名称。": "fieldErrors.skuNameRequired",
  "SKU 名称不能超过 240 个字符。": "fieldErrors.skuNameTooLong",
  "搜索内容不能超过 120 个字符。": "fieldErrors.queryTooLong",
  "签约明星名称不能超过 120 个字符。": "fieldErrors.athleteTooLong",
  "请填写字段名称。": "fieldErrors.fieldNameRequired",
  "字段名称不能超过 120 个字符。": "fieldErrors.fieldNameTooLong",
  "字段编码至少需要 2 个字符。": "fieldErrors.fieldKeyTooShort",
  "字段编码不能超过 80 个字符。": "fieldErrors.fieldKeyTooLong",
  "字段编码只支持小写英文、数字和下划线，并以英文开头。": "fieldErrors.fieldKeyFormat",
  "单选和多选字段至少需要一个选项。": "fieldErrors.optionsRequired",
  "只有单选和多选字段可以配置选项。": "fieldErrors.optionsUnsupported",
  "选项不能重复。": "fieldErrors.optionsDuplicate",
  "多选字段不支持设置唯一值。": "fieldErrors.multiselectUnique",
  "请填写名称。": "fieldErrors.configNameRequired",
  "请填写模型名称。": "fieldErrors.modelNameRequired",
  "新建配置需要 API Key。": "fieldErrors.apiKeyRequired",
  "此字段为必填项": "fieldErrors.required",
  "格式不正确": "fieldErrors.invalidFormat",
  "内容过长": "fieldErrors.tooLong",
  "链接格式不正确": "fieldErrors.invalidUrl",
  "请选择有效选项": "fieldErrors.invalidOption",
  "请输入有效数字": "fieldErrors.invalidNumber",
  "请选择是或否": "fieldErrors.invalidBoolean",
  "日期格式不正确": "fieldErrors.invalidDate",
  "类型不支持": "fieldErrors.unsupportedType",
  "字段已不可用": "fieldErrors.inactive",
  "该值已被其他商品使用": "fieldErrors.duplicate",
  "字段层级无效": "fieldErrors.invalidLevel",
  "字段已有数据": "fieldErrors.existingValue",
  "请输入有效名称": "fieldErrors.invalidName",
  "请输入有效的接口地址": "fieldErrors.invalidEndpoint",
  "请输入有效密钥": "fieldErrors.invalidKey",
};

export function translatedFieldLabel(key: string, label: string, t: (key: TranslationKey) => string) {
  const translation = builtInFieldKeys[key];
  return translation ? t(translation) : label;
}

export function translatedFieldError(message: string, t: (key: TranslationKey) => string) {
  const translation = fieldErrorKeys[message];
  if (translation) return t(translation);
  const tooLong = message.match(/不能超过\s*(\d+)\s*个字符/);
  if (tooLong) return t("fieldErrors.tooLongLimit").replace("{count}", tooLong[1]);
  return t("fieldErrors.invalidValue");
}

export function translatedApiError(error: unknown, locale: Locale) {
  const messages = getLocaleMessages(locale);
  const candidate = error as { code?: unknown; message?: unknown } | null;
  const code = typeof candidate?.code === "string" ? candidate.code : "REQUEST_FAILED";
  const key = serverErrors[code] ?? "apiErrors.REQUEST_FAILED";
  const copy = key.split(".").reduce<unknown>((current, part) => {
    if (typeof current !== "object" || current === null) return undefined;
    return (current as Record<string, unknown>)[part];
  }, messages);
  return typeof copy === "string" ? copy : messages.common.unknownError;
}

export function formatLocaleNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "zh-CN").format(value);
}

export function formatProductValue(value: unknown, locale: Locale, empty = "—", type?: ProductFieldType) {
  if (value === null || value === undefined || value === "") return empty;
  if (typeof value === "boolean") return value ? (locale === "en" ? "Yes" : "是") : (locale === "en" ? "No" : "否");
  if (typeof value === "number") return formatLocaleNumber(value, locale);
  if (type === "date" && typeof value === "string") return formatLocaleDate(value, locale, { dateStyle: "medium" });
  if (Array.isArray(value)) return value.map(String).join(locale === "en" ? ", " : "、") || empty;
  return String(value);
}

export function formatLocaleDate(value: string | Date, locale: Locale, options: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", { timeZone: "UTC", ...options }).format(date);
}
