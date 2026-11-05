import type { Metadata } from "next";
import { ProductsPage } from "@/components/products-page";
import { getRequestLocale } from "@/lib/i18n/server";
import { getLocaleMessages } from "@/lib/i18n/types";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return { title: getLocaleMessages(getRequestLocale((await params).locale)).products.title };
}

export default function ProductDataRoute() {
  return <ProductsPage />;
}
