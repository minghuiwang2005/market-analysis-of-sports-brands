import { SES_V1_MODEL } from "./model-v1";
import { evaluateEligibility, limitRecommendedLevel, resolveEvaluationLevel } from "./eligibility";
import {
  EVALUATION_DIMENSIONS,
  type EvaluationDimensionKey,
  type EvaluationModel,
  type EvaluationResult,
  type EvaluationScenarioKey,
  type MetricInput,
  type ScoringInput,
} from "./types";

const SCORE_SCALE = 10;
const DISPLAY_DECIMALS = 2;

function roundScore(value: number): number {
  const factor = 10 ** DISPLAY_DECIMALS;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function verifiedMetrics(metrics: MetricInput[]) {
  return new Map(
    metrics
      .filter((metric) => metric.status === "verified" && metric.normalizedScore !== null)
      .filter((metric) => Number.isFinite(metric.normalizedScore) && metric.normalizedScore! >= 0 && metric.normalizedScore! <= SCORE_SCALE)
      .map((metric) => [metric.key, metric.normalizedScore!]),
  );
}

function getDimensionScores(metrics: MetricInput[], model: EvaluationModel) {
  const scores = {} as Record<EvaluationDimensionKey, number | null>;
  const values = verifiedMetrics(metrics);

  for (const dimension of EVALUATION_DIMENSIONS) {
    const weights = model.metricWeights[dimension];
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    const available = Object.entries(weights).filter(([key]) => values.has(key));
    const availableWeight = available.reduce((sum, [, weight]) => sum + weight, 0);
    if (totalWeight <= 0 || availableWeight / totalWeight < model.dimensionMinimumCoverage / 100) {
      scores[dimension] = null;
      continue;
    }

    const weightedScore = available.reduce((sum, [key, weight]) => sum + values.get(key)! * weight, 0);
    scores[dimension] = weightedScore / availableWeight;
  }

  return scores;
}

function calculateWeightedTotal(
  dimensions: Record<EvaluationDimensionKey, number | null>,
  weights: Record<EvaluationDimensionKey, number>,
  coverageFloor: number,
  requiredDimensions: EvaluationDimensionKey[],
) {
  const coverage = EVALUATION_DIMENSIONS.reduce((sum, key) => sum + (dimensions[key] === null ? 0 : weights[key]), 0);
  const requiredAvailable = requiredDimensions.every((key) => dimensions[key] !== null);
  if (coverage < coverageFloor || !requiredAvailable) return { coverage, score: null };

  const weightedSum = EVALUATION_DIMENSIONS.reduce((sum, key) => {
    const value = dimensions[key];
    return value === null ? sum : sum + value * weights[key];
  }, 0);
  return { coverage, score: weightedSum / coverage * SCORE_SCALE };
}

export function calculateEvaluation(
  input: ScoringInput,
  model: EvaluationModel = SES_V1_MODEL,
  scenarioKey: EvaluationScenarioKey = "china-priority",
): EvaluationResult {
  const dimensions = getDimensionScores(input.metrics, model);
  const weights = model.scenarios[scenarioKey];
  const totals = calculateWeightedTotal(dimensions, weights, model.coverageFloor, model.provisionalRequiredDimensions);
  const status: EvaluationResult["status"] = totals.score === null
    ? "insufficient_data"
    : totals.coverage === 100
      ? "complete"
      : "provisional";
  const sensitivity = Object.fromEntries(
    (Object.keys(model.scenarios) as EvaluationScenarioKey[]).map((key) => {
      const result = calculateWeightedTotal(dimensions, model.scenarios[key], model.coverageFloor, model.provisionalRequiredDimensions);
      return [key, result.score === null ? null : roundScore(result.score)];
    }),
  ) as Record<EvaluationScenarioKey, number | null>;

  const ses = totals.score === null ? null : roundScore(totals.score);
  const baseLevel = totals.score === null ? null : resolveEvaluationLevel(totals.score, model);
  const eligibility = evaluateEligibility({
    competitorExclusive: input.competitorExclusive,
    majorConcernNeedsReview: input.majorConcernNeedsReview,
    dimensions,
    baseLevel,
    model,
  });

  if (status === "provisional" && eligibility.recommendedLevel !== null) {
    eligibility.recommendedLevel = limitRecommendedLevel(eligibility.recommendedLevel, "L2");
    eligibility.gates.push("provisional_data_cap_l2");
  }

  const scenarioLevels = Object.values(sensitivity).filter((value): value is number => value !== null).map((value) => resolveEvaluationLevel(value, model));
  if (new Set(scenarioLevels).size > 1) eligibility.gates.push("weight_sensitive");

  return {
    status,
    ses,
    coverage: totals.coverage,
    dimensions,
    baseLevel,
    recommendedLevel: eligibility.recommendedLevel,
    eligibility: eligibility.eligibility,
    gates: eligibility.gates,
    sensitivity,
  };
}
