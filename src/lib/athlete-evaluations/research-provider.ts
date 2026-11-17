import "server-only";
import type { Locale } from "@/lib/i18n/locale";
import type { ResearchSource } from "./types";

export type ResearchSearchRequest = {
  name: string;
  asOfDate: string;
  market: "china" | "north-america";
  locale: Locale;
};

export interface ResearchProvider {
  search(request: ResearchSearchRequest): Promise<Omit<ResearchSource, "id" | "status" | "eligibleForScore" | "metricKey">[]>;
}

// LLM model configuration is not a web-search credential. Return no provider
// until a search vendor and credentials are explicitly configured.
export function getResearchProvider(): ResearchProvider | null {
  return null;
}
