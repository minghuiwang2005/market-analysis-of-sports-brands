import type { Metadata } from "next";
import { ModelFieldsPage } from "@/components/model-fields-page";
import { getRequestLocale } from "@/lib/i18n/server";
import { getLocaleMessages } from "@/lib/i18n/types";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return { title: getLocaleMessages(getRequestLocale((await params).locale)).modelFields.title };
}

export default function ProductModelRoute() {
  return <ModelFieldsPage />;
}
