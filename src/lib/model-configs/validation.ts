import { z } from "zod";

const baseFields = {
  name: z.string().trim().min(1, "请填写名称。 ").max(120),
  baseUrl: z.string().trim().url("请输入有效的接口地址。").max(500).refine((value) => {
    try { const url = new URL(value); return url.protocol === "https:" && (!url.port || url.port === "443") && !url.username && !url.password; }
    catch { return false; }
  }, "模型接口地址必须使用标准 HTTPS 公网地址。"),
  model: z.string().trim().min(1, "请填写模型名称。 ").max(200),
  priority: z.number().int().min(1).max(9999),
  timeoutSeconds: z.number().int().min(1).max(180),
  reasoningEnabled: z.boolean(),
  enabled: z.boolean(),
  isDefault: z.boolean(),
};

export const createModelConfigSchema = z.object({ ...baseFields, apiKey: z.string().min(1, "新建配置需要 API Key。 ").max(4096) });
export const updateModelConfigSchema = z.object({ ...baseFields, apiKey: z.string().max(4096).optional().default("") });
export type CreateModelConfigInput = z.infer<typeof createModelConfigSchema>;
export type UpdateModelConfigInput = z.infer<typeof updateModelConfigSchema>;
