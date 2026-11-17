export const EVALUATION_DIMENSIONS = ["D1", "D2", "D3", "D4", "D5", "D6"] as const;

export type EvaluationDimensionKey = (typeof EVALUATION_DIMENSIONS)[number];
export type EvaluationLevel = "L0" | "L1" | "L2" | "L3" | "L4";
export type EvaluationScenarioKey = "china-priority" | "north-america" | "product-portfolio";
export type MetricStatus = "verified" | "needs_review" | "missing" | "conflict";
export type EvaluationEligibility = "eligible" | "blocked" | "review_required";

export type MetricInput = {
  key: string;
  rawValue: string | number | boolean | null;
  normalizedScore: number | null;
  unit: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  status: MetricStatus;
  rationale?: string | null;
};

export type ScoringInput = {
  metrics: MetricInput[];
  competitorExclusive: boolean | null;
  majorConcernNeedsReview: boolean;
};

export type EvaluationThresholds = {
  L1: number;
  L2: number;
  L3: number;
  L4: number;
};

export type EvaluationModel = {
  version: string;
  scenarios: Record<EvaluationScenarioKey, Record<EvaluationDimensionKey, number>>;
  metricWeights: Record<EvaluationDimensionKey, Record<string, number>>;
  thresholds: EvaluationThresholds;
  coverageFloor: number;
  dimensionMinimumCoverage: number;
  provisionalRequiredDimensions: EvaluationDimensionKey[];
  hardGates: {
    storyDimensionMax: number;
    attentionDimensionMax: number;
    chinaMarketMinimum: number;
    cappedLevel: EvaluationLevel;
  };
};

export type EvaluationResult = {
  status: "complete" | "provisional" | "insufficient_data";
  ses: number | null;
  coverage: number;
  dimensions: Record<EvaluationDimensionKey, number | null>;
  baseLevel: EvaluationLevel | null;
  recommendedLevel: EvaluationLevel | null;
  eligibility: EvaluationEligibility;
  gates: string[];
  sensitivity: Record<EvaluationScenarioKey, number | null>;
};

export type EvaluationDraft = {
  runId: string;
  workflowState: "draft";
  preview: EvaluationResult;
};

export type ResearchSource = {
  id?: string;
  metricKey?: string;
  url: string;
  publisher: string;
  title: string;
  publishedAt: string | null;
  excerpt: string;
  status: "suggested" | "verified" | "rejected";
  eligibleForScore?: boolean;
  claimScope?: string;
};

export type EvaluationDetail = EvaluationResult & {
  runId: string;
  workflowState: "draft" | "finalized";
  modelVersion: string;
  scenarioKey: EvaluationScenarioKey;
  market: "china" | "north-america";
  asOfDate: string;
  athleteId: string | null;
  candidateName: string;
  metrics: MetricInput[];
  sources: ResearchSource[];
  profileSources: ResearchSource[];
  productPortfolio: AthletePortfolioSummary | null;
  eligibilityEvidence: {
    competitorExclusive: boolean | null;
    competitorSourceIds: string[];
    majorConcernNeedsReview: boolean;
    majorConcernSourceIds: string[];
  };
};

export type EvaluationCreationInput = {
  athleteId?: string;
  candidateName: string;
  asOfDate: string;
  market: "china" | "north-america";
  scenarioKey: EvaluationScenarioKey;
};

export type EvaluationMetricUpdate = {
  metricKey: string;
  rawValue: string | number | boolean | null;
  normalizedScore: number | null;
  unit: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  rationale: string;
  status: MetricStatus;
  sourceIds: string[];
  eligibilityEvidence?: {
    competitorExclusive: boolean | null;
    competitorSourceIds: string[];
    majorConcernNeedsReview: boolean;
    majorConcernSourceIds: string[];
  };
};

export type EvaluationEligibilityUpdate = {
  competitorExclusive: boolean | null;
  competitorSourceIds: string[];
  majorConcernNeedsReview: boolean;
  majorConcernSourceIds: string[];
};

export type EvaluationListItem = {
  runId: string;
  athleteId: string | null;
  candidateName: string;
  ses: number | null;
  status: EvaluationResult["status"];
  coverage: number;
  eligibility: EvaluationEligibility;
  baseLevel: EvaluationLevel | null;
  recommendedLevel: EvaluationLevel | null;
  scenarioKey: EvaluationScenarioKey;
  asOfDate: string;
  modelVersion: string;
  workflowState: "draft" | "finalized";
};

export type EvaluationListResult = {
  items: EvaluationListItem[];
  total: number;
};

export type AthletePortfolioRecords = {
  lines: {
    lineName: string;
    relationshipType: "signature" | "endorsement";
    relationshipStatus: "current" | "historical";
    startedYear: number | null;
    endedYear: number | null;
    models: {
      spuId: string;
      spuName: string;
      tier: string | null;
      launchMarket: string | null;
      launchMarketVerified?: boolean;
      releaseYear: number | null;
      skuCount: number;
      skuDetails?: { tier: string | null; launchMarket: string | null; launchMarketVerified: boolean; colorName: string | null }[];
      prices: { amount: string; currency: string; priceBasis: string; observedAt: string; sourceUrl: string; sourceType: string; market: string | null; evidence: string | null }[];
      availability: { status: string; observedAt: string; sourceUrl: string; sourceType: string; market: string | null; evidence: string | null }[];
    }[];
  }[];
};

export type AthletePortfolioSummary = {
  lineCount: number;
  modelCount: number;
  skuCount: number;
  countsByTier: Record<string, number>;
  modelCountsByTier: Record<string, number>;
  skuCountsByTier: Record<string, number>;
  modelTierCoverage: { classifiedModels: number; totalModels: number; percentage: number | null };
  skuTierCoverage: { classifiedSkus: number; totalSkus: number; percentage: number | null };
  releaseYearCadence: { year: number; modelCount: number }[];
  regionalModelShare: number | null;
  launchMarketCoverage: { classifiedSkus: number; totalSkus: number; percentage: number | null };
  colorwayCoverage: { classifiedSkus: number; totalSkus: number; percentage: number | null; uniqueColorways: number };
  observationCoverage: { modelCount: number; modelsWithPrices: number; modelsWithAvailability: number; pricePercentage: number | null; availabilityPercentage: number | null };
  observedPriceCount: number;
  observedAvailabilityCount: number;
  lines: AthletePortfolioRecords["lines"];
};

export type AthleteEvaluationFilters = {
  search?: string;
  level?: EvaluationLevel | "all";
  status?: EvaluationResult["status"] | "all";
  scenarioKey?: EvaluationScenarioKey | "all";
  workflowState?: "draft" | "finalized" | "all";
  limit?: number;
  offset?: number;
};

export type EvaluationScenario = {
  key: EvaluationScenarioKey;
  labelKey: string;
  weights: Record<EvaluationDimensionKey, number>;
};
