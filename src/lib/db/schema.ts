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

export const sportsTimelineEvents = pgTable(
  "sports_timeline_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventKey: varchar("event_key", { length: 120 }).notNull(),
    sport: varchar("sport", { length: 30 }).notNull(),
    eventType: varchar("event_type", { length: 40 }).notNull(),
    category: varchar("category", { length: 40 }).notNull(),
    occurredYear: integer("occurred_year").notNull(),
    occurredMonth: integer("occurred_month"),
    occurredDay: integer("occurred_day"),
    datePrecision: varchar("date_precision", { length: 10 }).notNull(),
    athleteNameZh: varchar("athlete_name_zh", { length: 120 }),
    athleteNameEn: varchar("athlete_name_en", { length: 160 }),
    organization: varchar("organization", { length: 120 }),
    title: varchar("title", { length: 240 }).notNull(),
    description: text("description").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    published: boolean("published").notNull().default(false),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("sports_timeline_events_event_key_unique").on(table.eventKey),
    index("sports_timeline_events_sport_published_year_order_idx").on(
      table.sport,
      table.published,
      table.occurredYear,
      table.sortOrder,
    ),
    check("sports_timeline_events_year_range_check", sql`${table.occurredYear} BETWEEN 1800 AND 2200`),
    check(
      "sports_timeline_events_date_parts_check",
      sql`(
        (${table.datePrecision} = 'year' AND ${table.occurredMonth} IS NULL AND ${table.occurredDay} IS NULL)
        OR (
          ${table.datePrecision} = 'month'
          AND ${table.occurredMonth} IS NOT NULL
          AND ${table.occurredMonth} BETWEEN 1 AND 12
          AND ${table.occurredDay} IS NULL
        )
        OR (
          ${table.datePrecision} = 'day'
          AND ${table.occurredMonth} IS NOT NULL
          AND ${table.occurredDay} IS NOT NULL
          AND ${table.occurredMonth} BETWEEN 1 AND 12
          AND ${table.occurredDay} BETWEEN 1 AND CASE
            WHEN ${table.occurredMonth} IN (1, 3, 5, 7, 8, 10, 12) THEN 31
            WHEN ${table.occurredMonth} IN (4, 6, 9, 11) THEN 30
            WHEN ${table.occurredMonth} = 2 THEN CASE
              WHEN (${table.occurredYear} % 400 = 0) OR (${table.occurredYear} % 4 = 0 AND ${table.occurredYear} % 100 <> 0) THEN 29
              ELSE 28
            END
            ELSE 0
          END
        )
      )`,
    ),
    check(
      "sports_timeline_events_type_category_check",
      sql`(
        (${table.eventType} = 'league_milestone'
          AND ${table.category} IN ('league', 'rules', 'people', 'global', 'culture')
          AND ${table.athleteNameZh} IS NULL
          AND ${table.athleteNameEn} IS NULL
          AND ${table.organization} IS NULL)
        OR (${table.eventType} = 'athlete_signing'
          AND ${table.category} = 'athlete_signing'
          AND ${table.athleteNameZh} IS NOT NULL
          AND ${table.athleteNameEn} IS NOT NULL
          AND ${table.organization} IS NOT NULL)
      )`,
    ),
  ],
);

export const sportsTimelineEventSources = pgTable(
  "sports_timeline_event_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => sportsTimelineEvents.id, { onDelete: "restrict" }),
    url: text("url").notNull(),
    publisher: varchar("publisher", { length: 160 }).notNull(),
    sourceTitle: varchar("source_title", { length: 300 }).notNull(),
    publishedAt: date("published_at", { mode: "string" }),
    claimScope: varchar("claim_scope", { length: 40 }).notNull(),
    evidenceNote: text("evidence_note").notNull(),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
    verificationStatus: varchar("verification_status", { length: 24 }).notNull().default("needs_review"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("sports_timeline_event_sources_event_url_unique").on(table.eventId, table.url),
    index("sports_timeline_event_sources_event_status_idx").on(table.eventId, table.verificationStatus),
    check(
      "sports_timeline_event_sources_claim_scope_check",
      sql`${table.claimScope} IN ('league_event', 'athlete_signing')`,
    ),
    check(
      "sports_timeline_event_sources_verification_status_check",
      sql`${table.verificationStatus} IN ('verified', 'needs_review')`,
    ),
  ],
);

export const nbaClassicGames = pgTable(
  "nba_classic_games",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventKey: varchar("event_key", { length: 120 }).notNull(),
    occurredYear: integer("occurred_year").notNull(),
    gameLabel: varchar("game_label", { length: 120 }).notNull(),
    title: varchar("title", { length: 240 }).notNull(),
    matchup: varchar("matchup", { length: 180 }).notNull(),
    result: varchar("result", { length: 80 }).notNull(),
    description: text("description").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    published: boolean("published").notNull().default(false),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("nba_classic_games_event_key_unique").on(table.eventKey),
    index("nba_classic_games_published_year_order_idx").on(
      table.published,
      table.occurredYear,
      table.sortOrder,
    ),
    check("nba_classic_games_year_range_check", sql`${table.occurredYear} BETWEEN 1946 AND 2200`),
  ],
);

export const nbaClassicGameSources = pgTable(
  "nba_classic_game_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => nbaClassicGames.id, { onDelete: "restrict" }),
    url: text("url").notNull(),
    publisher: varchar("publisher", { length: 160 }).notNull(),
    sourceTitle: varchar("source_title", { length: 300 }).notNull(),
    evidenceNote: text("evidence_note").notNull(),
    verificationStatus: varchar("verification_status", { length: 24 }).notNull().default("needs_review"),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("nba_classic_game_sources_game_url_unique").on(table.gameId, table.url),
    index("nba_classic_game_sources_game_status_idx").on(table.gameId, table.verificationStatus),
    check(
      "nba_classic_game_sources_verification_status_check",
      sql`${table.verificationStatus} IN ('verified', 'needs_review')`,
    ),
  ],
);

export type AthleteCareerHighlight = {
  value: string;
  label: string;
};

export type AthleteRepresentativeModel = {
  name: string;
  releaseYear?: number;
  designer?: string;
  description?: string;
  image?: {
    url: string;
    alt: string;
    sourceUrl: string;
    credit: string;
    license: string;
    licenseUrl: string;
  };
};

export const starSports = pgTable(
  "star_sports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 40 }).notNull().unique(),
    nameZh: varchar("name_zh", { length: 60 }).notNull(),
    nameEn: varchar("name_en", { length: 80 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    contentStatus: varchar("content_status", { length: 20 }).notNull().default("coming_soon"),
    intro: text("intro"),
    ...timestamps(),
  },
  (table) => [
    check("star_sports_content_status_check", sql`${table.contentStatus} IN ('active', 'coming_soon')`),
    index("star_sports_status_order_idx").on(table.contentStatus, table.sortOrder),
  ],
);

export const starAthletes = pgTable(
  "star_athletes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    sportId: uuid("sport_id")
      .notNull()
      .references(() => starSports.id, { onDelete: "restrict" }),
    nameZh: varchar("name_zh", { length: 120 }).notNull(),
    nameEn: varchar("name_en", { length: 160 }).notNull(),
    league: varchar("league", { length: 80 }),
    position: varchar("position", { length: 80 }),
    teamsSummary: text("teams_summary"),
    nationality: varchar("nationality", { length: 80 }),
    birthDate: date("birth_date", { mode: "string" }),
    heightCm: integer("height_cm"),
    jerseyNumber: varchar("jersey_number", { length: 12 }),
    bio: text("bio").notNull(),
    portraitUrl: text("portrait_url"),
    portraitAlt: text("portrait_alt"),
    portraitSourceUrl: text("portrait_source_url"),
    portraitCredit: varchar("portrait_credit", { length: 240 }),
    portraitLicense: varchar("portrait_license", { length: 80 }),
    portraitLicenseUrl: text("portrait_license_url"),
    careerHighlights: jsonb("career_highlights").$type<AthleteCareerHighlight[]>().notNull().default([]),
    sortOrder: integer("sort_order").notNull().default(0),
    published: boolean("published").notNull().default(false),
    ...timestamps(),
  },
  (table) => [
    index("star_athletes_sport_published_order_idx").on(table.sportId, table.published, table.sortOrder),
    check(
      "star_athletes_published_portrait_check",
      sql`NOT ${table.published} OR (
        ${table.portraitUrl} IS NOT NULL
        AND ${table.portraitAlt} IS NOT NULL
        AND ${table.portraitSourceUrl} IS NOT NULL
        AND ${table.portraitCredit} IS NOT NULL
        AND ${table.portraitLicense} IS NOT NULL
        AND ${table.portraitLicenseUrl} IS NOT NULL
      )`,
    ),
    check("star_athletes_height_positive_check", sql`${table.heightCm} IS NULL OR ${table.heightCm} BETWEEN 100 AND 250`),
  ],
);

export const athleteShoeLines = pgTable(
  "athlete_shoe_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    athleteId: uuid("athlete_id")
      .notNull()
      .references(() => starAthletes.id, { onDelete: "restrict" }),
    brand: varchar("brand", { length: 80 }).notNull(),
    lineName: varchar("line_name", { length: 120 }).notNull(),
    relationshipStatus: varchar("relationship_status", { length: 20 }).notNull(),
    startedYear: integer("started_year"),
    endedYear: integer("ended_year"),
    representativeModels: jsonb("representative_models").$type<AthleteRepresentativeModel[]>().notNull().default([]),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("athlete_shoe_lines_athlete_line_unique").on(table.athleteId, table.lineName),
    index("athlete_shoe_lines_athlete_status_order_idx").on(table.athleteId, table.relationshipStatus, table.sortOrder),
    check("athlete_shoe_lines_brand_check", sql`${table.brand} IN ('Nike', 'Jordan Brand')`),
    check("athlete_shoe_lines_status_check", sql`${table.relationshipStatus} IN ('current', 'historical')`),
    check("athlete_shoe_lines_year_check", sql`
      (${table.startedYear} IS NULL OR ${table.startedYear} BETWEEN 1900 AND 2200)
      AND (${table.endedYear} IS NULL OR ${table.endedYear} BETWEEN 1900 AND 2200)
      AND (${table.endedYear} IS NULL OR ${table.startedYear} IS NULL OR ${table.endedYear} >= ${table.startedYear})
    `),
  ],
);

export const athleteSources = pgTable(
  "athlete_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    athleteId: uuid("athlete_id")
      .notNull()
      .references(() => starAthletes.id, { onDelete: "restrict" }),
    shoeLineId: uuid("shoe_line_id").references(() => athleteShoeLines.id, { onDelete: "restrict" }),
    sourceUrl: text("source_url").notNull(),
    publisher: varchar("publisher", { length: 160 }).notNull(),
    title: varchar("title", { length: 300 }).notNull(),
    publishedAt: date("published_at", { mode: "string" }),
    claimScope: varchar("claim_scope", { length: 40 }).notNull(),
    evidenceNote: text("evidence_note").notNull(),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
    verificationStatus: varchar("verification_status", { length: 24 }).notNull().default("needs_review"),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("athlete_sources_athlete_url_scope_unique").on(table.athleteId, table.sourceUrl, table.claimScope),
    index("athlete_sources_athlete_status_idx").on(table.athleteId, table.verificationStatus),
    index("athlete_sources_shoe_line_idx").on(table.shoeLineId),
    check(
      "athlete_sources_claim_scope_check",
      sql`${table.claimScope} IN ('biography', 'signature_line', 'partnership_status', 'portrait', 'image_license', 'career_highlight')`,
    ),
    check("athlete_sources_verification_status_check", sql`${table.verificationStatus} IN ('verified', 'needs_review')`),
  ],
);
