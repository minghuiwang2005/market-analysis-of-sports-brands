import type { Metadata } from "next";
import { PlannedFeaturePage } from "@/components/planned-feature-page";

export const metadata: Metadata = { title: "数据分析" };

export default function AnalysisRoute() {
  return <PlannedFeaturePage section="分析" title="数据分析" description="基于商品与销售数据进行品牌、系列和市场对比。" />;
}
