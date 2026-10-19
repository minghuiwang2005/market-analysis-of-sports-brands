import "server-only";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { AppError } from "@/lib/api-response";
import { getDatabase } from "@/lib/db";
import { modelFields, skuFieldValues, spuFieldValues } from "@/lib/db/schema";
import {
  createModelFieldSchema,
  updateModelFieldSchema,
  type CreateModelFieldInput,
  type UpdateModelFieldInput,
} from "@/lib/products/model-field-validation";
import type { ModelFieldDto, ProductLevel } from "@/lib/products/types";

function parseInput<T>(schema: z.ZodType<T>, input: unknown) {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const details = Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message]));
  throw new AppError("VALIDATION_ERROR", "请检查字段设置。", 422, details);
}

export function toModelFieldDto(row: typeof modelFields.$inferSelect): ModelFieldDto {
  return {
    id: row.id,
    level: row.level,
    key: row.key,
    label: row.label,
    type: row.type,
    required: row.required,
    isUnique: row.isUnique,
    options: row.options ?? [],
    searchable: row.searchable,
    showInList: row.showInList,
    sortOrder: row.sortOrder,
    isSystem: row.isSystem,
    archivedAt: row.archivedAt?.toISOString() ?? null,
  };
}

export async function listModelFields(level: ProductLevel, includeArchived = false) {
  const db = getDatabase();
  const rows = await db
    .select()
    .from(modelFields)
    .where(and(eq(modelFields.level, level), includeArchived ? undefined : isNull(modelFields.archivedAt)))
    .orderBy(asc(modelFields.sortOrder), asc(modelFields.createdAt));
  return rows.map(toModelFieldDto);
}

export async function createModelField(input: unknown) {
  const data = parseInput<CreateModelFieldInput>(createModelFieldSchema, input);
  const db = getDatabase();
  const [field] = await db.insert(modelFields).values(data).returning();
  return toModelFieldDto(field);
}

export async function updateModelField(id: string, input: unknown) {
  const data = parseInput<UpdateModelFieldInput>(updateModelFieldSchema, input);
  const db = getDatabase();
  const [current] = await db
    .select()
    .from(modelFields)
    .where(and(eq(modelFields.id, id), isNull(modelFields.archivedAt)))
    .limit(1);

  if (!current) throw new AppError("FIELD_NOT_FOUND", "找不到该字段，或字段已归档。", 404);
  if (current.isSystem && (
    data.type !== current.type ||
    data.required !== current.required ||
    data.isUnique !== current.isUnique ||
    JSON.stringify(data.options) !== JSON.stringify(current.options) ||
    data.searchable !== current.searchable ||
    data.showInList !== current.showInList ||
    data.sortOrder !== current.sortOrder
  )) {
    throw new AppError("SYSTEM_FIELD_LOCKED", "系统字段只能修改展示名称。", 409);
  }

  if (data.type !== current.type) {
    const values = current.level === "spu" ? spuFieldValues : skuFieldValues;
    const key = current.level === "spu" ? spuFieldValues.fieldId : skuFieldValues.fieldId;
    const [storedValue] = await db
      .select({ id: values.id })
      .from(values)
      .where(eq(key, id))
      .limit(1);
    if (storedValue) {
      throw new AppError("FIELD_TYPE_HAS_VALUES", "该字段已有商品值，请先归档并新建其他类型的字段。", 409, { type: "字段已有数据" });
    }
  }

  if (!current.isUnique && data.isUnique) {
    const tableName = current.level === "spu" ? "spu_field_values" : "sku_field_values";
    const columnName = ["short_text", "long_text", "url", "select"].includes(current.type)
      ? "text_value"
      : current.type === "number"
        ? "number_value"
        : current.type === "boolean"
          ? "boolean_value"
          : current.type === "date"
            ? "date_value"
            : null;
    if (columnName) {
      const duplicates = await db.execute(sql`select 1 from ${sql.identifier(tableName)} where field_id = ${id} and ${sql.identifier(columnName)} is not null group by ${sql.identifier(columnName)} having count(*) > 1 limit 1`);
      if (duplicates.rows.length) {
        throw new AppError("FIELD_VALUES_NOT_UNIQUE", "该字段已有重复值，清理重复商品值后再开启唯一限制。", 409);
      }
    }
  }

  const [updated] = await db
    .update(modelFields)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(modelFields.id, id))
    .returning();
  return toModelFieldDto(updated);
}

export async function archiveModelField(id: string) {
  const db = getDatabase();
  const [current] = await db
    .select({ id: modelFields.id, isSystem: modelFields.isSystem, archivedAt: modelFields.archivedAt })
    .from(modelFields)
    .where(eq(modelFields.id, id))
    .limit(1);

  if (!current) throw new AppError("FIELD_NOT_FOUND", "找不到该字段。", 404);
  if (current.isSystem) throw new AppError("SYSTEM_FIELD_LOCKED", "系统字段不能归档。", 409);
  if (current.archivedAt) return { id, archived: true };

  await db
    .update(modelFields)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(eq(modelFields.id, id));
  return { id, archived: true };
}
