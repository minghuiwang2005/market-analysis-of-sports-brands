import { AppError, readJson, withApiErrors } from "@/lib/api-response";
import { archiveSpu, updateSpu } from "@/lib/products/product-service";
import { getSpuDetail } from "@/lib/products/product-queries";
import { validateEntityId } from "@/lib/products/product-validation";

type RouteContext = { params: Promise<{ spuId: string }> };

function recordStatus(request: Request): "active" | "archived" | undefined {
  const status = new URL(request.url).searchParams.get("status");
  if (status === null) return undefined;
  if (status !== "active" && status !== "archived") throw new AppError("INVALID_STATUS", "记录状态无效。", 422);
  return status;
}

export async function GET(request: Request, context: RouteContext) {
  return withApiErrors(async () => {
    const { spuId } = await context.params;
    return getSpuDetail(validateEntityId(spuId, "SPU"), recordStatus(request));
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  return withApiErrors(async () => {
    const { spuId } = await context.params;
    return updateSpu(validateEntityId(spuId, "SPU"), await readJson(request));
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  return withApiErrors(async () => {
    const { spuId } = await context.params;
    return archiveSpu(validateEntityId(spuId, "SPU"));
  });
}
