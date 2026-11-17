import { AppError, readJson } from "@/lib/api-response";
import { withAdminApiErrors } from "@/lib/auth/guard";
import { localeFromCookie } from "@/lib/api-response";
import { createEvaluation, listEvaluations } from "@/lib/athlete-evaluations/service";
import { getAthleteForEvaluation, searchNbaAthletes } from "@/lib/athlete-evaluations/queries";
import { parseEvaluationCreationInput, parseListFilters } from "@/lib/athlete-evaluations/validation";
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  return withAdminApiErrors(request, async () => {
    const url = new URL(request.url);
    const athleteSearch = url.searchParams.get("athleteSearch");
    if (athleteSearch !== null) return { candidates: await searchNbaAthletes(athleteSearch) };
    return listEvaluations(parseListFilters(url.searchParams));
  });
}

export async function POST(request: Request) {
  return withAdminApiErrors(request, async () => {
    const body = await readJson(request);
    if (typeof body === "object" && body !== null && "athleteIds" in body) {
      const value = body as Record<string, unknown>;
      if (!Array.isArray(value.athleteIds) || value.athleteIds.length < 1 || value.athleteIds.length > 100
        || value.athleteIds.some((id) => typeof id !== "string" || !ID.test(id))) {
        throw new AppError("VALIDATION_ERROR", "请提供 1–100 个有效的 NBA 球员编号。", 422, { athleteIds: "球员编号无效" });
      }
      if (new Set(value.athleteIds).size !== value.athleteIds.length) throw new AppError("VALIDATION_ERROR", "球员编号不能重复。", 422);
      const locale = localeFromCookie(request.headers.get("cookie"));
      const output = [];
      for (const athleteId of value.athleteIds as string[]) {
        const athlete = await getAthleteForEvaluation(athleteId);
        if (!athlete || athlete.sportSlug !== "basketball" || athlete.league?.toLocaleLowerCase("en-US") !== "nba" || !athlete.published) {
          throw new AppError("NBA_ATHLETE_NOT_FOUND", "请选择已发布的 NBA 球员档案。", 404);
        }
        const input = parseEvaluationCreationInput({
          ...value,
          athleteId,
          candidateName: locale === "en" ? athlete.nameEn : athlete.nameZh,
        });
        output.push(await createEvaluation(input));
      }
      return { items: output };
    }

    const parsed = parseEvaluationCreationInput(body);
    if (!parsed.athleteId) {
      const candidates = await searchNbaAthletes(parsed.candidateName, 30);
      const exact = candidates.filter((candidate) =>
        candidate.nameZh.toLocaleLowerCase() === parsed.candidateName.toLocaleLowerCase()
        || candidate.nameEn.toLocaleLowerCase() === parsed.candidateName.toLocaleLowerCase(),
      );
      if (exact.length > 1) return { state: "disambiguation_required", candidates: exact };
      if (exact.length === 1) parsed.athleteId = exact[0]!.id;
    }
    return createEvaluation(parsed);
  }, 201);
}
