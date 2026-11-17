import { AppError, readJson } from "@/lib/api-response";
import { withAdminApiErrors } from "@/lib/auth/guard";
import { updateEvaluationMetric } from "@/lib/athlete-evaluations/service";

type RouteContext = { params: Promise<{ runId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  return withAdminApiErrors(request, async () => {
    const { runId } = await context.params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(runId)) {
      throw new AppError("INVALID_ID", "评估编号无效。", 422);
    }
    return updateEvaluationMetric(runId, await readJson(request));
  });
}
