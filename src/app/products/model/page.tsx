import type { Metadata } from "next";
import { ModelFieldsPage } from "@/components/model-fields-page";

export const metadata: Metadata = { title: "商品模型" };

export default function ProductModelRoute() {
  return <ModelFieldsPage />;
}
