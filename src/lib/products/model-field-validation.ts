import { z } from "zod";
import type { ProductFieldType } from "@/lib/products/types";

const fieldTypes = [
  "short_text",
  "long_text",
  "number",
  "boolean",
  "date",
  "url",
  "select",
  "multiselect",
] as const;

function refineOptions(
  value: { type: ProductFieldType; options: string[]; isUnique: boolean },
  context: z.RefinementCtx,
) {
  const cleaned = value.options.map((option) => option.trim()).filter(Boolean);
  if (["select", "multiselect"].includes(value.type) && cleaned.length === 0) {
    context.addIssue({ code: "custom", path: ["options"], message: "单选和多选字段至少需要一个选项。" });
  }
  if (!["select", "multiselect"].includes(value.type) && cleaned.length > 0) {
    context.addIssue({ code: "custom", path: ["options"], message: "只有单选和多选字段可以配置选项。" });
  }
  if (new Set(cleaned).size !== cleaned.length) {
    context.addIssue({ code: "custom", path: ["options"], message: "选项不能重复。" });
  }
  if (value.isUnique && value.type === "multiselect") {
    context.addIssue({ code: "custom", path: ["isUnique"], message: "多选字段不支持设置唯一值。" });
  }
}

export const createModelFieldSchema = z
  .object({
    level: z.enum(["spu", "sku"]),
    key: z
      .string()
      .trim()
      .min(2, "字段编码至少需要 2 个字符。")
      .max(80, "字段编码不能超过 80 个字符。")
      .regex(/^[a-z][a-z0-9_]*$/, "字段编码只支持小写英文、数字和下划线，并以英文开头。"),
    label: z.string().trim().min(1, "请填写字段名称。").max(120, "字段名称不能超过 120 个字符。"),
    type: z.enum(fieldTypes),
    required: z.boolean().default(false),
    isUnique: z.boolean().default(false),
    options: z.array(z.string().trim().min(1)).default([]),
    searchable: z.boolean().default(false),
    showInList: z.boolean().default(false),
    sortOrder: z.number().finite().default(0),
  })
  .superRefine(refineOptions);

export const updateModelFieldSchema = z
  .object({
    label: z.string().trim().min(1, "请填写字段名称。").max(120, "字段名称不能超过 120 个字符。"),
    type: z.enum(fieldTypes),
    required: z.boolean(),
    isUnique: z.boolean(),
    options: z.array(z.string().trim().min(1)),
    searchable: z.boolean(),
    showInList: z.boolean(),
    sortOrder: z.number().finite(),
  })
  .superRefine(refineOptions);

export type CreateModelFieldInput = z.infer<typeof createModelFieldSchema>;
export type UpdateModelFieldInput = z.infer<typeof updateModelFieldSchema>;
