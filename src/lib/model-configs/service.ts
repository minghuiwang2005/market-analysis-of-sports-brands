import "server-only";
import { and, desc, eq, ne } from "drizzle-orm";
import { AppError } from "@/lib/api-response";
import { getDatabase } from "@/lib/db";
import { llmModelConfigs } from "@/lib/db/schema";
import { encryptApiKey } from "@/lib/model-configs/encryption";
import type { CreateModelConfigInput, UpdateModelConfigInput } from "@/lib/model-configs/validation";

export type ModelConfigSummary = {
  id: string; name: string; baseUrl: string; model: string; apiKeyMasked: string;
  priority: number; timeoutSeconds: number; reasoningEnabled: boolean; enabled: boolean; isDefault: boolean;
  lastTestStatus: string; lastTestedAt: string | null; lastTestMessage: string | null;
};

function summary(row: typeof llmModelConfigs.$inferSelect): ModelConfigSummary {
  return {
    id: row.id, name: row.name, baseUrl: row.baseUrl, model: row.model,
    apiKeyMasked: `••••${row.apiKeyLast4}`, priority: row.priority, timeoutSeconds: row.timeoutSeconds,
    reasoningEnabled: row.reasoningEnabled, enabled: row.enabled, isDefault: row.isDefault,
    lastTestStatus: row.lastTestStatus, lastTestedAt: row.lastTestedAt?.toISOString() ?? null,
    lastTestMessage: row.lastTestMessage,
  };
}

export async function listModelConfigs() {
  const rows = await getDatabase().select().from(llmModelConfigs).orderBy(desc(llmModelConfigs.isDefault), llmModelConfigs.priority, desc(llmModelConfigs.createdAt));
  return rows.map(summary);
}

export async function createModelConfig(input: CreateModelConfigInput) {
  const encrypted = encryptApiKey(input.apiKey);
  const db = getDatabase();
  const [created] = await db.transaction(async (tx) => {
    if (input.isDefault) await tx.update(llmModelConfigs).set({ isDefault: false, updatedAt: new Date() }).where(eq(llmModelConfigs.isDefault, true));
    return tx.insert(llmModelConfigs).values({
      name: input.name, baseUrl: input.baseUrl, model: input.model, apiKeyCiphertext: encrypted.ciphertext,
      apiKeyIv: encrypted.iv, apiKeyAuthTag: encrypted.authTag, apiKeyLast4: encrypted.last4, keyVersion: encrypted.keyVersion,
      priority: input.priority, timeoutSeconds: input.timeoutSeconds, reasoningEnabled: input.reasoningEnabled,
      enabled: input.enabled, isDefault: input.isDefault && input.enabled,
    }).returning();
  });
  return summary(created);
}

export async function updateModelConfig(id: string, input: UpdateModelConfigInput) {
  const db = getDatabase();
  const encrypted = input.apiKey ? encryptApiKey(input.apiKey) : null;
  const [updated] = await db.transaction(async (tx) => {
    const [existing] = await tx.select({ id: llmModelConfigs.id }).from(llmModelConfigs).where(eq(llmModelConfigs.id, id)).limit(1);
    if (!existing) throw new AppError("MODEL_CONFIG_NOT_FOUND", "模型配置不存在。", 404);
    if (input.isDefault && input.enabled) await tx.update(llmModelConfigs).set({ isDefault: false, updatedAt: new Date() }).where(and(eq(llmModelConfigs.isDefault, true), ne(llmModelConfigs.id, id)));
    return tx.update(llmModelConfigs).set({
      name: input.name, baseUrl: input.baseUrl, model: input.model, priority: input.priority,
      timeoutSeconds: input.timeoutSeconds, reasoningEnabled: input.reasoningEnabled, enabled: input.enabled,
      isDefault: input.isDefault && input.enabled,
      ...(encrypted ? { apiKeyCiphertext: encrypted.ciphertext, apiKeyIv: encrypted.iv, apiKeyAuthTag: encrypted.authTag, apiKeyLast4: encrypted.last4, keyVersion: encrypted.keyVersion } : {}),
      updatedAt: new Date(),
    }).where(eq(llmModelConfigs.id, id)).returning();
  });
  return summary(updated);
}

export async function deleteModelConfig(id: string) {
  const deleted = await getDatabase().delete(llmModelConfigs).where(eq(llmModelConfigs.id, id)).returning({ id: llmModelConfigs.id });
  if (!deleted.length) throw new AppError("MODEL_CONFIG_NOT_FOUND", "模型配置不存在。", 404);
}

export async function updateModelTestResult(id: string, status: "success" | "failed", message: string | null) {
  await getDatabase().update(llmModelConfigs).set({ lastTestStatus: status, lastTestedAt: new Date(), lastTestMessage: message, updatedAt: new Date() }).where(eq(llmModelConfigs.id, id));
}

export async function getModelConfigSecret(id: string) {
  const [row] = await getDatabase().select().from(llmModelConfigs).where(eq(llmModelConfigs.id, id)).limit(1);
  if (!row) throw new AppError("MODEL_CONFIG_NOT_FOUND", "模型配置不存在。", 404);
  return row;
}
