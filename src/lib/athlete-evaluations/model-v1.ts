import type { EvaluationModel, EvaluationScenario } from "./types";

const chinaWeights = { D1: 20, D2: 20, D3: 15, D4: 20, D5: 15, D6: 10 } as const;

export const SES_V1_MODEL: EvaluationModel = {
  version: "ses-v1",
  scenarios: {
    "china-priority": chinaWeights,
    "north-america": { D1: 20, D2: 25, D3: 15, D4: 10, D5: 20, D6: 10 },
    "product-portfolio": { D1: 15, D2: 15, D3: 20, D4: 15, D5: 25, D6: 10 },
  },
  metricWeights: {
    D1: { performance_impact: 60, honors_key_role: 40 },
    D2: { search_attention: 35, social_reach_engagement: 40, media_exposure: 25 },
    D3: { play_style_distinctiveness: 40, visual_identity: 30, narrative_completeness: 30 },
    D4: { china_attention: 50, china_activities: 25, target_audience_fit: 25 },
    D5: { brand_platform_fit: 30, portfolio_whitespace: 40, product_differentiation: 30 },
    D6: { availability_sustainability: 35, verified_reputation_safety: 40, career_cooperation_feasibility: 25 },
  },
  thresholds: { L1: 45, L2: 55, L3: 70, L4: 85 },
  coverageFloor: 80,
  dimensionMinimumCoverage: 70,
  provisionalRequiredDimensions: ["D1", "D2", "D4", "D5"],
  hardGates: {
    storyDimensionMax: 3,
    attentionDimensionMax: 5,
    chinaMarketMinimum: 3,
    cappedLevel: "L2",
  },
};

export const SES_V1_SCENARIOS: EvaluationScenario[] = [
  { key: "china-priority", labelKey: "analysis.athleteModel.scenarios.china", weights: chinaWeights },
  {
    key: "north-america",
    labelKey: "analysis.athleteModel.scenarios.northAmerica",
    weights: SES_V1_MODEL.scenarios["north-america"],
  },
  {
    key: "product-portfolio",
    labelKey: "analysis.athleteModel.scenarios.productPortfolio",
    weights: SES_V1_MODEL.scenarios["product-portfolio"],
  },
];

export const METRIC_DEFINITION_KEYS = Object.fromEntries(
  Object.entries(SES_V1_MODEL.metricWeights).flatMap(([dimension, metrics]) =>
    Object.keys(metrics).map((key) => [key, dimension]),
  ),
) as Record<string, keyof typeof SES_V1_MODEL.metricWeights>;
