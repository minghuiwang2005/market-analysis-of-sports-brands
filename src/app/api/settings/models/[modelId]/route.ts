import { AppError, readJson } from "@/lib/api-response";
import { withAdminApiErrors } from "@/lib/auth/guard";
import { deleteModelConfig, getModelConfigSecret, updateModelConfig } from "@/lib/model-configs/service";
import { updateModelConfigSchema } from "@/lib/model-configs/validation";

type ModelContext = { params: Promise<{ modelId: string }> };

export async function GET(request: Request, context: ModelContext) {
  return withAdminApiErrors(request, async () => {
    const { modelId } = await context.params;
    const row = await getModelConfigSecret(modelId);
    return { id: row.id, name: row.name, baseUrl: row.baseUrl, model: row.model, apiKeyMasked: `••••${row.apiKeyLast4}`, priority: row.priority, timeoutSeconds: row.timeoutSeconds, reasoningEnabled: row.reasoningEnabled, enabled: row.enabled, isDefault: row.isDefault };
  });
}

export async function PATCH(request: Request, context: ModelContext) {
  return withAdminApiErrors(request, async () => {
    const parsed = updateModelConfigSchema.safeParse(await readJson(request));
    if (!parsed.success) throw new AppError("INVALID_MODEL_CONFIG", "请检查模型配置字段。", 422, Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message])));
    return updateModelConfig((await context.params).modelId, parsed.data);
  });
}

export async function DELETE(request: Request, context: ModelContext) {
  return withAdminApiErrors(request, async () => { await deleteModelConfig((await context.params).modelId); return { deleted: true }; });
}
