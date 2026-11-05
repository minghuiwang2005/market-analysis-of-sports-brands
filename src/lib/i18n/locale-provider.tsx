"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { getLocaleMessages } from "./types";
import type { Locale, TranslationKey } from "./types";

type LocaleContextValue = {
  locale: Locale;
  t: (key: TranslationKey) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const messages = getLocaleMessages(locale);
  const t = useCallback((key: TranslationKey) => {
    const value = key.split(".").reduce<unknown>((current, part) => {
      if (typeof current !== "object" || current === null) return undefined;
      return (current as Record<string, unknown>)[part];
    }, messages);
    return typeof value === "string" ? value : key;
  }, [messages]);
  const value = useMemo(() => ({ locale, t }), [locale, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used inside LocaleProvider");
  return context;
}
