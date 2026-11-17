import { AppError, readJson } from "@/lib/api-response";
import { withAdminApiErrors } from "@/lib/auth/guard";
import { recalculateEvaluation } from "@/lib/athlete-evaluations/service";

type RouteContext = { params: Promise<{ runId: string }> };

export async function POST(request: Request, context: RouteContext) {
  return withAdminApiErrors(request, async () => {
    const { runId } = await context.params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(runId)) {
      throw new AppError("INVALID_ID", "评估编号无效。", 422);
    }
    const body = await readJson(request) as { modelVersion?: unknown };
    if (typeof body.modelVersion !== "string" || body.modelVersion.length > 40) {
      throw new AppError("VALIDATION_ERROR", "请选择有效的模型版本。", 422);
    }
    return recalculateEvaluation(runId, body.modelVersion);
  }, 201);
}
