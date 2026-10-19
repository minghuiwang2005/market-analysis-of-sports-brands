CREATE TYPE "public"."model_field_type" AS ENUM('short_text', 'long_text', 'number', 'boolean', 'date', 'url', 'select', 'multiselect');--> statement-breakpoint
CREATE TYPE "public"."product_level" AS ENUM('spu', 'sku');--> statement-breakpoint
CREATE TABLE "availability_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku_id" uuid NOT NULL,
	"source_record_id" uuid NOT NULL,
	"status" varchar(60) NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"level" "product_level" NOT NULL,
	"key" varchar(80) NOT NULL,
	"label" varchar(120) NOT NULL,
	"type" "model_field_type" NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"is_unique" boolean DEFAULT false NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"searchable" boolean DEFAULT false NOT NULL,
	"show_in_list" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku_id" uuid NOT NULL,
	"source_record_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"price_basis" varchar(40) NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_code_registry" (
	"code" varchar(120) PRIMARY KEY NOT NULL,
	"spu_id" uuid,
	"sku_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_code_registry_one_owner_check" CHECK (("product_code_registry"."spu_id" is not null) <> ("product_code_registry"."sku_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "sku_field_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku_id" uuid NOT NULL,
	"field_id" uuid NOT NULL,
	"text_value" text,
	"number_value" double precision,
	"boolean_value" boolean,
	"date_value" date,
	"json_value" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sku_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"spu_id" uuid NOT NULL,
	"sku_code" varchar(120) NOT NULL,
	"name" varchar(240) NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_with_spu" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sku_products_sku_code_unique" UNIQUE("sku_code")
);
--> statement-breakpoint
CREATE TABLE "source_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"spu_id" uuid,
	"sku_id" uuid,
	"url" text NOT NULL,
	"source_type" varchar(60) NOT NULL,
	"market" varchar(80),
	"observed_at" timestamp with time zone NOT NULL,
	"evidence_text" text,
	"verification_status" varchar(40) DEFAULT 'unverified' NOT NULL,
	"publicly_visible" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spu_field_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"spu_id" uuid NOT NULL,
	"field_id" uuid NOT NULL,
	"text_value" text,
	"number_value" double precision,
	"boolean_value" boolean,
	"date_value" date,
	"json_value" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spu_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"spu_code" varchar(120) NOT NULL,
	"name" varchar(240) NOT NULL,
	"brand" varchar(120) NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "spu_products_spu_code_unique" UNIQUE("spu_code")
);
--> statement-breakpoint
ALTER TABLE "availability_observations" ADD CONSTRAINT "availability_observations_sku_id_sku_products_id_fk" FOREIGN KEY ("sku_id") REFERENCES "public"."sku_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_observations" ADD CONSTRAINT "availability_observations_source_record_id_source_records_id_fk" FOREIGN KEY ("source_record_id") REFERENCES "public"."source_records"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_observations" ADD CONSTRAINT "price_observations_sku_id_sku_products_id_fk" FOREIGN KEY ("sku_id") REFERENCES "public"."sku_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_observations" ADD CONSTRAINT "price_observations_source_record_id_source_records_id_fk" FOREIGN KEY ("source_record_id") REFERENCES "public"."source_records"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_code_registry" ADD CONSTRAINT "product_code_registry_spu_id_spu_products_id_fk" FOREIGN KEY ("spu_id") REFERENCES "public"."spu_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_code_registry" ADD CONSTRAINT "product_code_registry_sku_id_sku_products_id_fk" FOREIGN KEY ("sku_id") REFERENCES "public"."sku_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sku_field_values" ADD CONSTRAINT "sku_field_values_sku_id_sku_products_id_fk" FOREIGN KEY ("sku_id") REFERENCES "public"."sku_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sku_field_values" ADD CONSTRAINT "sku_field_values_field_id_model_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."model_fields"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sku_products" ADD CONSTRAINT "sku_products_spu_id_spu_products_id_fk" FOREIGN KEY ("spu_id") REFERENCES "public"."spu_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_records" ADD CONSTRAINT "source_records_spu_id_spu_products_id_fk" FOREIGN KEY ("spu_id") REFERENCES "public"."spu_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_records" ADD CONSTRAINT "source_records_sku_id_sku_products_id_fk" FOREIGN KEY ("sku_id") REFERENCES "public"."sku_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spu_field_values" ADD CONSTRAINT "spu_field_values_spu_id_spu_products_id_fk" FOREIGN KEY ("spu_id") REFERENCES "public"."spu_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spu_field_values" ADD CONSTRAINT "spu_field_values_field_id_model_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."model_fields"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "availability_observations_sku_time_idx" ON "availability_observations" USING btree ("sku_id","observed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "model_fields_level_key_unique" ON "model_fields" USING btree ("level","key");--> statement-breakpoint
CREATE INDEX "model_fields_level_active_order_idx" ON "model_fields" USING btree ("level","archived_at","sort_order");--> statement-breakpoint
CREATE INDEX "price_observations_sku_time_idx" ON "price_observations" USING btree ("sku_id","observed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "product_code_registry_spu_unique" ON "product_code_registry" USING btree ("spu_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_code_registry_sku_unique" ON "product_code_registry" USING btree ("sku_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sku_field_values_entity_field_unique" ON "sku_field_values" USING btree ("sku_id","field_id");--> statement-breakpoint
CREATE INDEX "sku_field_values_field_text_idx" ON "sku_field_values" USING btree ("field_id","text_value");--> statement-breakpoint
CREATE INDEX "sku_field_values_field_number_idx" ON "sku_field_values" USING btree ("field_id","number_value");--> statement-breakpoint
CREATE INDEX "sku_field_values_field_date_idx" ON "sku_field_values" USING btree ("field_id","date_value");--> statement-breakpoint
CREATE INDEX "sku_products_parent_recent_idx" ON "sku_products" USING btree ("spu_id","archived_at","created_at","id");--> statement-breakpoint
CREATE INDEX "sku_products_archived_restore_idx" ON "sku_products" USING btree ("spu_id","archived_with_spu");--> statement-breakpoint
CREATE INDEX "source_records_observed_idx" ON "source_records" USING btree ("observed_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "spu_field_values_entity_field_unique" ON "spu_field_values" USING btree ("spu_id","field_id");--> statement-breakpoint
CREATE INDEX "spu_field_values_field_text_idx" ON "spu_field_values" USING btree ("field_id","text_value");--> statement-breakpoint
CREATE INDEX "spu_field_values_field_number_idx" ON "spu_field_values" USING btree ("field_id","number_value");--> statement-breakpoint
CREATE INDEX "spu_field_values_field_date_idx" ON "spu_field_values" USING btree ("field_id","date_value");--> statement-breakpoint
CREATE INDEX "spu_products_active_updated_idx" ON "spu_products" USING btree ("archived_at","updated_at","id");--> statement-breakpoint
CREATE INDEX "spu_products_brand_idx" ON "spu_products" USING btree ("brand");
--> statement-breakpoint
INSERT INTO "model_fields" ("level", "key", "label", "type", "required", "is_unique", "options", "searchable", "show_in_list", "sort_order", "is_system") VALUES
	('spu', 'spu_code', 'SPU 编码', 'short_text', true, true, '[]'::jsonb, true, true, 1, true),
	('spu', 'name', '商品名称', 'short_text', true, false, '[]'::jsonb, true, true, 2, true),
	('spu', 'brand', '品牌', 'short_text', true, false, '[]'::jsonb, true, true, 3, true),
	('spu', 'category', '品类', 'short_text', false, false, '[]'::jsonb, true, true, 10, false),
	('spu', 'sport', '运动项目', 'short_text', false, false, '[]'::jsonb, true, true, 11, false),
	('spu', 'series', '系列', 'short_text', false, false, '[]'::jsonb, true, true, 12, false),
	('spu', 'product_line', '产品线 / 型号', 'short_text', false, false, '[]'::jsonb, true, true, 13, false),
	('spu', 'target_audience', '目标人群', 'short_text', false, false, '[]'::jsonb, false, false, 14, false),
	('spu', 'primary_use', '主要用途', 'long_text', false, false, '[]'::jsonb, false, false, 15, false),
	('spu', 'release_date', '发售日期', 'date', false, false, '[]'::jsonb, false, false, 16, false),
	('spu', 'description', '商品简介', 'long_text', false, false, '[]'::jsonb, false, false, 17, false),
	('spu', 'official_url', '官方商品链接', 'url', false, false, '[]'::jsonb, false, false, 18, false),
	('spu', 'image_url', '主图来源 URL', 'url', false, false, '[]'::jsonb, false, false, 19, false),
	('sku', 'sku_code', 'SKU 编码', 'short_text', true, true, '[]'::jsonb, true, true, 1, true),
	('sku', 'spu_id', '所属 SPU', 'short_text', true, false, '[]'::jsonb, false, false, 2, true),
	('sku', 'name', 'SKU 名称', 'short_text', true, false, '[]'::jsonb, true, true, 3, true),
	('sku', 'color_name', '颜色名称', 'short_text', false, false, '[]'::jsonb, true, true, 10, false),
	('sku', 'color_code', '颜色编码', 'short_text', false, false, '[]'::jsonb, false, false, 11, false),
	('sku', 'size', '尺码', 'short_text', false, false, '[]'::jsonb, true, true, 12, false),
	('sku', 'size_system', '尺码系统', 'short_text', false, false, '[]'::jsonb, false, false, 13, false),
	('sku', 'width', '宽度', 'short_text', false, false, '[]'::jsonb, false, false, 14, false),
	('sku', 'gtin', 'GTIN', 'short_text', false, true, '[]'::jsonb, true, false, 15, false),
	('sku', 'mpn', 'MPN', 'short_text', false, true, '[]'::jsonb, true, false, 16, false),
	('sku', 'image_url', '变体图像来源 URL', 'url', false, false, '[]'::jsonb, false, false, 17, false),
	('sku', 'launch_status', '产品生命周期状态', 'select', false, false, '["在售", "已停产", "未知"]'::jsonb, false, false, 18, false);
