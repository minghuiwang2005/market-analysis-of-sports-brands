import type { Metadata } from "next";
import { ModelConfigsPage } from "@/components/model-configs-page";

export const metadata: Metadata = { title: "模型参数" };

export default function ModelSettingsRoute() {
  return <ModelConfigsPage />;
}
