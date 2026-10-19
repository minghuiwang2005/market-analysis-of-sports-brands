import { readJson, withApiErrors } from "@/lib/api-response";
import { createSku } from "@/lib/products/product-service";
import { validateEntityId } from "@/lib/products/product-validation";

type RouteContext = { params: Promise<{ spuId: string }> };

export async function POST(request: Request, context: RouteContext) {
  return withApiErrors(async () => {
    const { spuId } = await context.params;
    return createSku(validateEntityId(spuId, "SPU"), await readJson(request));
  }, 201);
}
