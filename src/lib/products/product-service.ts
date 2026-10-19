import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { AppError } from "@/lib/api-response";
import { getDatabase } from "@/lib/db";
import {
  modelFields,
  productCodeRegistry,
  skuFieldValues,
  skuProducts,
  spuFieldValues,
  spuProducts,
} from "@/lib/db/schema";
import { toModelFieldDto } from "@/lib/products/model-field-service";
import { getSkuDetail, getSpuDetail } from "@/lib/products/product-queries";
import { parseSkuInput, parseSpuInput, validateCustomValues } from "@/lib/products/product-validation";
import type { ModelFieldDto, ProductFieldType, ProductLevel, SkuInput, SpuInput } from "@/lib/products/types";

type Database = ReturnType<typeof getDatabase>;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

function columnsForValue(type: ProductFieldType, value: unknown) {
  const columns = { textValue: null, numberValue: null, booleanValue: null, dateValue: null, jsonValue: null as unknown };
  if (value === null || value === undefined) return columns;
  if (["short_text", "long_text", "url", "select"].includes(type)) return { ...columns, textValue: value as string };
  if (type === "number") return { ...columns, numberValue: value as number };
  if (type === "boolean") return { ...columns, booleanValue: value as boolean };
  if (type === "date") return { ...columns, dateValue: value as string };
  return { ...columns, jsonValue: value };
}

function uniqueColumnName(type: ProductFieldType) {
  if (["short_text", "long_text", "url", "select"].includes(type)) return "text_value";
  if (type === "number") return "number_value";
  if (type === "boolean") return "boolean_value";
  if (type === "date") return "date_value";
  return null;
}

async function assertUniqueValue(
  tx: Transaction,
  level: ProductLevel,
  field: ModelFieldDto,
  value: unknown,
  existingEntityId?: string,
) {
  if (!field.isUnique || value === null || value === undefined) return;
  const columnName = uniqueColumnName(field.type);
  if (!columnName) return;
  const tableName = level === "spu" ? "spu_field_values" : "sku_field_values";
  const entityColumn = level === "spu" ? "spu_id" : "sku_id";
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${field.id}), hashtext(${String(value)}))`);
  const predicate = existingEntityId
    ? sql`select 1 from ${sql.identifier(tableName)} where field_id = ${field.id} and ${sql.identifier(columnName)} = ${value} and ${sql.identifier(entityColumn)} <> ${existingEntityId} limit 1`
    : sql`select 1 from ${sql.identifier(tableName)} where field_id = ${field.id} and ${sql.identifier(columnName)} = ${value} limit 1`;
  const result = await tx.execute(predicate);
  if (result.rows.length) {
    throw new AppError("DUPLICATE_FIELD_VALUE", `“${field.label}”的值必须唯一。`, 409, { [field.key]: "该值已被其他商品使用" });
  }
}

async function activeFields(tx: Transaction, level: ProductLevel) {
  const rows = await tx
    .select()
    .from(modelFields)
    .where(and(eq(modelFields.level, level), isNull(modelFields.archivedAt)))
    .orderBy(modelFields.sortOrder, modelFields.createdAt);
  return rows.map(toModelFieldDto);
}

async function existingFieldValues(tx: Transaction, level: ProductLevel, entityId: string) {
  const rows = level === "spu"
    ? await tx.select({
        key: modelFields.key,
        type: modelFields.type,
        textValue: spuFieldValues.textValue,
        numberValue: spuFieldValues.numberValue,
        booleanValue: spuFieldValues.booleanValue,
        dateValue: spuFieldValues.dateValue,
        jsonValue: spuFieldValues.jsonValue,
      }).from(spuFieldValues).innerJoin(modelFields, eq(modelFields.id, spuFieldValues.fieldId)).where(eq(spuFieldValues.spuId, entityId))
    : await tx.select({
        key: modelFields.key,
        type: modelFields.type,
        textValue: skuFieldValues.textValue,
        numberValue: skuFieldValues.numberValue,
        booleanValue: skuFieldValues.booleanValue,
        dateValue: skuFieldValues.dateValue,
        jsonValue: skuFieldValues.jsonValue,
      }).from(skuFieldValues).innerJoin(modelFields, eq(modelFields.id, skuFieldValues.fieldId)).where(eq(skuFieldValues.skuId, entityId));

  return Object.fromEntries(rows.map((row) => {
    const value = ["short_text", "long_text", "url", "select"].includes(row.type)
      ? row.textValue
      : row.type === "number"
        ? row.numberValue
        : row.type === "boolean"
          ? row.booleanValue
          : row.type === "date"
            ? row.dateValue
            : row.jsonValue;
    return [row.key, value];
  }));
}

async function saveValues(
  tx: Transaction,
  level: ProductLevel,
  entityId: string,
  fields: ModelFieldDto[],
  inputValues: Record<string, unknown>,
) {
  const now = new Date();
  for (const [key, value] of Object.entries(inputValues)) {
    const field = fields.find((item) => item.key === key);
    if (!field) continue;
    const valueColumns = columnsForValue(field.type, value);
    if (level === "spu") {
      if (value === null || value === undefined) {
        await tx.delete(spuFieldValues).where(and(eq(spuFieldValues.spuId, entityId), eq(spuFieldValues.fieldId, field.id)));
      } else {
        await tx.insert(spuFieldValues).values({ spuId: entityId, fieldId: field.id, ...valueColumns, updatedAt: now })
          .onConflictDoUpdate({ target: [spuFieldValues.spuId, spuFieldValues.fieldId], set: { ...valueColumns, updatedAt: now } });
      }
    } else if (value === null || value === undefined) {
      await tx.delete(skuFieldValues).where(and(eq(skuFieldValues.skuId, entityId), eq(skuFieldValues.fieldId, field.id)));
    } else {
      await tx.insert(skuFieldValues).values({ skuId: entityId, fieldId: field.id, ...valueColumns, updatedAt: now })
        .onConflictDoUpdate({ target: [skuFieldValues.skuId, skuFieldValues.fieldId], set: { ...valueColumns, updatedAt: now } });
    }
  }
}

async function validateAndSaveValues(
  tx: Transaction,
  level: ProductLevel,
  entityId: string,
  values: Record<string, unknown>,
) {
  const fields = await activeFields(tx, level);
  const previous = await existingFieldValues(tx, level, entityId);
  const normalized = validateCustomValues(level, fields, values, previous);
  for (const [key, value] of Object.entries(normalized)) {
    const field = fields.find((item) => item.key === key);
    if (field) await assertUniqueValue(tx, level, field, value, entityId);
  }
  await saveValues(tx, level, entityId, fields, normalized);
}

export async function createSpu(input: unknown) {
  const data: SpuInput = parseSpuInput(input);
  const db = getDatabase();
  const id = await db.transaction(async (tx) => {
    const fields = await activeFields(tx, "spu");
    const values = validateCustomValues("spu", fields, data.values);
    for (const [key, value] of Object.entries(values)) {
      const field = fields.find((item) => item.key === key);
      if (field) await assertUniqueValue(tx, "spu", field, value);
    }
    const [spu] = await tx.insert(spuProducts).values({
      spuCode: data.spuCode,
      name: data.name,
      brand: data.brand,
    }).returning({ id: spuProducts.id });
    await tx.insert(productCodeRegistry).values({ code: data.spuCode, spuId: spu.id });
    await saveValues(tx, "spu", spu.id, fields, values);
    return spu.id;
  });
  return getSpuDetail(id, "active");
}

export async function updateSpu(id: string, input: unknown) {
  const data: SpuInput = parseSpuInput(input);
  const db = getDatabase();
  await db.transaction(async (tx) => {
    const [current] = await tx.select({ id: spuProducts.id }).from(spuProducts)
      .where(and(eq(spuProducts.id, id), isNull(spuProducts.archivedAt))).limit(1);
    if (!current) throw new AppError("SPU_NOT_FOUND", "找不到该 SPU，或它已归档。", 404);
    await validateAndSaveValues(tx, "spu", id, data.values);
    await tx.update(spuProducts).set({ spuCode: data.spuCode, name: data.name, brand: data.brand, updatedAt: new Date() })
      .where(eq(spuProducts.id, id));
    await tx.insert(productCodeRegistry).values({ code: data.spuCode, spuId: id })
      .onConflictDoUpdate({ target: productCodeRegistry.spuId, set: { code: data.spuCode } });
  });
  return getSpuDetail(id, "active");
}

export async function archiveSpu(id: string) {
  const db = getDatabase();
  return db.transaction(async (tx) => {
    const [current] = await tx.select({ id: spuProducts.id, archivedAt: spuProducts.archivedAt }).from(spuProducts)
      .where(eq(spuProducts.id, id)).limit(1);
    if (!current) throw new AppError("SPU_NOT_FOUND", "找不到该 SPU。", 404);
    if (current.archivedAt) throw new AppError("SPU_ALREADY_ARCHIVED", "该 SPU 已经归档。", 409);

    const archivedAt = new Date();
    const affectedSkus = await tx.update(skuProducts)
      .set({ archivedAt, archivedWithSpu: true, updatedAt: archivedAt })
      .where(and(eq(skuProducts.spuId, id), isNull(skuProducts.archivedAt)))
      .returning({ id: skuProducts.id });
    await tx.update(spuProducts).set({ archivedAt, updatedAt: archivedAt }).where(eq(spuProducts.id, id));
    return { id, archived: true, archivedSkuCount: affectedSkus.length };
  });
}

export async function restoreSpu(id: string) {
  const db = getDatabase();
  return db.transaction(async (tx) => {
    const [current] = await tx.select({ id: spuProducts.id, archivedAt: spuProducts.archivedAt }).from(spuProducts)
      .where(eq(spuProducts.id, id)).limit(1);
    if (!current) throw new AppError("SPU_NOT_FOUND", "找不到该 SPU。", 404);
    if (!current.archivedAt) throw new AppError("SPU_NOT_ARCHIVED", "该 SPU 当前未归档。", 409);

    const restoredAt = new Date();
    await tx.update(spuProducts).set({ archivedAt: null, updatedAt: restoredAt }).where(eq(spuProducts.id, id));
    const restoredSkus = await tx.update(skuProducts)
      .set({ archivedAt: null, archivedWithSpu: false, updatedAt: restoredAt })
      .where(and(eq(skuProducts.spuId, id), eq(skuProducts.archivedWithSpu, true)))
      .returning({ id: skuProducts.id });
    return { id, archived: false, restoredSkuCount: restoredSkus.length };
  });
}

export async function createSku(spuId: string, input: unknown) {
  const data: SkuInput = parseSkuInput(input);
  const db = getDatabase();
  const skuId = await db.transaction(async (tx) => {
    const [parent] = await tx.select({ id: spuProducts.id }).from(spuProducts)
      .where(and(eq(spuProducts.id, spuId), isNull(spuProducts.archivedAt))).limit(1);
    if (!parent) throw new AppError("SPU_NOT_FOUND", "请先选择一个未归档的 SPU。", 404);
    const fields = await activeFields(tx, "sku");
    const values = validateCustomValues("sku", fields, data.values);
    for (const [key, value] of Object.entries(values)) {
      const field = fields.find((item) => item.key === key);
      if (field) await assertUniqueValue(tx, "sku", field, value);
    }
    const [sku] = await tx.insert(skuProducts).values({ spuId, skuCode: data.skuCode, name: data.name }).returning({ id: skuProducts.id });
    await tx.insert(productCodeRegistry).values({ code: data.skuCode, skuId: sku.id });
    await saveValues(tx, "sku", sku.id, fields, values);
    await tx.update(spuProducts).set({ updatedAt: new Date() }).where(eq(spuProducts.id, spuId));
    return sku.id;
  });
  return getSkuDetail(skuId, "active");
}

export async function updateSku(id: string, input: unknown) {
  const data: SkuInput = parseSkuInput(input);
  const db = getDatabase();
  await db.transaction(async (tx) => {
    const [current] = await tx.select({ id: skuProducts.id, spuId: skuProducts.spuId }).from(skuProducts)
      .innerJoin(spuProducts, eq(spuProducts.id, skuProducts.spuId))
      .where(and(eq(skuProducts.id, id), isNull(skuProducts.archivedAt), isNull(spuProducts.archivedAt))).limit(1);
    if (!current) throw new AppError("SKU_NOT_FOUND", "找不到该 SKU，或它已归档。", 404);
    await validateAndSaveValues(tx, "sku", id, data.values);
    await tx.update(skuProducts).set({ skuCode: data.skuCode, name: data.name, updatedAt: new Date() }).where(eq(skuProducts.id, id));
    await tx.insert(productCodeRegistry).values({ code: data.skuCode, skuId: id })
      .onConflictDoUpdate({ target: productCodeRegistry.skuId, set: { code: data.skuCode } });
    await tx.update(spuProducts).set({ updatedAt: new Date() }).where(eq(spuProducts.id, current.spuId));
  });
  return getSkuDetail(id, "active");
}

export async function archiveSku(id: string) {
  const db = getDatabase();
  return db.transaction(async (tx) => {
    const [current] = await tx.select({ id: skuProducts.id, spuId: skuProducts.spuId, archivedAt: skuProducts.archivedAt })
      .from(skuProducts).where(eq(skuProducts.id, id)).limit(1);
    if (!current) throw new AppError("SKU_NOT_FOUND", "找不到该 SKU。", 404);
    if (current.archivedAt) throw new AppError("SKU_ALREADY_ARCHIVED", "该 SKU 已经归档。", 409);
    const archivedAt = new Date();
    await tx.update(skuProducts).set({ archivedAt, archivedWithSpu: false, updatedAt: archivedAt }).where(eq(skuProducts.id, id));
    await tx.update(spuProducts).set({ updatedAt: archivedAt }).where(eq(spuProducts.id, current.spuId));
    return { id, archived: true };
  });
}

export async function restoreSku(id: string) {
  const db = getDatabase();
  return db.transaction(async (tx) => {
    const [current] = await tx.select({ id: skuProducts.id, spuId: skuProducts.spuId, archivedAt: skuProducts.archivedAt })
      .from(skuProducts).where(eq(skuProducts.id, id)).limit(1);
    if (!current) throw new AppError("SKU_NOT_FOUND", "找不到该 SKU。", 404);
    if (!current.archivedAt) throw new AppError("SKU_NOT_ARCHIVED", "该 SKU 当前未归档。", 409);
    const [parent] = await tx.select({ archivedAt: spuProducts.archivedAt }).from(spuProducts).where(eq(spuProducts.id, current.spuId)).limit(1);
    if (!parent || parent.archivedAt) throw new AppError("PARENT_ARCHIVED", "请先恢复所属 SPU，再恢复该 SKU。", 409);
    await tx.update(skuProducts).set({ archivedAt: null, archivedWithSpu: false, updatedAt: new Date() }).where(eq(skuProducts.id, id));
    await tx.update(spuProducts).set({ updatedAt: new Date() }).where(eq(spuProducts.id, current.spuId));
    return { id, archived: false };
  });
}

export async function readProductFields(level: ProductLevel) {
  const db = getDatabase();
  const rows = await db.select().from(modelFields)
    .where(and(eq(modelFields.level, level), isNull(modelFields.archivedAt)))
    .orderBy(modelFields.sortOrder, modelFields.createdAt);
  return rows.map(toModelFieldDto);
}
