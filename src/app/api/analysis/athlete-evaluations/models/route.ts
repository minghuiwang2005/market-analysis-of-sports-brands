import { AppError, readJson } from "@/lib/api-response";
import { requireAdminSession, withAdminApiErrors } from "@/lib/auth/guard";
import { createModelVersion, listEvaluationModels } from "@/lib/athlete-evaluations/service";

export async function GET(request: Request) {
  return withAdminApiErrors(request, listEvaluationModels);
}

export async function POST(request: Request) {
  return withAdminApiErrors(request, async () => {
    const session = requireAdminSession(request);
    const body = await readJson(request);
    if (typeof body !== "object" || body === null || !("configuration" in body) || !("changeNote" in body)) {
      throw new AppError("VALIDATION_ERROR", "模型配置缺少版本变更说明。", 422);
    }
    return createModelVersion(body.configuration, body.changeNote, session.subject);
  }, 201);
}
