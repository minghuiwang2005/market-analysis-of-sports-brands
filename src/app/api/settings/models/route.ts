import { AppError, readJson } from "@/lib/api-response";
import { withAdminApiErrors } from "@/lib/auth/guard";
import { createModelConfig, listModelConfigs } from "@/lib/model-configs/service";
import { createModelConfigSchema } from "@/lib/model-configs/validation";

export async function GET(request: Request) {
  return withAdminApiErrors(request, listModelConfigs);
}

export async function POST(request: Request) {
  return withAdminApiErrors(request, async () => {
    const parsed = createModelConfigSchema.safeParse(await readJson(request));
    if (!parsed.success) throw new AppError("INVALID_MODEL_CONFIG", "请检查模型配置字段。", 422, Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message])));
    return createModelConfig(parsed.data);
  }, 201);
}
