import type { Metadata } from "next";
import { ProductDetailPage } from "@/components/product-detail-page";
import { getRequestLocale } from "@/lib/i18n/server";
import { getLocaleMessages } from "@/lib/i18n/types";

export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return { title: getLocaleMessages(getRequestLocale((await params).locale)).productDetail.heading };
}

export default async function ProductDetailRoute({ params }: { params: Promise<{ locale: string; spuId: string }> }) {
  const { spuId } = await params;
  return <ProductDetailPage spuId={spuId} />;
}
