import "server-only";
import { notFound } from "next/navigation";
import { getLocaleMessages, isLocale, type Locale } from "./types";

export function getRequestLocale(value: string | undefined): Locale {
  if (!isLocale(value)) notFound();
  return value;
}

export { getLocaleMessages, isLocale };
