import { AppError, readJson, withApiErrors } from "@/lib/api-response";
import { archiveSku, updateSku } from "@/lib/products/product-service";
import { getSkuDetail } from "@/lib/products/product-queries";
import { validateEntityId } from "@/lib/products/product-validation";

type RouteContext = { params: Promise<{ skuId: string }> };

function recordStatus(request: Request): "active" | "archived" | undefined {
  const status = new URL(request.url).searchParams.get("status");
  if (status === null) return undefined;
  if (status !== "active" && status !== "archived") throw new AppError("INVALID_STATUS", "记录状态无效。", 422);
  return status;
}

export async function GET(request: Request, context: RouteContext) {
  return withApiErrors(async () => {
    const { skuId } = await context.params;
    return getSkuDetail(validateEntityId(skuId, "SKU"), recordStatus(request));
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  return withApiErrors(async () => {
    const { skuId } = await context.params;
    return updateSku(validateEntityId(skuId, "SKU"), await readJson(request));
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  return withApiErrors(async () => {
    const { skuId } = await context.params;
    return archiveSku(validateEntityId(skuId, "SKU"));
  });
}
