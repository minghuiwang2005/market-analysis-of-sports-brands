import { messages as enMessages } from "./messages/en";
import { messages as zhMessages } from "./messages/zh";
import type { Locale } from "./locale";
export { isLocale, type Locale } from "./locale";
type WidenMessageStrings<T> = {
  [K in keyof T]: T[K] extends string
    ? string
    : T[K] extends Record<string, unknown>
      ? WidenMessageStrings<T[K]>
      : never;
};
export type MessageTree = WidenMessageStrings<typeof zhMessages>;

type MessageKey<T> = {
  [K in keyof T & string]: T[K] extends string
    ? K
    : T[K] extends Record<string, unknown>
      ? `${K}.${MessageKey<T[K]>}`
      : never;
}[keyof T & string];

export type TranslationKey = MessageKey<MessageTree>;

export function getLocaleMessages(locale: Locale): MessageTree {
  return locale === "en" ? enMessages : zhMessages;
}
