import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { AppError } from "@/lib/api-response";
import { getDatabase } from "@/lib/db";
import {
  athleteEvaluationMetricScores,
  athleteEvaluationModels,
  athleteEvaluationRuns,
  athleteEvaluationSources,
} from "@/lib/db/schema";
import { calculateEvaluation } from "./scoring";
import { summarizeAthletePortfolio } from "./portfolio";
import { getActiveEvaluationModel, getAthleteForEvaluation, getAthletePortfolioRecords, getEvaluationMetrics, getEvaluationModel, getEvaluationRun, getEvaluationSources, getPublishedNbaAthleteSources, listEvaluationModels, listEvaluations } from "./queries";
import { METRIC_DEFINITION_KEYS } from "./model-v1";
import { parseEvaluationCreationInput, parseEvaluationEligibilityUpdate, parseEvaluationMetricUpdate, parseEvaluationModel } from "./validation";
import type { EvaluationCreationInput, EvaluationDetail, EvaluationDraft, EvaluationEligibilityUpdate, EvaluationMetricUpdate, EvaluationModel, MetricInput, ResearchSource } from "./types";

function asOfEligible(source: { publishedAt: string | null; observedAt: Date }, asOfDate: string) {
  if (source.publishedAt) return source.publishedAt <= asOfDate;
  return source.observedAt.toISOString().slice(0, 10) <= asOfDate;
}

function mapSource(source: typeof athleteEvaluationSources.$inferSelect, metricKey: string, asOfDate: string): ResearchSource {
  return {
    id: source.id,
    metricKey,
    url: source.url,
    publisher: source.publisher,
    title: source.title,
    publishedAt: source.publishedAt,
    excerpt: source.excerpt,
    status: source.status,
    eligibleForScore: asOfEligible(source, asOfDate),
  };
}

function getModelConfiguration(row: { version: string; configuration: unknown }): EvaluationModel {
  const model = parseEvaluationModel(row.configuration);
  if (model.version !== row.version) throw new AppError("MODEL_CONFIGURATION_INVALID", "模型版本与配置不一致。", 500);
  return model;
}

async function activeModel() {
  const row = await getActiveEvaluationModel();
  if (!row) throw new AppError("MODEL_NOT_CONFIGURED", "尚无已发布的 SES 模型版本。", 503);
  return { row, model: getModelConfiguration(row) };
}

async function createEvaluationWithVersion(input: EvaluationCreationInput, modelVersion: string): Promise<string> {
  const normalized = parseEvaluationCreationInput(input);
  if (normalized.athleteId) {
    const athlete = await getAthleteForEvaluation(normalized.athleteId);
    if (!athlete || athlete.sportSlug !== "basketball" || athlete.league?.toLocaleLowerCase("en-US") !== "nba" || !athlete.published) {
      throw new AppError("NBA_ATHLETE_NOT_FOUND", "请选择已发布的 NBA 球员档案，或创建未关联档案的候选评估。", 404);
    }
  }
  const modelRow = await getEvaluationModel(modelVersion);
  if (!modelRow) throw new AppError("MODEL_VERSION_NOT_FOUND", "评估模型版本不存在。", 404);
  const model = getModelConfiguration(modelRow);
  const db = getDatabase();
  const metricKeys = Object.keys(METRIC_DEFINITION_KEYS);
  const [run] = await db.transaction(async (tx) => {
    const [created] = await tx.insert(athleteEvaluationRuns).values({
      athleteId: normalized.athleteId ?? null,
      candidateName: normalized.candidateName,
      modelVersion: model.version,
      asOfDate: normalized.asOfDate,
      market: normalized.market,
      scenario: normalized.scenarioKey,
    }).returning();
    if (!created) throw new AppError("EVALUATION_CREATE_FAILED", "无法创建球星评估。", 500);
    await tx.insert(athleteEvaluationMetricScores).values(metricKeys.map((metricKey) => ({
      runId: created.id,
      metricKey,
      rawValue: null,
      normalizedScore: null,
      status: "missing" as const,
    })));
    return [created];
  });
  void model;
  await refreshEvaluationScore(run.id);
  return run.id;
}

async function loadScoringInputs(runId: string) {
  const run = await getEvaluationRun(runId);
  if (!run) throw new AppError("EVALUATION_NOT_FOUND", "评估记录不存在。", 404);
  const modelRow = await getEvaluationModel(run.modelVersion);
  if (!modelRow) throw new AppError("MODEL_VERSION_NOT_FOUND", "该评估使用的模型版本已不存在。", 500);
  const model = getModelConfiguration(modelRow);
  const metrics = await getEvaluationMetrics(runId);
  const sources = await getEvaluationSources(metrics.map((metric) => metric.id));
  const sourcesByMetric = new Map<string, typeof sources>();
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  for (const source of sources) sourcesByMetric.set(source.metricScoreId, [...(sourcesByMetric.get(source.metricScoreId) ?? []), source]);

  const scoringMetrics: MetricInput[] = metrics.map((metric) => {
    const usableSource = (sourcesByMetric.get(metric.id) ?? []).some((source) => source.status === "verified" && asOfEligible(source, run.asOfDate));
    return {
      key: metric.metricKey,
      rawValue: metric.rawValue as MetricInput["rawValue"],
      normalizedScore: metric.normalizedScore,
      unit: metric.unit,
      periodStart: metric.periodStart,
      periodEnd: metric.periodEnd,
      status: metric.status === "verified" && !usableSource ? "needs_review" : metric.status,
      rationale: metric.rationale,
    };
  });

  const competitorSourceIds = run.competitorEvidenceSourceIds ?? [];
  const majorConcernSourceIds = run.majorConcernEvidenceSourceIds ?? [];
  const competitorHasUsableSource = competitorSourceIds.some((id) => {
    const source = sourceById.get(id);
    return source?.status === "verified" && asOfEligible(source, run.asOfDate);
  });
  const majorConcernHasUsableSource = majorConcernSourceIds.some((id) => {
    const source = sourceById.get(id);
    return source?.status === "verified" && asOfEligible(source, run.asOfDate);
  });
  const competitorExclusive = run.competitorExclusive === true && competitorHasUsableSource
    ? true
    : run.competitorExclusive === false && competitorHasUsableSource
      ? false
      : null;
  return {
    run,
    model,
    metrics,
    sources,
    sourcesByMetric,
    sourceById,
    scoringMetrics,
    competitorExclusive,
    majorConcernNeedsReview: run.majorConcernNeedsReview && majorConcernHasUsableSource,
  };
}

export async function refreshEvaluationScore(runId: string) {
  const inputs = await loadScoringInputs(runId);
  const result = calculateEvaluation({
    metrics: inputs.scoringMetrics,
    competitorExclusive: inputs.competitorExclusive,
    majorConcernNeedsReview: inputs.majorConcernNeedsReview,
  }, inputs.model, inputs.run.scenario);
  if (inputs.run.workflowState === "finalized") return result;
  await getDatabase().update(athleteEvaluationRuns).set({
    ses: result.ses,
    coverage: result.coverage,
    dimensions: result.dimensions,
    sensitivity: result.sensitivity,
    gates: result.gates,
    eligibility: result.eligibility,
    baseLevel: result.baseLevel,
    recommendedLevel: result.recommendedLevel,
    status: result.status,
    updatedAt: new Date(),
  }).where(and(eq(athleteEvaluationRuns.id, runId), eq(athleteEvaluationRuns.workflowState, "draft")));
  return result;
}

export async function createEvaluation(input: EvaluationCreationInput): Promise<EvaluationDraft> {
  const normalized = parseEvaluationCreationInput(input);
  const { model } = await activeModel();
  const runId = await createEvaluationWithVersion(normalized, model.version);
  const preview = await refreshEvaluationScore(runId);
  return { runId, workflowState: "draft", preview };
}

export async function updateEvaluationMetric(runId: string, input: EvaluationMetricUpdate): Promise<EvaluationDraft> {
  const parsed = parseEvaluationMetricUpdate(input);
  const run = await getEvaluationRun(runId);
  if (!run) throw new AppError("EVALUATION_NOT_FOUND", "评估记录不存在。", 404);
  if (run.workflowState !== "draft") throw new AppError("EVALUATION_FINALIZED", "最终评估快照不可修改，请基于原评估新建复算草稿。", 409);
  if ((parsed.periodStart && parsed.periodStart > run.asOfDate) || (parsed.periodEnd && parsed.periodEnd > run.asOfDate)) {
    throw new AppError("EVIDENCE_AFTER_AS_OF", "指标时间范围不能晚于本次评估时点。", 422);
  }
  const metricRows = await getEvaluationMetrics(runId);
  const metric = metricRows.find((row) => row.metricKey === parsed.metricKey);
  if (!metric) throw new AppError("METRIC_NOT_FOUND", "该指标不属于当前模型版本。", 404);
  const db = getDatabase();

  await db.transaction(async (tx) => {
    const [draft] = await tx.select({ id: athleteEvaluationRuns.id }).from(athleteEvaluationRuns)
      .where(and(eq(athleteEvaluationRuns.id, runId), eq(athleteEvaluationRuns.workflowState, "draft"))).limit(1).for("update");
    if (!draft) throw new AppError("EVALUATION_FINALIZED", "最终评估快照不可修改。", 409);
    if (parsed.sourceIds.length) {
      const selectedSources = await tx.select().from(athleteEvaluationSources).where(and(
        eq(athleteEvaluationSources.metricScoreId, metric.id),
        inArray(athleteEvaluationSources.id, parsed.sourceIds),
      ));
      if (selectedSources.length !== parsed.sourceIds.length || selectedSources.some((source) => source.status === "rejected" || !asOfEligible(source, run.asOfDate))) {
        throw new AppError("INVALID_EVALUATION_SOURCE", "来源必须属于该指标、未被否决，并且在评估时点前已公开。", 422);
      }
      if (parsed.status === "verified") {
        await tx.update(athleteEvaluationSources).set({ status: "verified", updatedAt: new Date() })
          .where(inArray(athleteEvaluationSources.id, parsed.sourceIds));
      }
    }
    await tx.update(athleteEvaluationMetricScores).set({
      rawValue: parsed.rawValue,
      normalizedScore: parsed.normalizedScore,
      unit: parsed.unit,
      periodStart: parsed.periodStart,
      periodEnd: parsed.periodEnd,
      rationale: parsed.rationale,
      status: parsed.status,
      updatedAt: new Date(),
    }).where(eq(athleteEvaluationMetricScores.id, metric.id));

    if (parsed.eligibilityEvidence) {
      const allGateSourceIds = [...new Set([...parsed.eligibilityEvidence.competitorSourceIds, ...parsed.eligibilityEvidence.majorConcernSourceIds])];
      if (allGateSourceIds.length) {
        const gateSources = await tx.select({ id: athleteEvaluationSources.id, status: athleteEvaluationSources.status, publishedAt: athleteEvaluationSources.publishedAt, observedAt: athleteEvaluationSources.observedAt })
          .from(athleteEvaluationSources).innerJoin(athleteEvaluationMetricScores, eq(athleteEvaluationMetricScores.id, athleteEvaluationSources.metricScoreId))
          .where(and(eq(athleteEvaluationMetricScores.runId, runId), inArray(athleteEvaluationSources.id, allGateSourceIds)));
        if (gateSources.length !== allGateSourceIds.length || gateSources.some((source) => source.status !== "verified" || !asOfEligible(source, run.asOfDate))) {
          throw new AppError("INVALID_ELIGIBILITY_SOURCE", "资格门槛来源必须已核验、属于本次评估且在评估时点前已公开。", 422);
        }
      }
      if (parsed.eligibilityEvidence.competitorExclusive !== null && parsed.eligibilityEvidence.competitorSourceIds.length === 0) {
        throw new AppError("ELIGIBILITY_SOURCE_REQUIRED", "已确认竞品合约状态时需要提供来源。", 422);
      }
      await tx.update(athleteEvaluationRuns).set({
        competitorExclusive: parsed.eligibilityEvidence.competitorExclusive,
        competitorEvidenceSourceIds: parsed.eligibilityEvidence.competitorSourceIds,
        majorConcernNeedsReview: parsed.eligibilityEvidence.majorConcernNeedsReview,
        majorConcernEvidenceSourceIds: parsed.eligibilityEvidence.majorConcernSourceIds,
        updatedAt: new Date(),
      }).where(eq(athleteEvaluationRuns.id, runId));
    }
  });

  const preview = await refreshEvaluationScore(runId);
  return { runId, workflowState: "draft", preview };
}

export async function getEvaluation(runId: string): Promise<EvaluationDetail | null> {
  const run = await getEvaluationRun(runId);
  if (!run) return null;
  const data = await loadScoringInputs(runId);
  const result = {
    status: run.status,
    ses: run.ses,
    coverage: run.coverage,
    dimensions: run.dimensions as EvaluationDetail["dimensions"],
    sensitivity: run.sensitivity as EvaluationDetail["sensitivity"],
    gates: run.gates,
    eligibility: run.eligibility,
    baseLevel: run.baseLevel as EvaluationDetail["baseLevel"],
    recommendedLevel: run.recommendedLevel as EvaluationDetail["recommendedLevel"],
  };
  const scoringMetricByKey = new Map(data.scoringMetrics.map((metric) => [metric.key, metric]));
  const metrics = data.metrics.map((metric) => ({
    key: metric.metricKey,
    rawValue: metric.rawValue as MetricInput["rawValue"],
    normalizedScore: metric.normalizedScore,
    unit: metric.unit,
    periodStart: metric.periodStart,
    periodEnd: metric.periodEnd,
    status: scoringMetricByKey.get(metric.metricKey)?.status ?? metric.status,
    rationale: metric.rationale,
  }));
  const metricKeyById = new Map(data.metrics.map((metric) => [metric.id, metric.metricKey]));
  const sources = data.sources.map((source) => mapSource(source, metricKeyById.get(source.metricScoreId) ?? "", run.asOfDate));
  const [profileRows] = run.athleteId
    ? await Promise.all([getPublishedNbaAthleteSources(run.athleteId, run.asOfDate)])
    : [[]];
  const profileSources: ResearchSource[] = profileRows.map((source) => ({
    url: source.url,
    publisher: source.publisher,
    title: source.title,
    publishedAt: source.publishedAt,
    excerpt: source.excerpt,
    status: "verified",
    eligibleForScore: true,
    claimScope: source.claimScope,
  }));
  const productPortfolio = run.athleteId ? await getAthleteProductPortfolio(run.athleteId) : null;
  return {
    ...result,
    runId,
    workflowState: run.workflowState,
    modelVersion: run.modelVersion,
    scenarioKey: run.scenario,
    market: run.market as EvaluationDetail["market"],
    asOfDate: run.asOfDate,
    athleteId: run.athleteId,
    candidateName: run.candidateName,
    metrics,
    sources,
    profileSources,
    productPortfolio,
    eligibilityEvidence: {
      competitorExclusive: run.competitorExclusive,
      competitorSourceIds: run.competitorEvidenceSourceIds ?? [],
      majorConcernNeedsReview: run.majorConcernNeedsReview,
      majorConcernSourceIds: run.majorConcernEvidenceSourceIds ?? [],
    },
  };
}

export async function finalizeEvaluation(runId: string): Promise<EvaluationDetail> {
  await refreshEvaluationScore(runId);
  const detail = await getEvaluation(runId);
  if (!detail) throw new AppError("EVALUATION_NOT_FOUND", "评估记录不存在。", 404);
  if (detail.workflowState === "finalized") return detail;
  if (detail.status === "insufficient_data") throw new AppError("INSUFFICIENT_EVALUATION_DATA", "覆盖率或必需维度不足，暂不能定稿。", 409);
  if (detail.eligibilityEvidence.majorConcernNeedsReview) throw new AppError("MAJOR_CONCERN_REVIEW_PENDING", "重大声誉事项尚待复核，完成复核后再定稿。", 409);
  if (detail.metrics.some((metric) => metric.status === "needs_review" && metric.normalizedScore !== null)) {
    throw new AppError("METRIC_REVIEW_PENDING", "仍有待复核指标，请先确认分数或清除未核验分数。", 409);
  }
  const [updated] = await getDatabase().update(athleteEvaluationRuns).set({
    workflowState: "finalized",
    finalizedAt: new Date(),
    updatedAt: new Date(),
  }).where(and(eq(athleteEvaluationRuns.id, runId), eq(athleteEvaluationRuns.workflowState, "draft"))).returning({ id: athleteEvaluationRuns.id });
  if (!updated) throw new AppError("EVALUATION_FINALIZE_CONFLICT", "评估状态已变化，请刷新后重试。", 409);
  const final = await getEvaluation(runId);
  if (!final) throw new AppError("EVALUATION_NOT_FOUND", "评估记录不存在。", 404);
  return final;
}

export async function recalculateEvaluation(runId: string, modelVersion: string): Promise<EvaluationDraft> {
  const original = await getEvaluation(runId);
  if (!original) throw new AppError("EVALUATION_NOT_FOUND", "评估记录不存在。", 404);
  const newRunId = await createEvaluationWithVersion({
    ...(original.athleteId ? { athleteId: original.athleteId } : {}),
    candidateName: original.candidateName,
    asOfDate: original.asOfDate,
    market: original.market,
    scenarioKey: original.scenarioKey,
  }, modelVersion);
  const targetMetrics = await getEvaluationMetrics(newRunId);
  const sourceMetrics = await getEvaluationMetrics(runId);
  const targetByKey = new Map(targetMetrics.map((metric) => [metric.metricKey, metric]));
  const oldMetricIds = sourceMetrics.map((metric) => metric.id);
  const oldSources = await getEvaluationSources(oldMetricIds);
  const newSourceIds = new Map<string, string>();
  const db = getDatabase();
  await db.transaction(async (tx) => {
    for (const sourceMetric of sourceMetrics) {
      const target = targetByKey.get(sourceMetric.metricKey);
      if (!target) continue;
      await tx.update(athleteEvaluationMetricScores).set({
        rawValue: sourceMetric.rawValue,
        normalizedScore: sourceMetric.normalizedScore,
        unit: sourceMetric.unit,
        periodStart: sourceMetric.periodStart,
        periodEnd: sourceMetric.periodEnd,
        rationale: sourceMetric.rationale,
        status: sourceMetric.status,
        reviewer: sourceMetric.reviewer,
      }).where(eq(athleteEvaluationMetricScores.id, target.id));
      const copies = oldSources.filter((source) => source.metricScoreId === sourceMetric.id);
      if (copies.length) {
        const inserted = await tx.insert(athleteEvaluationSources).values(copies.map((source) => ({
          metricScoreId: target.id,
          url: source.url,
          publisher: source.publisher,
          title: source.title,
          publishedAt: source.publishedAt,
          observedAt: source.observedAt,
          excerpt: source.excerpt,
          status: source.status,
        }))).returning({ id: athleteEvaluationSources.id });
        copies.forEach((source, index) => newSourceIds.set(source.id, inserted[index]!.id));
      }
    }
    const mapIds = (ids: string[]) => ids.flatMap((id) => newSourceIds.get(id) ? [newSourceIds.get(id)!] : []);
    await tx.update(athleteEvaluationRuns).set({
      competitorExclusive: original.eligibilityEvidence.competitorExclusive,
      competitorEvidenceSourceIds: mapIds(original.eligibilityEvidence.competitorSourceIds),
      majorConcernNeedsReview: original.eligibilityEvidence.majorConcernNeedsReview,
      majorConcernEvidenceSourceIds: mapIds(original.eligibilityEvidence.majorConcernSourceIds),
      updatedAt: new Date(),
    }).where(eq(athleteEvaluationRuns.id, newRunId));
  });
  const preview = await refreshEvaluationScore(newRunId);
  return { runId: newRunId, workflowState: "draft", preview };
}

export async function createModelVersion(input: unknown, changeNote: unknown, publishedBy?: string): Promise<EvaluationModel> {
  const model = parseEvaluationModel(input);
  if (typeof changeNote !== "string" || !changeNote.trim() || changeNote.trim().length > 2000) {
    throw new AppError("VALIDATION_ERROR", "发布新模型版本时请填写不超过 2000 个字符的变更说明。", 422, { changeNote: "变更说明为必填项" });
  }
  const db = getDatabase();
  await db.transaction(async (tx) => {
    const [existing] = await tx.select({ version: athleteEvaluationModels.version }).from(athleteEvaluationModels)
      .where(eq(athleteEvaluationModels.version, model.version)).limit(1);
    if (existing) throw new AppError("MODEL_VERSION_EXISTS", "该模型版本已存在；已发布版本不可覆盖。", 409);
    await tx.update(athleteEvaluationModels).set({ active: false });
    await tx.insert(athleteEvaluationModels).values({
      version: model.version,
      configuration: model as unknown as Record<string, unknown>,
      changeNote: changeNote.trim(),
      active: true,
      publishedBy: publishedBy?.slice(0, 160) ?? null,
    });
  });
  return model;
}

export async function addResearchSuggestions(runId: string, metricKey: string, sources: Omit<ResearchSource, "id" | "status" | "eligibleForScore" | "metricKey">[]) {
  if (!(metricKey in METRIC_DEFINITION_KEYS)) throw new AppError("METRIC_NOT_FOUND", "该指标不存在于当前模型。", 404);
  const run = await getEvaluationRun(runId);
  if (!run) throw new AppError("EVALUATION_NOT_FOUND", "评估记录不存在。", 404);
  if (run.workflowState !== "draft") throw new AppError("EVALUATION_FINALIZED", "最终评估快照不可添加来源。", 409);
  const metric = (await getEvaluationMetrics(runId)).find((row) => row.metricKey === metricKey);
  if (!metric) throw new AppError("METRIC_NOT_FOUND", "该指标不属于当前评估。", 404);
  const unique = new Map<string, Omit<ResearchSource, "id" | "status" | "eligibleForScore" | "metricKey">>();
  for (const source of sources) unique.set(source.url, source);
  if (!unique.size || unique.size > 30) throw new AppError("INVALID_RESEARCH_SOURCES", "请提供 1–30 个有效来源。", 422);
  const inserted = await getDatabase().insert(athleteEvaluationSources).values([...unique.values()].map((source) => ({
    metricScoreId: metric.id,
    url: source.url,
    publisher: source.publisher,
    title: source.title,
    publishedAt: source.publishedAt,
    excerpt: source.excerpt,
    status: "suggested" as const,
  }))).returning();
  return inserted.map((source) => mapSource(source, metricKey, run.asOfDate));
}

export async function reviewEvaluationSource(runId: string, sourceId: string, status: "verified" | "rejected") {
  const run = await getEvaluationRun(runId);
  if (!run) throw new AppError("EVALUATION_NOT_FOUND", "评估记录不存在。", 404);
  if (run.workflowState !== "draft") throw new AppError("EVALUATION_FINALIZED", "最终评估快照不可修改。", 409);
  const [source] = await getDatabase().select({
    id: athleteEvaluationSources.id,
    publishedAt: athleteEvaluationSources.publishedAt,
    observedAt: athleteEvaluationSources.observedAt,
  }).from(athleteEvaluationSources)
    .innerJoin(athleteEvaluationMetricScores, eq(athleteEvaluationMetricScores.id, athleteEvaluationSources.metricScoreId))
    .where(and(eq(athleteEvaluationMetricScores.runId, runId), eq(athleteEvaluationSources.id, sourceId))).limit(1);
  if (!source) throw new AppError("INVALID_EVALUATION_SOURCE", "来源不属于当前评估。", 422);
  if (status === "verified" && !asOfEligible(source, run.asOfDate)) {
    throw new AppError("INVALID_EVALUATION_SOURCE", "晚于评估时点的来源不能用于该评估。", 422);
  }
  await getDatabase().update(athleteEvaluationSources).set({ status, updatedAt: new Date() }).where(eq(athleteEvaluationSources.id, sourceId));
  await refreshEvaluationScore(runId);
  return { id: sourceId, status };
}

export async function updateEvaluationEligibility(runId: string, value: EvaluationEligibilityUpdate) {
  const parsed = parseEvaluationEligibilityUpdate(value);
  const run = await getEvaluationRun(runId);
  if (!run) throw new AppError("EVALUATION_NOT_FOUND", "评估记录不存在。", 404);
  if (run.workflowState !== "draft") throw new AppError("EVALUATION_FINALIZED", "最终评估快照不可修改。", 409);
  const allIds = [...new Set([...parsed.competitorSourceIds, ...parsed.majorConcernSourceIds])];
  if (allIds.length) {
    const rows = await getDatabase().select({
      id: athleteEvaluationSources.id,
      status: athleteEvaluationSources.status,
      publishedAt: athleteEvaluationSources.publishedAt,
      observedAt: athleteEvaluationSources.observedAt,
    }).from(athleteEvaluationSources)
      .innerJoin(athleteEvaluationMetricScores, eq(athleteEvaluationMetricScores.id, athleteEvaluationSources.metricScoreId))
      .where(and(eq(athleteEvaluationMetricScores.runId, runId), inArray(athleteEvaluationSources.id, allIds)));
    if (rows.length !== allIds.length || rows.some((row) => row.status !== "verified" || !asOfEligible(row, run.asOfDate))) {
      throw new AppError("INVALID_ELIGIBILITY_SOURCE", "资格来源必须已核验、属于本次评估且在评估时点前已公开。", 422);
    }
  }
  await getDatabase().update(athleteEvaluationRuns).set({
    competitorExclusive: parsed.competitorExclusive,
    competitorEvidenceSourceIds: parsed.competitorSourceIds,
    majorConcernNeedsReview: parsed.majorConcernNeedsReview,
    majorConcernEvidenceSourceIds: parsed.majorConcernSourceIds,
    updatedAt: new Date(),
  }).where(and(eq(athleteEvaluationRuns.id, runId), eq(athleteEvaluationRuns.workflowState, "draft")));
  return refreshEvaluationScore(runId);
}

export async function getAthleteProductPortfolio(athleteId: string) {
  return summarizeAthletePortfolio(await getAthletePortfolioRecords(athleteId));
}

export { listEvaluationModels, listEvaluations };
