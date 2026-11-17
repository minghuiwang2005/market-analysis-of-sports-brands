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
      const timeout = error instanceof Error && error.message === "timeout";
      const networkCode = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : null;
      const testError = error instanceof AppError
        ? error
        : timeout
          ? new AppError("MODEL_TEST_TIMEOUT", "连接超时。请检查服务响应速度或调高超时时间。", 504, { diagnostic: `No response within ${config.timeoutSeconds} seconds.` })
          : new AppError("MODEL_TEST_FAILED", "连接失败。请检查网络、接口地址和服务配置。", 502, { diagnostic: networkCode ? `Network error: ${networkCode}` : "Network or TLS connection failed." });
      await updateModelTestResult(modelId, "failed", testError.details?.diagnostic ?? null);
      throw testError;
    }
  });
}
