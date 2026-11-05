import type { Metadata } from "next";
import { ModelConfigsPage } from "@/components/model-configs-page";
import { getRequestLocale } from "@/lib/i18n/server";
import { getLocaleMessages } from "@/lib/i18n/types";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return { title: getLocaleMessages(getRequestLocale((await params).locale)).modelConfigs.title };
}

export default function ModelSettingsRoute() {
  return <ModelConfigsPage />;
}
