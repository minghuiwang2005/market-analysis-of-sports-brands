import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Fieldnote · 运动品牌研究工作台",
    template: "%s · Fieldnote",
  },
  description: "以 SPU/SKU 商品目录为基础的运动品牌研究工作台。",
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
