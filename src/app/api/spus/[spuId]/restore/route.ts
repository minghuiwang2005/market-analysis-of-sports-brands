import { withApiErrors } from "@/lib/api-response";
import { restoreSpu } from "@/lib/products/product-service";
import { validateEntityId } from "@/lib/products/product-validation";

type RouteContext = { params: Promise<{ spuId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  return withApiErrors(async () => {
    const { spuId } = await context.params;
    return restoreSpu(validateEntityId(spuId, "SPU"));
  });
}
