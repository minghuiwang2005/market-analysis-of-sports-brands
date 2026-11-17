import { SES_V1_MODEL } from "./model-v1";
import type { EvaluationDimensionKey, EvaluationEligibility, EvaluationLevel, EvaluationModel } from "./types";

export function resolveEvaluationLevel(score: number, model: EvaluationModel = SES_V1_MODEL): EvaluationLevel {
  if (score >= model.thresholds.L4) return "L4";
  if (score >= model.thresholds.L3) return "L3";
  if (score >= model.thresholds.L2) return "L2";
  if (score >= model.thresholds.L1) return "L1";
  return "L0";
}

export function limitRecommendedLevel(level: EvaluationLevel | null, maximum: EvaluationLevel): EvaluationLevel | null {
  if (!level) return null;
  const order: EvaluationLevel[] = ["L0", "L1", "L2", "L3", "L4"];
  return order.indexOf(level) > order.indexOf(maximum) ? maximum : level;
}

export function evaluateEligibility(input: {
  competitorExclusive: boolean | null;
  majorConcernNeedsReview: boolean;
  dimensions: Record<EvaluationDimensionKey, number | null>;
  baseLevel: EvaluationLevel | null;
  model?: EvaluationModel;
}): { eligibility: EvaluationEligibility; recommendedLevel: EvaluationLevel | null; gates: string[] } {
  const model = input.model ?? SES_V1_MODEL;
  const gates: string[] = [];
  let eligibility: EvaluationEligibility = "eligible";
  let recommendedLevel = input.baseLevel;

  if (input.competitorExclusive === true) {
    eligibility = "blocked";
    gates.push("competitor_exclusive_contract");
    recommendedLevel = null;
  } else if (input.competitorExclusive === null) {
    eligibility = "review_required";
    gates.push("competitor_contract_unknown");
  }

  if (input.majorConcernNeedsReview) {
    if (eligibility !== "blocked") eligibility = "review_required";
    gates.push("major_concern_manual_review");
    recommendedLevel = limitRecommendedLevel(recommendedLevel, model.hardGates.cappedLevel);
  }

  const dimension3 = input.dimensions.D3;
  const dimension2 = input.dimensions.D2;
  if (
    dimension3 !== null &&
    dimension2 !== null &&
    dimension3 <= model.hardGates.storyDimensionMax &&
    dimension2 <= model.hardGates.attentionDimensionMax
  ) {
    gates.push("signature_story_limited");
    recommendedLevel = limitRecommendedLevel(recommendedLevel, model.hardGates.cappedLevel);
  }

  if (input.dimensions.D4 !== null && input.dimensions.D4 <= model.hardGates.chinaMarketMinimum) {
    gates.push("china_resource_not_recommended");
  }

  return { eligibility, recommendedLevel, gates };
}
