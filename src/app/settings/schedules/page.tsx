import type { Metadata } from "next";
import { PlannedFeaturePage } from "@/components/planned-feature-page";

export const metadata: Metadata = { title: "定时配置" };

export default function ScheduleSettingsRoute() {
  return <PlannedFeaturePage section="配置" title="定时配置" description="管理数据采集与定期刷新计划。" />;
}
