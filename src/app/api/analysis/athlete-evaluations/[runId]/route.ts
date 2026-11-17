import { AppError } from "@/lib/api-response";
import { withAdminApiErrors } from "@/lib/auth/guard";
import { getEvaluation } from "@/lib/athlete-evaluations/service";

type RouteContext = { params: Promise<{ runId: string }> };

export async function GET(request: Request, context: RouteContext) {
  return withAdminApiErrors(request, async () => {
    const { runId } = await context.params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(runId)) {
      throw new AppError("INVALID_ID", "评估编号无效。", 422);
    }
    const evaluation = await getEvaluation(runId);
    if (!evaluation) throw new AppError("EVALUATION_NOT_FOUND", "评估记录不存在。", 404);
    return evaluation;
  });
}
