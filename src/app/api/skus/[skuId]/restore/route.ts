import { withApiErrors } from "@/lib/api-response";
import { restoreSku } from "@/lib/products/product-service";
import { validateEntityId } from "@/lib/products/product-validation";

type RouteContext = { params: Promise<{ skuId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  return withApiErrors(async () => {
    const { skuId } = await context.params;
    return restoreSku(validateEntityId(skuId, "SKU"));
  });
}
