import type { Metadata } from "next";
import { PlannedFeaturePage } from "@/components/planned-feature-page";

export const metadata: Metadata = { title: "模型参数" };

export default function ModelSettingsRoute() {
  return <PlannedFeaturePage section="配置" title="模型参数" description="管理用于分析任务的大模型连接配置。" />;
}
