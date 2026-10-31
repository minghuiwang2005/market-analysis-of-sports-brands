import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productLevelEnum = pgEnum("product_level", ["spu", "sku"]);
export const modelFieldTypeEnum = pgEnum("model_field_type", [
  "short_text",
  "long_text",
  "number",
  "boolean",
  "date",
  "url",
  "select",
  "multiselect",
]);

export const llmModelConfigs = pgTable(
  "llm_model_configs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 120 }).notNull(),
    baseUrl: text("base_url").notNull(),
    model: varchar("model", { length: 200 }).notNull(),
    apiKeyCiphertext: text("api_key_ciphertext").notNull(),
    apiKeyIv: varchar("api_key_iv", { length: 24 }).notNull(),
    apiKeyAuthTag: varchar("api_key_auth_tag", { length: 32 }).notNull(),
    apiKeyLast4: varchar("api_key_last4", { length: 4 }).notNull(),
    keyVersion: integer("key_version").notNull().default(1),
    priority: integer("priority").notNull().default(10),
    timeoutSeconds: integer("timeout_seconds").notNull().default(60),
    reasoningEnabled: boolean("reasoning_enabled").notNull().default(false),
    enabled: boolean("enabled").notNull().default(true),
    isDefault: boolean("is_default").notNull().default(false),
    lastTestStatus: varchar("last_test_status", { length: 20 }).notNull().default("untested"),
    lastTestedAt: timestamp("last_tested_at", { withTimezone: true }),
    lastTestMessage: text("last_test_message"),
    ...timestamps(),
  },
  (table) => [
    check("llm_model_configs_priority_positive", sql`${table.priority} > 0`),
    check("llm_model_configs_timeout_range", sql`${table.timeoutSeconds} BETWEEN 1 AND 180`),
    check("llm_model_configs_test_status", sql`${table.lastTestStatus} IN ('untested', 'success', 'failed')`),
    check("llm_model_configs_default_enabled", sql`NOT ${table.isDefault} OR ${table.enabled}`),
    uniqueIndex("llm_model_configs_single_default_idx").on(table.isDefault).where(sql`${table.isDefault}`),
  ],
);

export const adminLoginAttempts = pgTable(
  "admin_login_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceHash: varchar("source_hash", { length: 64 }).notNull(),
    attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("admin_login_attempts_source_time_idx").on(table.sourceHash, table.attemptedAt)],
);

export const modelFields = pgTable(
  "model_fields",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    level: productLevelEnum("level").notNull(),
    key: varchar("key", { length: 80 }).notNull(),
    label: varchar("label", { length: 120 }).notNull(),
    type: modelFieldTypeEnum("type").notNull(),
    required: boolean("required").notNull().default(false),
    isUnique: boolean("is_unique").notNull().default(false),
    options: jsonb("options").$type<string[]>().notNull().default([]),
    searchable: boolean("searchable").notNull().default(false),
    showInList: boolean("show_in_list").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    isSystem: boolean("is_system").notNull().default(false),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("model_fields_level_key_unique").on(table.level, table.key),
    index("model_fields_level_active_order_idx").on(table.level, table.archivedAt, table.sortOrder),
  ],
);

export const spuProducts = pgTable(
  "spu_products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spuCode: varchar("spu_code", { length: 120 }).notNull().unique(),
    name: varchar("name", { length: 240 }).notNull(),
    brand: varchar("brand", { length: 120 }).notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    index("spu_products_active_updated_idx").on(table.archivedAt, table.updatedAt, table.id),
    index("spu_products_brand_idx").on(table.brand),
  ],
);

export const skuProducts = pgTable(
  "sku_products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spuId: uuid("spu_id")
      .notNull()
      .references(() => spuProducts.id, { onDelete: "restrict" }),
    skuCode: varchar("sku_code", { length: 120 }).notNull().unique(),
    name: varchar("name", { length: 240 }).notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    archivedWithSpu: boolean("archived_with_spu").notNull().default(false),
    ...timestamps(),
  },
  (table) => [
    index("sku_products_parent_recent_idx").on(table.spuId, table.archivedAt, table.createdAt, table.id),
    index("sku_products_archived_restore_idx").on(table.spuId, table.archivedWithSpu),
  ],
);

export const productCodeRegistry = pgTable(
  "product_code_registry",
  {
    code: varchar("code", { length: 120 }).primaryKey(),
    spuId: uuid("spu_id").references(() => spuProducts.id, { onDelete: "restrict" }),
    skuId: uuid("sku_id").references(() => skuProducts.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("product_code_registry_spu_unique").on(table.spuId),
    uniqueIndex("product_code_registry_sku_unique").on(table.skuId),
    check("product_code_registry_one_owner_check", sql`(${table.spuId} is not null) <> (${table.skuId} is not null)`),
  ],
);

const typedValueColumns = () => ({
  textValue: text("text_value"),
  numberValue: doublePrecision("number_value"),
  booleanValue: boolean("boolean_value"),
  dateValue: date("date_value", { mode: "string" }),
  jsonValue: jsonb("json_value").$type<unknown>(),
});

export const spuFieldValues = pgTable(
  "spu_field_values",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spuId: uuid("spu_id")
      .notNull()
      .references(() => spuProducts.id, { onDelete: "restrict" }),
    fieldId: uuid("field_id")
      .notNull()
      .references(() => modelFields.id, { onDelete: "restrict" }),
    ...typedValueColumns(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("spu_field_values_entity_field_unique").on(table.spuId, table.fieldId),
    index("spu_field_values_field_text_idx").on(table.fieldId, table.textValue),
    index("spu_field_values_field_number_idx").on(table.fieldId, table.numberValue),
    index("spu_field_values_field_date_idx").on(table.fieldId, table.dateValue),
  ],
);

export const skuFieldValues = pgTable(
  "sku_field_values",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    skuId: uuid("sku_id")
      .notNull()
      .references(() => skuProducts.id, { onDelete: "restrict" }),
    fieldId: uuid("field_id")
      .notNull()
      .references(() => modelFields.id, { onDelete: "restrict" }),
    ...typedValueColumns(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("sku_field_values_entity_field_unique").on(table.skuId, table.fieldId),
    index("sku_field_values_field_text_idx").on(table.fieldId, table.textValue),
    index("sku_field_values_field_number_idx").on(table.fieldId, table.numberValue),
    index("sku_field_values_field_date_idx").on(table.fieldId, table.dateValue),
  ],
);

export const sourceRecords = pgTable(
  "source_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spuId: uuid("spu_id").references(() => spuProducts.id, { onDelete: "restrict" }),
    skuId: uuid("sku_id").references(() => skuProducts.id, { onDelete: "restrict" }),
    url: text("url").notNull(),
    sourceType: varchar("source_type", { length: 60 }).notNull(),
    market: varchar("market", { length: 80 }),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
    evidenceText: text("evidence_text"),
    verificationStatus: varchar("verification_status", { length: 40 }).notNull().default("unverified"),
    publiclyVisible: boolean("publicly_visible").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("source_records_observed_idx").on(table.observedAt, table.id)],
);

export const priceObservations = pgTable(
  "price_observations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    skuId: uuid("sku_id")
      .notNull()
      .references(() => skuProducts.id, { onDelete: "restrict" }),
    sourceRecordId: uuid("source_record_id")
      .notNull()
      .references(() => sourceRecords.id, { onDelete: "restrict" }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    priceBasis: varchar("price_basis", { length: 40 }).notNull(),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("price_observations_sku_time_idx").on(table.skuId, table.observedAt)],
);

export const availabilityObservations = pgTable(
  "availability_observations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    skuId: uuid("sku_id")
      .notNull()
      .references(() => skuProducts.id, { onDelete: "restrict" }),
    sourceRecordId: uuid("source_record_id")
      .notNull()
      .references(() => sourceRecords.id, { onDelete: "restrict" }),
    status: varchar("status", { length: 60 }).notNull(),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("availability_observations_sku_time_idx").on(table.skuId, table.observedAt)],
);
