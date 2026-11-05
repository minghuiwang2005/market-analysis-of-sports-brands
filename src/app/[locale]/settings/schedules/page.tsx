import { PlannedFeaturePage } from "@/components/planned-feature-page";
import { getLocaleMessages } from "@/lib/i18n/types";
import { getRequestLocale } from "@/lib/i18n/server";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = getRequestLocale((await params).locale);
  return { title: getLocaleMessages(locale).schedules.title };
}

export default async function ScheduleSettingsRoute({ params }: { params: Promise<{ locale: string }> }) {
  getRequestLocale((await params).locale);
  return <PlannedFeaturePage section="schedules.section" title="schedules.title" description="schedules.description" />;
}
