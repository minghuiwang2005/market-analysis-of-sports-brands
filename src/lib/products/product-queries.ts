import "server-only";
import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { AppError } from "@/lib/api-response";
import { getDatabase } from "@/lib/db";
import { modelFields, skuFieldValues, skuProducts, spuFieldValues, spuProducts } from "@/lib/db/schema";
import { toModelFieldDto } from "@/lib/products/model-field-service";
import type {
  FieldDisplayValue,
  ModelFieldDto,
  ProductLevel,
  SpuDetailDto,
  SpuListItemDto,
  SkuDetailDto,
} from "@/lib/products/types";
import type { parseListQuery } from "@/lib/products/product-validation";

type ProductListQuery = ReturnType<typeof parseListQuery>;

function decodeValue(
  type: ModelFieldDto["type"],
  row: { textValue: string | null; numberValue: number | null; booleanValue: boolean | null; dateValue: string | null; jsonValue: unknown },
) {
  if (type === "short_text" || type === "long_text" || type === "url" || type === "select") return row.textValue;
  if (type === "number") return row.numberValue;
  if (type === "boolean") return row.booleanValue;
  if (type === "date") return row.dateValue;
  return row.jsonValue;
}

async function getFields(level: ProductLevel, includeArchived = false) {
  const db = getDatabase();
  const rows = await db
    .select()
    .from(modelFields)
    .where(and(eq(modelFields.level, level), includeArchived ? undefined : isNull(modelFields.archivedAt)))
    .orderBy(asc(modelFields.sortOrder), asc(modelFields.createdAt));
  return rows.map(toModelFieldDto);
}

async function readSpuValues(ids: string[], includeArchivedFields = true) {
  if (!ids.length) return new Map<string, Record<string, unknown>>();
  const db = getDatabase();
  const rows = await db
    .select({
      spuId: spuFieldValues.spuId,
      key: modelFields.key,
      label: modelFields.label,
      type: modelFields.type,
      textValue: spuFieldValues.textValue,
      numberValue: spuFieldValues.numberValue,
      booleanValue: spuFieldValues.booleanValue,
      dateValue: spuFieldValues.dateValue,
      jsonValue: spuFieldValues.jsonValue,
      archivedAt: modelFields.archivedAt,
    })
    .from(spuFieldValues)
    .innerJoin(modelFields, eq(modelFields.id, spuFieldValues.fieldId))
    .where(and(inArray(spuFieldValues.spuId, ids), includeArchivedFields ? undefined : isNull(modelFields.archivedAt)));

  const result = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    const values = result.get(row.spuId) ?? {};
    values[row.key] = decodeValue(row.type, row);
    result.set(row.spuId, values);
  }
  return result;
}

async function readSkuValues(ids: string[], includeArchivedFields = true) {
  if (!ids.length) return new Map<string, Record<string, unknown>>();
  const db = getDatabase();
  const rows = await db
    .select({
      skuId: skuFieldValues.skuId,
      key: modelFields.key,
      label: modelFields.label,
      type: modelFields.type,
      textValue: skuFieldValues.textValue,
      numberValue: skuFieldValues.numberValue,
      booleanValue: skuFieldValues.booleanValue,
      dateValue: skuFieldValues.dateValue,
      jsonValue: skuFieldValues.jsonValue,
      archivedAt: modelFields.archivedAt,
    })
    .from(skuFieldValues)
    .innerJoin(modelFields, eq(modelFields.id, skuFieldValues.fieldId))
    .where(and(inArray(skuFieldValues.skuId, ids), includeArchivedFields ? undefined : isNull(modelFields.archivedAt)));

  const result = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    const values = result.get(row.skuId) ?? {};
    values[row.key] = decodeValue(row.type, row);
    result.set(row.skuId, values);
  }
  return result;
}

function valueDisplayRows(fields: ModelFieldDto[], values: Record<string, unknown>): FieldDisplayValue[] {
  return fields
    .filter((field) => !field.isSystem)
    .map((field) => ({ key: field.key, label: field.label, type: field.type, value: values[field.key] ?? null }));
}

function customFilter(fieldId: string | undefined, value: string) {
  if (!fieldId) return sql`false`;
  const query = getDatabase().select({ id: spuFieldValues.id }).from(spuFieldValues).where(and(
    eq(spuFieldValues.spuId, spuProducts.id),
    eq(spuFieldValues.fieldId, fieldId),
    eq(spuFieldValues.textValue, value),
  ));
  return exists(query);
}

export async function listSpus(query: ProductListQuery) {
  const db = getDatabase();
  const fields = await getFields("spu");
  const clauses = [query.status === "archived" ? isNotNull(spuProducts.archivedAt) : isNull(spuProducts.archivedAt)];

  if (query.q) {
    const searchTerm = `%${query.q.replace(/[\\%_]/g, "\\$&")}%`;
    const searchableFieldIds = fields.filter((field) => !field.isSystem && field.searchable).map((field) => field.id);
    const searchInCustomValues = searchableFieldIds.length
      ? exists(db.select({ id: spuFieldValues.id }).from(spuFieldValues).where(and(
          eq(spuFieldValues.spuId, spuProducts.id),
          inArray(spuFieldValues.fieldId, searchableFieldIds),
          or(
            ilike(spuFieldValues.textValue, searchTerm),
            sql`${spuFieldValues.numberValue}::text ilike ${searchTerm}`,
            sql`${spuFieldValues.booleanValue}::text ilike ${searchTerm}`,
            sql`${spuFieldValues.dateValue}::text ilike ${searchTerm}`,
            sql`${spuFieldValues.jsonValue}::text ilike ${searchTerm}`,
          ),
        )))
      : undefined;
    clauses.push(or(ilike(spuProducts.name, searchTerm), ilike(spuProducts.spuCode, searchTerm), searchInCustomValues) ?? sql`false`);
  }
  if (query.brand) clauses.push(eq(spuProducts.brand, query.brand));

  const sportField = fields.find((field) => field.key === "sport" && !field.isSystem);
  const categoryField = fields.find((field) => field.key === "category" && !field.isSystem);
  if (query.sport) clauses.push(customFilter(sportField?.id, query.sport));
  if (query.category) clauses.push(customFilter(categoryField?.id, query.category));

  const where = and(...clauses);
  const [totalResult] = await db.select({ total: count() }).from(spuProducts).where(where);
  const total = Number(totalResult?.total ?? 0);
  const rows = await db
    .select({
      id: spuProducts.id,
      spuCode: spuProducts.spuCode,
      name: spuProducts.name,
      brand: spuProducts.brand,
      updatedAt: spuProducts.updatedAt,
      archivedAt: spuProducts.archivedAt,
      skuCount: count(skuProducts.id),
    })
    .from(spuProducts)
    .leftJoin(skuProducts, and(
      eq(skuProducts.spuId, spuProducts.id),
      query.status === "archived" ? isNotNull(skuProducts.archivedAt) : isNull(skuProducts.archivedAt),
    ))
    .where(where)
    .groupBy(spuProducts.id)
    .orderBy(desc(spuProducts.updatedAt), desc(spuProducts.id))
    .limit(query.pageSize)
    .offset((query.page - 1) * query.pageSize);

  if (!rows.length) {
    return { items: [] as SpuListItemDto[], total, page: query.page, pageSize: query.pageSize, pageCount: Math.ceil(total / query.pageSize) };
  }

  const ids = rows.map((row) => row.id);
  const [valueMap, latestSkus, displayFields] = await Promise.all([
    readSpuValues(ids, false),
    (async () => {
      const ranked = db.select({
        id: skuProducts.id,
        spuId: skuProducts.spuId,
        skuCode: skuProducts.skuCode,
        name: skuProducts.name,
        createdAt: skuProducts.createdAt,
        rowNumber: sql<number>`row_number() over (partition by ${skuProducts.spuId} order by ${skuProducts.createdAt} desc, ${skuProducts.id} desc)`.as("row_number"),
      }).from(skuProducts).where(and(
        inArray(skuProducts.spuId, ids),
        query.status === "archived" ? isNotNull(skuProducts.archivedAt) : isNull(skuProducts.archivedAt),
      )).as("ranked_skus");
      return db.select({ id: ranked.id, spuId: ranked.spuId, skuCode: ranked.skuCode, name: ranked.name, createdAt: ranked.createdAt, rowNumber: ranked.rowNumber })
        .from(ranked).where(lte(ranked.rowNumber, 5)).orderBy(asc(ranked.spuId), asc(ranked.rowNumber));
    })(),
    Promise.resolve(fields.filter((field) => !field.isSystem && field.showInList)),
  ]);

  const fieldIds = displayFields.map((field) => field.id);
  const displayValues = fieldIds.length
    ? await db.select({
        spuId: spuFieldValues.spuId,
        fieldId: modelFields.id,
        type: modelFields.type,
        key: modelFields.key,
        textValue: spuFieldValues.textValue,
        numberValue: spuFieldValues.numberValue,
        booleanValue: spuFieldValues.booleanValue,
        dateValue: spuFieldValues.dateValue,
        jsonValue: spuFieldValues.jsonValue,
      }).from(spuFieldValues).innerJoin(modelFields, eq(modelFields.id, spuFieldValues.fieldId))
        .where(and(inArray(spuFieldValues.spuId, ids), inArray(spuFieldValues.fieldId, fieldIds)))
    : [];

  const valueByProduct = new Map<string, Record<string, unknown>>();
  for (const item of displayValues) {
    const values = valueByProduct.get(item.spuId) ?? {};
    values[item.key] = decodeValue(item.type, item);
    valueByProduct.set(item.spuId, values);
  }
  const latestByProduct = new Map<string, SpuListItemDto["latestSkus"]>();
  for (const sku of latestSkus) {
    const list = latestByProduct.get(sku.spuId) ?? [];
    list.push({ id: sku.id, skuCode: sku.skuCode, name: sku.name, createdAt: sku.createdAt.toISOString() });
    latestByProduct.set(sku.spuId, list);
  }

  const items: SpuListItemDto[] = rows.map((row) => ({
    id: row.id,
    spuCode: row.spuCode,
    name: row.name,
    brand: row.brand,
    updatedAt: row.updatedAt.toISOString(),
    archivedAt: row.archivedAt?.toISOString() ?? null,
    values: { ...(valueMap.get(row.id) ?? {}), ...(valueByProduct.get(row.id) ?? {}) },
    skuCount: Number(row.skuCount),
    latestSkus: latestByProduct.get(row.id) ?? [],
  }));

  return { items, total, page: query.page, pageSize: query.pageSize, pageCount: Math.ceil(total / query.pageSize) };
}

export async function getSpuDetail(id: string, expectedStatus?: "active" | "archived"): Promise<SpuDetailDto> {
  const db = getDatabase();
  const [spu] = await db.select().from(spuProducts).where(eq(spuProducts.id, id)).limit(1);
  if (!spu || (expectedStatus === "active" && spu.archivedAt) || (expectedStatus === "archived" && !spu.archivedAt)) {
    throw new AppError("SPU_NOT_FOUND", "找不到该 SPU，或它不在当前记录视图中。", 404);
  }
  const skus = await db.select().from(skuProducts).where(eq(skuProducts.spuId, id)).orderBy(desc(skuProducts.createdAt), desc(skuProducts.id)).limit(500);
  const [spuValues, skuValueMap, spuFields, skuFields] = await Promise.all([
    readSpuValues([id]),
    readSkuValues(skus.map((sku) => sku.id)),
    getFields("spu", true),
    getFields("sku", true),
  ]);
  const values = spuValues.get(id) ?? {};
  const skuDtos: SkuDetailDto[] = skus.map((sku) => ({
    id: sku.id,
    spuId: sku.spuId,
    spuCode: spu.spuCode,
    spuName: spu.name,
    skuCode: sku.skuCode,
    name: sku.name,
    createdAt: sku.createdAt.toISOString(),
    updatedAt: sku.updatedAt.toISOString(),
    archivedAt: sku.archivedAt?.toISOString() ?? null,
    archivedWithSpu: sku.archivedWithSpu,
    values: skuValueMap.get(sku.id) ?? {},
    fields: valueDisplayRows(skuFields, skuValueMap.get(sku.id) ?? {}),
  }));

  return {
    id: spu.id,
    spuCode: spu.spuCode,
    name: spu.name,
    brand: spu.brand,
    updatedAt: spu.updatedAt.toISOString(),
    archivedAt: spu.archivedAt?.toISOString() ?? null,
    values,
    skuCount: spu.archivedAt ? skuDtos.length : skuDtos.filter((sku) => !sku.archivedAt).length,
    latestSkus: skuDtos.filter((sku) => !sku.archivedAt).slice(0, 5).map(({ id: skuId, skuCode, name: skuName, createdAt }) => ({ id: skuId, skuCode, name: skuName, createdAt })),
    fields: valueDisplayRows(spuFields, values),
    skus: skuDtos,
  };
}

export async function getSkuDetail(id: string, expectedStatus?: "active" | "archived") {
  const db = getDatabase();
  const [sku] = await db.select().from(skuProducts).where(eq(skuProducts.id, id)).limit(1);
  if (!sku || (expectedStatus === "active" && sku.archivedAt) || (expectedStatus === "archived" && !sku.archivedAt)) {
    throw new AppError("SKU_NOT_FOUND", "找不到该 SKU，或它不在当前记录视图中。", 404);
  }
  const [spu] = await db.select().from(spuProducts).where(eq(spuProducts.id, sku.spuId)).limit(1);
  if (!spu) throw new AppError("SPU_NOT_FOUND", "SKU 所属 SPU 不存在。", 404);
  const [values, fields] = await Promise.all([readSkuValues([sku.id]), getFields("sku", true)]);
  const skuValues = values.get(sku.id) ?? {};
  return {
    id: sku.id,
    spuId: sku.spuId,
    spuCode: spu.spuCode,
    spuName: spu.name,
    skuCode: sku.skuCode,
    name: sku.name,
    createdAt: sku.createdAt.toISOString(),
    updatedAt: sku.updatedAt.toISOString(),
    archivedAt: sku.archivedAt?.toISOString() ?? null,
    archivedWithSpu: sku.archivedWithSpu,
    values: skuValues,
    fields: valueDisplayRows(fields, skuValues),
  };
}
