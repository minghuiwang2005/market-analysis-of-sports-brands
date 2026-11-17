import "server-only";
import { and, asc, count, desc, eq, exists, ilike, inArray, isNull, lte, or } from "drizzle-orm";
import { getDatabase } from "@/lib/db";
import {
  athleteEvaluationMetricScores,
  athleteEvaluationModels,
  athleteEvaluationRuns,
  athleteEvaluationSources,
  athleteShoeLineProducts,
  athleteShoeLines,
  athleteSources,
  availabilityObservations,
  modelFields,
  priceObservations,
  skuFieldValues,
  skuProducts,
  sourceRecords,
  spuFieldValues,
  spuProducts,
  starAthletes,
  starSports,
} from "@/lib/db/schema";
import type { AthleteEvaluationFilters, AthletePortfolioRecords, EvaluationListItem, EvaluationListResult } from "./types";

function dateEnd(value: string) {
  return new Date(`${value}T23:59:59.999Z`);
}

function runWhere(filters: AthleteEvaluationFilters) {
  const db = getDatabase();
  const clauses = [];
  if (filters.level && filters.level !== "all") clauses.push(eq(athleteEvaluationRuns.recommendedLevel, filters.level));
  if (filters.status && filters.status !== "all") clauses.push(eq(athleteEvaluationRuns.status, filters.status));
  if (filters.scenarioKey && filters.scenarioKey !== "all") clauses.push(eq(athleteEvaluationRuns.scenario, filters.scenarioKey));
  if (filters.workflowState && filters.workflowState !== "all") clauses.push(eq(athleteEvaluationRuns.workflowState, filters.workflowState));
  if (filters.search) {
    const search = `%${filters.search.replace(/[\\%_]/g, "\\$&")}%`;
    clauses.push(or(
      ilike(athleteEvaluationRuns.candidateName, search),
      exists(db.select({ id: starAthletes.id }).from(starAthletes).where(and(
        eq(starAthletes.id, athleteEvaluationRuns.athleteId),
        or(ilike(starAthletes.nameZh, search), ilike(starAthletes.nameEn, search), ilike(starAthletes.slug, search)),
      ))),
    ));
  }
  return and(...clauses);
}

function toListItem(row: typeof athleteEvaluationRuns.$inferSelect): EvaluationListItem {
  return {
    runId: row.id,
    athleteId: row.athleteId,
    candidateName: row.candidateName,
    ses: row.ses,
    status: row.status,
    coverage: row.coverage,
    eligibility: row.eligibility,
    baseLevel: row.baseLevel as EvaluationListItem["baseLevel"],
    recommendedLevel: row.recommendedLevel as EvaluationListItem["recommendedLevel"],
    scenarioKey: row.scenario,
    asOfDate: row.asOfDate,
    modelVersion: row.modelVersion,
    workflowState: row.workflowState,
  };
}

export async function listEvaluations(filters: AthleteEvaluationFilters = {}): Promise<EvaluationListResult> {
  const db = getDatabase();
  const where = runWhere(filters);
  const limit = Math.min(Math.max(filters.limit ?? 25, 1), 100);
  const offset = Math.max(filters.offset ?? 0, 0);
  const [rows, [totalRow]] = await Promise.all([
    db.select().from(athleteEvaluationRuns).where(where)
      .orderBy(desc(athleteEvaluationRuns.createdAt), desc(athleteEvaluationRuns.id))
      .limit(limit).offset(offset),
    db.select({ total: count() }).from(athleteEvaluationRuns).where(where),
  ]);
  return { items: rows.map(toListItem), total: totalRow?.total ?? 0 };
}

export async function getEvaluationRun(runId: string) {
  const db = getDatabase();
  const [row] = await db.select().from(athleteEvaluationRuns).where(eq(athleteEvaluationRuns.id, runId)).limit(1);
  return row ?? null;
}

export async function getEvaluationModel(version: string) {
  const db = getDatabase();
  const [row] = await db.select().from(athleteEvaluationModels).where(eq(athleteEvaluationModels.version, version)).limit(1);
  return row ?? null;
}

export async function listEvaluationModels() {
  return getDatabase().select().from(athleteEvaluationModels)
    .orderBy(desc(athleteEvaluationModels.active), desc(athleteEvaluationModels.publishedAt), desc(athleteEvaluationModels.version));
}

export async function getActiveEvaluationModel() {
  const [row] = await getDatabase().select().from(athleteEvaluationModels).where(eq(athleteEvaluationModels.active, true)).limit(1);
  return row ?? null;
}

export async function getEvaluationMetrics(runId: string) {
  return getDatabase().select().from(athleteEvaluationMetricScores)
    .where(eq(athleteEvaluationMetricScores.runId, runId))
    .orderBy(asc(athleteEvaluationMetricScores.metricKey));
}

export async function getEvaluationSources(metricScoreIds: string[]) {
  if (!metricScoreIds.length) return [];
  return getDatabase().select().from(athleteEvaluationSources)
    .where(inArray(athleteEvaluationSources.metricScoreId, metricScoreIds))
    .orderBy(desc(athleteEvaluationSources.publishedAt), desc(athleteEvaluationSources.observedAt));
}

export async function getAthleteForEvaluation(athleteId: string) {
  const [row] = await getDatabase().select({
    id: starAthletes.id,
    slug: starAthletes.slug,
    nameZh: starAthletes.nameZh,
    nameEn: starAthletes.nameEn,
    league: starAthletes.league,
    sportSlug: starSports.slug,
    published: starAthletes.published,
  }).from(starAthletes)
    .innerJoin(starSports, eq(starSports.id, starAthletes.sportId))
    .where(eq(starAthletes.id, athleteId)).limit(1);
  return row ?? null;
}

export async function searchNbaAthletes(search: string, limit = 12) {
  const term = `%${search.trim().replace(/[\\%_]/g, "\\$&")}%`;
  if (!search.trim()) return [];
  return getDatabase().select({
    id: starAthletes.id,
    slug: starAthletes.slug,
    nameZh: starAthletes.nameZh,
    nameEn: starAthletes.nameEn,
    league: starAthletes.league,
    teamSummary: starAthletes.teamsSummary,
  }).from(starAthletes)
    .innerJoin(starSports, eq(starSports.id, starAthletes.sportId))
    .where(and(
      eq(starSports.slug, "basketball"),
      ilike(starAthletes.league, "NBA"),
      eq(starAthletes.published, true),
      or(ilike(starAthletes.nameZh, term), ilike(starAthletes.nameEn, term), ilike(starAthletes.slug, term)),
    ))
    .orderBy(asc(starAthletes.sortOrder), asc(starAthletes.nameEn))
    .limit(Math.min(Math.max(limit, 1), 30));
}

export async function getPublishedNbaAthleteSources(athleteId: string, asOfDate: string) {
  return getDatabase().select({
    url: athleteSources.sourceUrl,
    publisher: athleteSources.publisher,
    title: athleteSources.title,
    publishedAt: athleteSources.publishedAt,
    excerpt: athleteSources.evidenceNote,
    shoeLineId: athleteSources.shoeLineId,
    claimScope: athleteSources.claimScope,
  }).from(athleteSources)
    .innerJoin(starAthletes, eq(starAthletes.id, athleteSources.athleteId))
    .innerJoin(starSports, eq(starSports.id, starAthletes.sportId))
    .where(and(
      eq(athleteSources.athleteId, athleteId),
      eq(athleteSources.verificationStatus, "verified"),
      eq(starAthletes.published, true),
      eq(starSports.slug, "basketball"),
      ilike(starAthletes.league, "NBA"),
      or(
        lte(athleteSources.publishedAt, asOfDate),
        and(isNull(athleteSources.publishedAt), lte(athleteSources.checkedAt, dateEnd(asOfDate))),
      ),
    ));
}

export async function getAthletePortfolioRecords(athleteId: string): Promise<AthletePortfolioRecords> {
  const db = getDatabase();
  const links = await db.select({
    lineId: athleteShoeLines.id,
    lineName: athleteShoeLines.lineName,
    relationshipType: athleteShoeLines.relationshipType,
    relationshipStatus: athleteShoeLines.relationshipStatus,
    startedYear: athleteShoeLines.startedYear,
    endedYear: athleteShoeLines.endedYear,
    spuId: spuProducts.id,
    spuName: spuProducts.name,
    tier: spuProducts.productTier,
    launchMarket: spuProducts.launchMarket,
  }).from(athleteShoeLineProducts)
    .innerJoin(athleteShoeLines, eq(athleteShoeLines.id, athleteShoeLineProducts.shoeLineId))
    .innerJoin(spuProducts, eq(spuProducts.id, athleteShoeLineProducts.spuId))
    .innerJoin(athleteSources, eq(athleteSources.id, athleteShoeLineProducts.sourceId))
    .where(and(
      eq(athleteShoeLines.athleteId, athleteId),
      eq(athleteShoeLineProducts.verificationStatus, "verified"),
      eq(athleteSources.verificationStatus, "verified"),
      isNull(spuProducts.archivedAt),
    ))
    .orderBy(asc(athleteShoeLines.sortOrder), asc(spuProducts.createdAt));

  if (!links.length) return { lines: [] };
  const spuIds = [...new Set(links.map((link) => link.spuId))];
  const [skus, releaseRows, colorRows, launchMarketSourceRows] = await Promise.all([
    db.select({ id: skuProducts.id, spuId: skuProducts.spuId, tier: skuProducts.productTier, launchMarket: skuProducts.launchMarket })
      .from(skuProducts).where(and(inArray(skuProducts.spuId, spuIds), isNull(skuProducts.archivedAt))),
    db.select({ spuId: spuFieldValues.spuId, key: modelFields.key, numberValue: spuFieldValues.numberValue, textValue: spuFieldValues.textValue, dateValue: spuFieldValues.dateValue })
      .from(spuFieldValues).innerJoin(modelFields, eq(modelFields.id, spuFieldValues.fieldId))
      .where(and(inArray(spuFieldValues.spuId, spuIds), inArray(modelFields.key, ["release_year", "launch_year", "release_date"]), isNull(modelFields.archivedAt))),
    db.select({ skuId: skuFieldValues.skuId, colorName: skuFieldValues.textValue })
      .from(skuFieldValues).innerJoin(modelFields, eq(modelFields.id, skuFieldValues.fieldId))
      .where(and(inArray(modelFields.key, ["color_name"]), inArray(skuFieldValues.skuId, db.select({ id: skuProducts.id }).from(skuProducts).where(and(inArray(skuProducts.spuId, spuIds), isNull(skuProducts.archivedAt)))), isNull(modelFields.archivedAt))),
    db.select({ spuId: sourceRecords.spuId, skuId: sourceRecords.skuId })
      .from(sourceRecords)
      .where(and(eq(sourceRecords.verificationStatus, "verified"), inArray(sourceRecords.sourceType, ["launch_market", "launch-market", "product_launch_market", "product-launch-market"]), or(inArray(sourceRecords.spuId, spuIds), inArray(sourceRecords.skuId, db.select({ id: skuProducts.id }).from(skuProducts).where(and(inArray(skuProducts.spuId, spuIds), isNull(skuProducts.archivedAt))))))),
  ]);
  const skuBySpu = new Map<string, typeof skus>();
  for (const sku of skus) skuBySpu.set(sku.spuId, [...(skuBySpu.get(sku.spuId) ?? []), sku]);
  const skuIds = skus.map(({ id }) => id);
  const colorBySku = new Map(colorRows.map((row) => [row.skuId, row.colorName?.trim() || null]));
  const verifiedSpuLaunchMarkets = new Set(launchMarketSourceRows.flatMap((row) => row.spuId ? [row.spuId] : []));
  const verifiedSkuLaunchMarkets = new Set(launchMarketSourceRows.flatMap((row) => row.skuId ? [row.skuId] : []));
  const [prices, availability] = skuIds.length ? await Promise.all([
    db.select({ skuId: priceObservations.skuId, amount: priceObservations.amount, currency: priceObservations.currency, priceBasis: priceObservations.priceBasis, observedAt: priceObservations.observedAt, sourceUrl: sourceRecords.url, sourceType: sourceRecords.sourceType, market: sourceRecords.market, evidence: sourceRecords.evidenceText })
      .from(priceObservations).innerJoin(sourceRecords, eq(sourceRecords.id, priceObservations.sourceRecordId))
      .where(and(inArray(priceObservations.skuId, skuIds), eq(sourceRecords.verificationStatus, "verified"))),
    db.select({ skuId: availabilityObservations.skuId, status: availabilityObservations.status, observedAt: availabilityObservations.observedAt, sourceUrl: sourceRecords.url, sourceType: sourceRecords.sourceType, market: sourceRecords.market, evidence: sourceRecords.evidenceText })
      .from(availabilityObservations).innerJoin(sourceRecords, eq(sourceRecords.id, availabilityObservations.sourceRecordId))
      .where(and(inArray(availabilityObservations.skuId, skuIds), eq(sourceRecords.verificationStatus, "verified"))),
  ]) : [[], []];

  const releaseYearBySpu = new Map<string, number>();
  for (const row of releaseRows) {
    const value = row.numberValue ?? Number(row.dateValue?.slice(0, 4) ?? row.textValue?.match(/\b(19|20|21)\d{2}\b/)?.[0]);
    if (Number.isInteger(value) && value >= 1900 && value <= 2200) releaseYearBySpu.set(row.spuId, value);
  }
  const linesById = new Map<string, AthletePortfolioRecords["lines"][number]>();
  const modelBySpu = new Map<string, AthletePortfolioRecords["lines"][number]["models"][number]>();
  for (const link of links) {
    let line = linesById.get(link.lineId);
    if (!line) {
      line = {
        lineName: link.lineName,
        relationshipType: link.relationshipType as "signature" | "endorsement",
        relationshipStatus: link.relationshipStatus as "current" | "historical",
        startedYear: link.startedYear,
        endedYear: link.endedYear,
        models: [],
      };
      linesById.set(link.lineId, line);
    }
    let model = modelBySpu.get(link.spuId);
    if (!model) {
      const skuRows = skuBySpu.get(link.spuId) ?? [];
      model = {
        spuId: link.spuId,
        spuName: link.spuName,
        tier: link.tier ?? null,
        launchMarket: verifiedSpuLaunchMarkets.has(link.spuId) ? link.launchMarket ?? null : null,
        launchMarketVerified: verifiedSpuLaunchMarkets.has(link.spuId),
        releaseYear: releaseYearBySpu.get(link.spuId) ?? null,
        skuCount: skuRows.length,
        skuDetails: skuRows.map((sku) => {
          const skuMarketVerified = verifiedSkuLaunchMarkets.has(sku.id);
          const spuMarketVerified = verifiedSpuLaunchMarkets.has(link.spuId);
          return {
            tier: sku.tier ?? link.tier ?? null,
            launchMarket: skuMarketVerified ? sku.launchMarket ?? (spuMarketVerified ? link.launchMarket ?? null : null) : spuMarketVerified ? link.launchMarket ?? null : null,
            launchMarketVerified: skuMarketVerified || spuMarketVerified,
            colorName: colorBySku.get(sku.id) ?? null,
          };
        }),
        prices: prices.filter((price) => skuRows.some((sku) => sku.id === price.skuId)).map((price) => ({
          amount: String(price.amount), currency: price.currency, priceBasis: price.priceBasis, observedAt: price.observedAt.toISOString(),
          sourceUrl: price.sourceUrl, sourceType: price.sourceType, market: price.market, evidence: price.evidence,
        })),
        availability: availability.filter((item) => skuRows.some((sku) => sku.id === item.skuId)).map((item) => ({
          status: item.status, observedAt: item.observedAt.toISOString(), sourceUrl: item.sourceUrl, sourceType: item.sourceType,
          market: item.market, evidence: item.evidence,
        })),
      };
      modelBySpu.set(link.spuId, model);
      line.models.push(model);
    }
  }
  return { lines: [...linesById.values()] };
}
