import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { LocaleProvider } from "@/lib/i18n/locale-provider";
import { getLocaleMessages, isLocale, type Locale } from "@/lib/i18n/types";
import { notFound } from "next/navigation";
import "../globals.css";

export function generateStaticParams() {
  return [{ locale: "zh" }, { locale: "en" }];
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = getLocaleMessages(locale);
  return {
    title: { default: `Nike & NBA · ${copy.nav.brandTitle}`, template: `%s · ${copy.nav.brandTitle}` },
    description: locale === "zh"
      ? "以 SPU/SKU 商品目录为基础的运动品牌商品数据平台。"
      : "A sports brand product data platform built around an SPU/SKU catalog.",
  };
}

export default async function RootLayout({ children, params }: Readonly<{ children: ReactNode; params: Promise<{ locale: string }> }>) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;
  return (
    <html lang={locale === "zh" ? "zh-Hans" : "en"}>
      <body>
        <LocaleProvider locale={locale}><AppShell>{children}</AppShell></LocaleProvider>
      </body>
    </html>
  );
}
