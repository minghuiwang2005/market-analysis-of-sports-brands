import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Nike & NBA · 商品数据平台",
    template: "%s · 商品数据平台",
  },
  description: "以 SPU/SKU 商品目录为基础的运动品牌商品数据平台。",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-Hans">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
