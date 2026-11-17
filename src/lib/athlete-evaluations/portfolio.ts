import type { AthletePortfolioRecords, AthletePortfolioSummary } from "./types";

const PRODUCT_TIERS = ["signature_retail", "pe", "regional_exclusive", "retro", "collab"] as const;

function percentage(part: number, total: number): number | null {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : null;
}

function isChinaMarket(value: string) {
  const normalized = value.trim().toLocaleLowerCase("en-US");
  return normalized === "china" || normalized === "cn" || normalized === "中国";
}

export function summarizeAthletePortfolio(records: AthletePortfolioRecords): AthletePortfolioSummary {
  const models = records.lines.flatMap((line) => line.models);
  const skuCount = models.reduce((sum, model) => sum + model.skuCount, 0);
  const modelCountsByTier = Object.fromEntries(PRODUCT_TIERS.map((tier) => [tier, 0]));
  const skuCountsByTier = Object.fromEntries(PRODUCT_TIERS.map((tier) => [tier, 0]));
  let classifiedModels = 0;
  let classifiedTierSkus = 0;
  let verifiedMarketSkus = 0;
  let chinaSkus = 0;
  let classifiedColorSkus = 0;
  const uniqueColorways = new Set<string>();
  let observedPriceCount = 0;
  let observedAvailabilityCount = 0;
  let modelsWithPrices = 0;
  let modelsWithAvailability = 0;
  const releaseYearCounts = new Map<number, number>();

  for (const model of models) {
    if (model.tier && Object.hasOwn(modelCountsByTier, model.tier)) {
      modelCountsByTier[model.tier] += 1;
      classifiedModels += 1;
    }
    if (model.releaseYear !== null) releaseYearCounts.set(model.releaseYear, (releaseYearCounts.get(model.releaseYear) ?? 0) + 1);
    const skuDetails = model.skuDetails ?? [];
    for (const sku of skuDetails) {
      if (sku.tier && Object.hasOwn(skuCountsByTier, sku.tier)) {
        skuCountsByTier[sku.tier] += 1;
        classifiedTierSkus += 1;
      }
      if (sku.launchMarketVerified && sku.launchMarket) {
        verifiedMarketSkus += 1;
        if (isChinaMarket(sku.launchMarket)) chinaSkus += 1;
      }
      if (sku.colorName?.trim()) {
        classifiedColorSkus += 1;
        uniqueColorways.add(`${model.spuId}:${sku.colorName.trim().toLocaleLowerCase("en-US")}`);
      }
    }
    if (model.prices.length) modelsWithPrices += 1;
    if (model.availability.length) modelsWithAvailability += 1;
    observedPriceCount += model.prices.length;
    observedAvailabilityCount += model.availability.length;
  }

  const totalColorSkus = models.reduce((sum, model) => sum + model.skuCount, 0);
  return {
    lineCount: records.lines.length,
    modelCount: models.length,
    skuCount,
    countsByTier: skuCountsByTier,
    modelCountsByTier,
    skuCountsByTier,
    modelTierCoverage: { classifiedModels, totalModels: models.length, percentage: percentage(classifiedModels, models.length) },
    skuTierCoverage: { classifiedSkus: classifiedTierSkus, totalSkus: skuCount, percentage: percentage(classifiedTierSkus, skuCount) },
    releaseYearCadence: [...releaseYearCounts.entries()].sort(([yearA], [yearB]) => yearA - yearB).map(([year, modelCount]) => ({ year, modelCount })),
    regionalModelShare: percentage(chinaSkus, verifiedMarketSkus),
    launchMarketCoverage: {
      classifiedSkus: verifiedMarketSkus,
      totalSkus: skuCount,
      percentage: percentage(verifiedMarketSkus, skuCount),
    },
    colorwayCoverage: {
      classifiedSkus: classifiedColorSkus,
      totalSkus: totalColorSkus,
      percentage: percentage(classifiedColorSkus, totalColorSkus),
      uniqueColorways: uniqueColorways.size,
    },
    observationCoverage: {
      modelCount: models.length,
      modelsWithPrices,
      modelsWithAvailability,
      pricePercentage: percentage(modelsWithPrices, models.length),
      availabilityPercentage: percentage(modelsWithAvailability, models.length),
    },
    observedPriceCount,
    observedAvailabilityCount,
    lines: records.lines,
  };
}
