import { readJson, withApiErrors } from "@/lib/api-response";
import { AppError } from "@/lib/api-response";
import { createSku } from "@/lib/products/product-service";
import { listSpuSkus } from "@/lib/products/product-queries";
import { validateEntityId } from "@/lib/products/product-validation";

type RouteContext = { params: Promise<{ spuId: string }> };

function pageNumber(raw: string | null, fallback: number, key: string) {
  if (raw === null) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) throw new AppError("INVALID_PAGINATION", `分页参数 ${key} 无效。`, 422);
  return value;
}

export async function GET(request: Request, context: RouteContext) {
  return withApiErrors(async () => {
    const { spuId } = await context.params;
    const params = new URL(request.url).searchParams;
    const statusValue = params.get("status") ?? "active";
    if (statusValue !== "active" && statusValue !== "archived") throw new AppError("INVALID_STATUS", "记录状态无效。", 422);
    const page = pageNumber(params.get("page"), 1, "page");
    const pageSize = Math.min(50, pageNumber(params.get("pageSize"), 50, "pageSize"));
    return listSpuSkus(validateEntityId(spuId, "SPU"), statusValue, page, pageSize);
  });
}

export async function POST(request: Request, context: RouteContext) {
  return withApiErrors(async () => {
    const { spuId } = await context.params;
    return createSku(validateEntityId(spuId, "SPU"), await readJson(request));
  }, 201);
}
