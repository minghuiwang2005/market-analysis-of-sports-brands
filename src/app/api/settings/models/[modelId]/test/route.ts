import { AppError } from "@/lib/api-response";
import { withAdminApiErrors } from "@/lib/auth/guard";
import { getModelConfigSecret, updateModelTestResult } from "@/lib/model-configs/service";
import { testModelConnection } from "@/lib/model-configs/connection-test";

export async function POST(request: Request, context: { params: Promise<{ modelId: string }> }) {
  return withAdminApiErrors(request, async () => {
    const { modelId } = await context.params;
    const config = await getModelConfigSecret(modelId);
    try {
      await testModelConnection(config);
      await updateModelTestResult(modelId, "success", null);
      return { success: true, message: "连接成功。" };
    } catch (error) {
      const message = error instanceof AppError ? error.message : error instanceof Error && error.message === "timeout" ? "连接超时。请检查服务响应速度或调高超时时间。" : "连接失败。请检查网络、接口地址和服务配置。";
      await updateModelTestResult(modelId, "failed", message);
      throw error instanceof AppError ? error : new AppError("MODEL_TEST_FAILED", message, 422);
    }
  });
}
