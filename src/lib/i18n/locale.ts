export type Locale = "zh" | "en";

export function isLocale(value: string | undefined): value is Locale {
  return value === "zh" || value === "en";
}
