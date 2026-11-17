import { AppError, localeFromCookie, readJson } from "@/lib/api-response";
import { withAdminApiErrors } from "@/lib/auth/guard";
import { addResearchSuggestions } from "@/lib/athlete-evaluations/service";
import { getResearchProvider } from "@/lib/athlete-evaluations/research-provider";
import { searchNbaAthletes } from "@/lib/athlete-evaluations/queries";
import { parseEvaluationCreationInput, parseManualResearchSources } from "@/lib/athlete-evaluations/validation";
import type { EvaluationScenarioKey } from "@/lib/athlete-evaluations/types";

const SCENARIOS: EvaluationScenarioKey[] = ["china-priority", "north-america", "product-portfolio"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  return withAdminApiErrors(request, async () => {
    const body = await readJson(request);
    if (!isRecord(body)) throw new AppError("VALIDATION_ERROR", "检索请求格式不正确。", 422);

    if (Array.isArray(body.sources)) {
      const runId = typeof body.runId === "string" ? body.runId : "";
      const metricKey = typeof body.metricKey === "string" ? body.metricKey : "";
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(runId)) {
        throw new AppError("INVALID_ID", "评估编号无效。", 422);
      }
      const sources = parseManualResearchSources(body.sources);
      return { mode: "manual", sources: await addResearchSuggestions(runId, metricKey, sources) };
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const asOfDate = typeof body.asOfDate === "string" ? body.asOfDate : "";
    const market = body.market === "china" || body.market === "north-america" ? body.market : null;
    const scenarioKey = typeof body.scenarioKey === "string" && SCENARIOS.includes(body.scenarioKey as EvaluationScenarioKey)
      ? body.scenarioKey as EvaluationScenarioKey
      : null;
    if (!name || name.length > 180 || !market || !scenarioKey) {
      throw new AppError("VALIDATION_ERROR", "请填写球员姓名、评估日期、目标市场和评分情景。", 422);
    }
    parseEvaluationCreationInput({ name, candidateName: name, asOfDate, market, scenarioKey });
    const provider = getResearchProvider();
    const candidates = await searchNbaAthletes(name, 15);
    if (!provider) {
      return {
        mode: "manual_evidence",
        providerAvailable: false,
        message: localeFromCookie(request.headers.get("cookie")) === "en"
          ? "No web research provider is configured. Search public sources manually, then add the URL, publisher, title, date and excerpt below. Model API settings do not provide web search."
          : "尚未配置网页检索提供方。请手动查找公开资料，并填写来源链接、发布者、标题、日期和摘录。大模型 API 配置不等于联网检索。",
        candidates,
      };
    }
    const sources = await provider.search({ name, asOfDate, market, locale: localeFromCookie(request.headers.get("cookie")) });
    const runId = typeof body.runId === "string" ? body.runId : "";
    const metricKey = typeof body.metricKey === "string" ? body.metricKey : "";
    if (runId || metricKey) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(runId) || !metricKey) {
        throw new AppError("VALIDATION_ERROR", "关联评估和指标信息不完整。", 422);
      }
      return { mode: "provider", providerAvailable: true, sources: await addResearchSuggestions(runId, metricKey, sources) };
    }
    return { mode: "provider", providerAvailable: true, sources };
  });
}
