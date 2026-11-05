"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useLocale } from "./locale-provider";

type LocaleLinkProps = Omit<ComponentProps<typeof Link>, "href" | "as"> & { href: string };

function localizedHref(href: string, locale: string) {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const url = new URL(href, "https://locale.invalid");
  const prefix = `/${locale}`;
  const pathname = url.pathname === "/" ? prefix : `${prefix}${url.pathname}`;
  return `${pathname}${url.search}${url.hash}`;
}

export function LocaleLink({ href, ...props }: LocaleLinkProps) {
  const { locale } = useLocale();
  return <Link href={localizedHref(href, locale)} as={href} {...props} />;
}
