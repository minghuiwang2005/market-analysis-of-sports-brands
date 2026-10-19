import type { Metadata } from "next";
import { ProductsPage } from "@/components/products-page";

export const metadata: Metadata = { title: "商品数据" };

export default function ProductDataRoute() {
  return <ProductsPage />;
}
