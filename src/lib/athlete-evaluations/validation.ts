import { AppError } from "@/lib/api-response";
import { EVALUATION_DIMENSIONS, type AthleteEvaluationFilters, type EvaluationCreationInput, type EvaluationEligibilityUpdate, type EvaluationLevel, type EvaluationMetricUpdate, type EvaluationModel, type EvaluationScenarioKey, type ResearchSource } from "./types";
import { METRIC_DEFINITION_KEYS } from "./model-v1";

const SCENARIOS: EvaluationScenarioKey[] = ["china-priority", "north-america", "product-portfolio"];
const LEVELS = ["L0", "L1", "L2", "L3", "L4"] as const;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function validationError(message: string, field: string): never {
  throw new AppError("VALIDATION_ERROR", message, 422, { [field]: message });
}

export function parseEvaluationCreationInput(value: unknown): EvaluationCreationInput {
  if (!record(value)) validationError("评估信息格式不正确。", "body");
  const candidateName = typeof value.candidateName === "string" ? value.candidateName.trim() : "";
  if (!candidateName || candidateName.length > 180) validationError("请输入 1–180 个字符的球员姓名。", "candidateName");
  if (!isDate(value.asOfDate)) validationError("评估时点必须是有效日期。", "asOfDate");
  if ((value.asOfDate as string) > new Date().toISOString().slice(0, 10)) validationError("评估时点不能晚于今天。", "asOfDate");
  if (value.market !== "china" && value.market !== "north-america") validationError("目标市场无效。", "market");
  if (typeof value.scenarioKey !== "string" || !SCENARIOS.includes(value.scenarioKey as EvaluationScenarioKey)) {
    validationError("评分情景无效。", "scenarioKey");
  }
  if (value.athleteId !== undefined && (typeof value.athleteId !== "string" || !/^[0-9a-f-]{36}$/i.test(value.athleteId))) {
    validationError("球员编号无效。", "athleteId");
  }
  return {
    candidateName,
    asOfDate: value.asOfDate,
    market: value.market,
    scenarioKey: value.scenarioKey as EvaluationScenarioKey,
    ...(typeof value.athleteId === "string" ? { athleteId: value.athleteId } : {}),
  };
}

export function parseEvaluationMetricUpdate(value: unknown): EvaluationMetricUpdate {
  if (!record(value)) validationError("指标更新格式不正确。", "body");
  if (typeof value.metricKey !== "string" || !(value.metricKey in METRIC_DEFINITION_KEYS)) {
    validationError("指标不存在于当前 SES 模型。", "metricKey");
  }
  const status = value.status;
  if (status !== "verified" && status !== "needs_review" && status !== "missing" && status !== "conflict") {
    validationError("指标核验状态无效。", "status");
  }
  const rawValue = value.rawValue;
  if (rawValue !== null && typeof rawValue !== "string" && typeof rawValue !== "number" && typeof rawValue !== "boolean") {
    validationError("原始指标值只能是文本、数字、布尔值或空值。", "rawValue");
  }
  if (typeof rawValue === "number" && !Number.isFinite(rawValue)) validationError("原始指标值必须是有限数字。", "rawValue");
  const normalizedScore = value.normalizedScore;
  if (normalizedScore !== null && (typeof normalizedScore !== "number" || !Number.isFinite(normalizedScore) || normalizedScore < 0 || normalizedScore > 10)) {
    validationError("标准化分数必须在 0–10 之间。", "normalizedScore");
  }
  if (status === "verified" && typeof normalizedScore !== "number") validationError("已核验指标必须有标准化分数。", "normalizedScore");
  if (typeof value.rationale !== "string" || value.rationale.trim().length > 5000) validationError("请填写不超过 5000 个字符的评分依据。", "rationale");
  if (value.unit !== null && value.unit !== undefined && (typeof value.unit !== "string" || value.unit.length > 80)) validationError("指标单位不能超过 80 个字符。", "unit");
  for (const field of ["periodStart", "periodEnd"] as const) {
    if (value[field] !== null && value[field] !== undefined && !isDate(value[field])) validationError("指标时间范围必须是有效日期。", field);
  }
  if (typeof value.periodStart === "string" && typeof value.periodEnd === "string" && value.periodStart > value.periodEnd) {
    validationError("指标时间范围的结束日期不能早于开始日期。", "periodEnd");
  }
  if (!Array.isArray(value.sourceIds) || value.sourceIds.length > 50 || value.sourceIds.some((id) => typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id))) {
    validationError("来源编号列表无效。", "sourceIds");
  }
  if (new Set(value.sourceIds).size !== value.sourceIds.length) validationError("来源编号不能重复。", "sourceIds");
  if (status === "verified" && value.sourceIds.length === 0) validationError("已核验指标至少需要一个已确认来源。", "sourceIds");

  let eligibilityEvidence: EvaluationMetricUpdate["eligibilityEvidence"];
  if (value.eligibilityEvidence !== undefined) {
    if (!record(value.eligibilityEvidence)
      || (value.eligibilityEvidence.competitorExclusive !== null && typeof value.eligibilityEvidence.competitorExclusive !== "boolean")
      || typeof value.eligibilityEvidence.majorConcernNeedsReview !== "boolean"
      || !Array.isArray(value.eligibilityEvidence.competitorSourceIds)
      || !Array.isArray(value.eligibilityEvidence.majorConcernSourceIds)
      || value.eligibilityEvidence.competitorSourceIds.some((id) => typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id))
      || value.eligibilityEvidence.majorConcernSourceIds.some((id) => typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id))) {
      validationError("资格证据格式不正确。", "eligibilityEvidence");
    }
    if (value.eligibilityEvidence.competitorExclusive === true && value.eligibilityEvidence.competitorSourceIds.length === 0) {
      validationError("确认竞品排他合约时必须附带公开来源。", "eligibilityEvidence.competitorSourceIds");
    }
    if (value.eligibilityEvidence.majorConcernNeedsReview && value.eligibilityEvidence.majorConcernSourceIds.length === 0) {
      validationError("标记重大声誉事项时必须附带公开来源。", "eligibilityEvidence.majorConcernSourceIds");
    }
    if (new Set(value.eligibilityEvidence.competitorSourceIds).size !== value.eligibilityEvidence.competitorSourceIds.length
      || new Set(value.eligibilityEvidence.majorConcernSourceIds).size !== value.eligibilityEvidence.majorConcernSourceIds.length) {
      validationError("资格来源不能重复。", "eligibilityEvidence");
    }
    eligibilityEvidence = {
      competitorExclusive: value.eligibilityEvidence.competitorExclusive as boolean | null,
      competitorSourceIds: value.eligibilityEvidence.competitorSourceIds as string[],
      majorConcernNeedsReview: value.eligibilityEvidence.majorConcernNeedsReview as boolean,
      majorConcernSourceIds: value.eligibilityEvidence.majorConcernSourceIds as string[],
    };
  }

  return {
    metricKey: value.metricKey,
    rawValue,
    normalizedScore: normalizedScore as number | null,
    unit: typeof value.unit === "string" ? value.unit.trim() || null : null,
    periodStart: typeof value.periodStart === "string" ? value.periodStart : null,
    periodEnd: typeof value.periodEnd === "string" ? value.periodEnd : null,
    rationale: value.rationale.trim(),
    status,
    sourceIds: value.sourceIds,
    ...(eligibilityEvidence ? { eligibilityEvidence } : {}),
  };
}

export function parseEvaluationModel(value: unknown): EvaluationModel {
  if (!record(value)) validationError("模型配置必须是对象。", "model");
  if (typeof value.version !== "string" || !/^[a-z0-9][a-z0-9._-]{1,39}$/i.test(value.version)) validationError("模型版本格式无效。", "version");
  if (!record(value.scenarios) || !record(value.metricWeights) || !record(value.thresholds) || !record(value.hardGates)) {
    validationError("模型必须包含情景、指标权重、阈值和门槛配置。", "model");
  }

  const scenarios = value.scenarios as Record<string, unknown>;
  if (SCENARIOS.some((key) => !record(scenarios[key]))) validationError("模型必须包含全部三个权重情景。", "scenarios");
  for (const key of SCENARIOS) {
    const weights = scenarios[key] as Record<string, unknown>;
    if (Object.keys(weights).length !== EVALUATION_DIMENSIONS.length) validationError("每个权重情景只能包含 D1–D6 六个维度。", `scenarios.${key}`);
    if (EVALUATION_DIMENSIONS.some((dimension) => typeof weights[dimension] !== "number" || (weights[dimension] as number) < 0)) {
      validationError("每个权重情景必须为六个维度提供非负权重。", `scenarios.${key}`);
    }
    if (EVALUATION_DIMENSIONS.reduce((sum, dimension) => sum + (weights[dimension] as number), 0) !== 100) {
      validationError("每个权重情景的总和必须为 100。", `scenarios.${key}`);
    }
  }

  const metricWeights = value.metricWeights as Record<string, unknown>;
  for (const dimension of EVALUATION_DIMENSIONS) {
    const weights = metricWeights[dimension];
    if (!record(weights) || Object.keys(weights).length === 0) validationError("每个维度都需要子指标权重。", `metricWeights.${dimension}`);
    if (Object.values(weights).some((weight) => typeof weight !== "number" || weight < 0)
      || Object.values(weights).reduce<number>((sum, weight) => sum + (weight as number), 0) !== 100) {
      validationError("每个维度的子指标权重总和必须为 100。", `metricWeights.${dimension}`);
    }
  }
  const flatMetricKeys = EVALUATION_DIMENSIONS.flatMap((dimension) => Object.keys(metricWeights[dimension] as Record<string, unknown>));
  if (flatMetricKeys.length !== Object.keys(METRIC_DEFINITION_KEYS).length
    || new Set(flatMetricKeys).size !== flatMetricKeys.length
    || flatMetricKeys.some((key) => !(key in METRIC_DEFINITION_KEYS))) {
    validationError("当前版本仅允许 SES 定义中的子指标。", "metricWeights");
  }

  const thresholds = value.thresholds as Record<string, unknown>;
  const thresholdValues = [thresholds.L1, thresholds.L2, thresholds.L3, thresholds.L4];
  if (thresholdValues.some((threshold) => typeof threshold !== "number" || threshold < 0 || threshold > 100)
    || !(thresholdValues[0]! < thresholdValues[1]! && thresholdValues[1]! < thresholdValues[2]! && thresholdValues[2]! < thresholdValues[3]!)) {
    validationError("L1–L4 阈值必须在 0–100 内严格递增。", "thresholds");
  }
  if (typeof value.coverageFloor !== "number" || value.coverageFloor < 1 || value.coverageFloor > 100) validationError("总覆盖率门槛必须在 1–100 之间。", "coverageFloor");
  if (typeof value.dimensionMinimumCoverage !== "number" || value.dimensionMinimumCoverage < 1 || value.dimensionMinimumCoverage > 100) validationError("维度覆盖率门槛必须在 1–100 之间。", "dimensionMinimumCoverage");
  if (!Array.isArray(value.provisionalRequiredDimensions) || value.provisionalRequiredDimensions.some((item) => !EVALUATION_DIMENSIONS.includes(item as never))) {
    validationError("暂定评分必需维度无效。", "provisionalRequiredDimensions");
  }
  const gates = value.hardGates as Record<string, unknown>;
  for (const key of ["storyDimensionMax", "attentionDimensionMax", "chinaMarketMinimum"] as const) {
    if (typeof gates[key] !== "number" || gates[key] < 0 || gates[key] > 10) validationError("硬门槛分数必须在 0–10 之间。", `hardGates.${key}`);
  }
  if (typeof gates.cappedLevel !== "string" || !LEVELS.includes(gates.cappedLevel as (typeof LEVELS)[number])) validationError("硬门槛目标层级无效。", "hardGates.cappedLevel");

  return value as unknown as EvaluationModel;
}

export function parseListFilters(input: URLSearchParams) {
  const limit = Number(input.get("limit") ?? 25);
  const offset = Number(input.get("offset") ?? 0);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) validationError("每页数量必须在 1–100 之间。", "limit");
  if (!Number.isInteger(offset) || offset < 0) validationError("分页起点必须是 0 或更大的整数。", "offset");
  const level = input.get("level") ?? "all";
  if (level !== "all" && !LEVELS.includes(level as (typeof LEVELS)[number])) validationError("评分层级无效。", "level");
  const status = input.get("status") ?? "all";
  if (status !== "all" && status !== "complete" && status !== "provisional" && status !== "insufficient_data") validationError("评分状态无效。", "status");
  const scenarioKey = input.get("scenarioKey") ?? "all";
  if (scenarioKey !== "all" && !SCENARIOS.includes(scenarioKey as EvaluationScenarioKey)) validationError("评分情景无效。", "scenarioKey");
  const workflowState = input.get("workflowState") ?? "all";
  if (workflowState !== "all" && workflowState !== "draft" && workflowState !== "finalized") validationError("工作流状态无效。", "workflowState");
  return {
    search: input.get("search")?.trim().slice(0, 180) || undefined,
    level: level as EvaluationLevel | "all",
    status: status as NonNullable<AthleteEvaluationFilters["status"]>,
    scenarioKey: scenarioKey as EvaluationScenarioKey | "all",
    workflowState: workflowState as "draft" | "finalized" | "all",
    limit,
    offset,
  };
}

export function parseManualResearchSources(value: unknown): Omit<ResearchSource, "id" | "status" | "eligibleForScore" | "metricKey">[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 30) validationError("请提供 1–30 条来源。", "sources");
  return value.map((item, index) => {
    if (!record(item)) validationError("来源格式无效。", `sources.${index}`);
    let url: URL;
    try {
      url = new URL(String(item.url ?? ""));
    } catch {
      validationError("来源必须是有效的公开网页链接。", `sources.${index}.url`);
    }
    if (url!.protocol !== "https:" && url!.protocol !== "http:") validationError("来源链接只支持 HTTP 或 HTTPS。", `sources.${index}.url`);
    if (url!.username || url!.password) validationError("来源链接不能包含登录凭据。", `sources.${index}.url`);
    const publisher = typeof item.publisher === "string" ? item.publisher.trim() : "";
    const title = typeof item.title === "string" ? item.title.trim() : "";
    const excerpt = typeof item.excerpt === "string" ? item.excerpt.trim() : "";
    if (!publisher || publisher.length > 160) validationError("来源发布者为必填项，且不能超过 160 个字符。", `sources.${index}.publisher`);
    if (!title || title.length > 300) validationError("来源标题为必填项，且不能超过 300 个字符。", `sources.${index}.title`);
    if (excerpt.length > 5000) validationError("来源摘录不能超过 5000 个字符。", `sources.${index}.excerpt`);
    const publishedAt = item.publishedAt === null || item.publishedAt === undefined || item.publishedAt === ""
      ? null
      : isDate(item.publishedAt) ? item.publishedAt : undefined;
    if (publishedAt === undefined) validationError("来源发布日期无效。", `sources.${index}.publishedAt`);
    return { url: url!.toString(), publisher, title, publishedAt, excerpt };
  });
}

export function parseEvaluationEligibilityUpdate(value: unknown): EvaluationEligibilityUpdate {
  if (!record(value)
    || (value.competitorExclusive !== null && typeof value.competitorExclusive !== "boolean")
    || typeof value.majorConcernNeedsReview !== "boolean"
    || !Array.isArray(value.competitorSourceIds)
    || !Array.isArray(value.majorConcernSourceIds)) {
    validationError("资格复核信息格式无效。", "eligibilityEvidence");
  }
  const sourceIds = [...value.competitorSourceIds, ...value.majorConcernSourceIds];
  if (sourceIds.some((id) => typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))) {
    validationError("资格来源编号无效。", "sourceIds");
  }
  if (new Set(value.competitorSourceIds).size !== value.competitorSourceIds.length
    || new Set(value.majorConcernSourceIds).size !== value.majorConcernSourceIds.length) {
    validationError("资格来源不能重复。", "sourceIds");
  }
  if (value.competitorExclusive !== null && value.competitorSourceIds.length === 0) {
    validationError("确认竞品合约状态时必须附带来源。", "competitorSourceIds");
  }
  if (value.majorConcernNeedsReview && value.majorConcernSourceIds.length === 0) {
    validationError("标记重大事项时必须附带来源。", "majorConcernSourceIds");
  }
  return value as unknown as EvaluationEligibilityUpdate;
}
