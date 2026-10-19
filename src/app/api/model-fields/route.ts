import { AppError, readJson, withApiErrors } from "@/lib/api-response";
import { createModelField, listModelFields } from "@/lib/products/model-field-service";
import type { ProductLevel } from "@/lib/products/types";

export async function GET(request: Request) {
  return withApiErrors(async () => {
    const url = new URL(request.url);
    const level = url.searchParams.get("level");
    if (level !== "spu" && level !== "sku") {
      throw new AppError("INVALID_LEVEL", "请选择 SPU 或 SKU 字段层级。", 422, { level: "字段层级无效" });
    }
    return listModelFields(level as ProductLevel, url.searchParams.get("includeArchived") === "true");
  });
}

export async function POST(request: Request) {
  return withApiErrors(async () => createModelField(await readJson(request)), 201);
}
