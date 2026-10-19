import { readJson, withApiErrors } from "@/lib/api-response";
import { createSpu } from "@/lib/products/product-service";
import { listSpus } from "@/lib/products/product-queries";
import { parseListQuery } from "@/lib/products/product-validation";

export async function GET(request: Request) {
  return withApiErrors(() => listSpus(parseListQuery(new URL(request.url).searchParams)));
}

export async function POST(request: Request) {
  return withApiErrors(async () => createSpu(await readJson(request)), 201);
}
