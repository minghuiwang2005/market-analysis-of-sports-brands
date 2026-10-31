import type { Metadata } from "next";
import { PlannedFeaturePage } from "@/components/planned-feature-page";

export const metadata: Metadata = { title: "销售数据" };

export default function SalesDataRoute() {
  return <PlannedFeaturePage section="商品" title="销售数据" description="集中查看商品销售记录与渠道表现。" />;
}
