CREATE TYPE "public"."athlete_product_link_status" AS ENUM('needs_review', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."athlete_evaluation_eligibility" AS ENUM('eligible', 'blocked', 'review_required');--> statement-breakpoint
CREATE TYPE "public"."athlete_evaluation_metric_status" AS ENUM('verified', 'needs_review', 'missing', 'conflict');--> statement-breakpoint
CREATE TYPE "public"."athlete_evaluation_scenario" AS ENUM('china-priority', 'north-america', 'product-portfolio');--> statement-breakpoint
CREATE TYPE "public"."athlete_evaluation_source_status" AS ENUM('suggested', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."athlete_evaluation_status" AS ENUM('complete', 'provisional', 'insufficient_data');--> statement-breakpoint
CREATE TYPE "public"."athlete_evaluation_workflow" AS ENUM('draft', 'finalized');--> statement-breakpoint
CREATE TYPE "public"."product_tier" AS ENUM('signature_retail', 'pe', 'regional_exclusive', 'retro', 'collab');--> statement-breakpoint
CREATE TABLE "athlete_evaluation_metric_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"metric_key" varchar(80) NOT NULL,
	"raw_value" jsonb,
	"normalized_score" double precision,
	"unit" varchar(80),
	"period_start" date,
	"period_end" date,
	"rationale" text,
	"status" "athlete_evaluation_metric_status" DEFAULT 'missing' NOT NULL,
	"reviewer" varchar(160),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "athlete_evaluation_metric_scores_score_check" CHECK ("athlete_evaluation_metric_scores"."normalized_score" IS NULL OR "athlete_evaluation_metric_scores"."normalized_score" BETWEEN 0 AND 10),
	CONSTRAINT "athlete_evaluation_metric_scores_period_check" CHECK ("athlete_evaluation_metric_scores"."period_end" IS NULL OR "athlete_evaluation_metric_scores"."period_start" IS NULL OR "athlete_evaluation_metric_scores"."period_end" >= "athlete_evaluation_metric_scores"."period_start")
);
--> statement-breakpoint
CREATE TABLE "athlete_evaluation_models" (
	"version" varchar(40) PRIMARY KEY NOT NULL,
	"configuration" jsonb NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_by" varchar(160),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "athlete_evaluation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"athlete_id" uuid,
	"candidate_name" varchar(180) NOT NULL,
	"model_version" varchar(40) NOT NULL,
	"as_of_date" date NOT NULL,
	"market" varchar(24) NOT NULL,
	"scenario" "athlete_evaluation_scenario" NOT NULL,
	"ses" double precision,
	"coverage" double precision DEFAULT 0 NOT NULL,
	"dimensions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sensitivity" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"gates" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"eligibility" "athlete_evaluation_eligibility" DEFAULT 'eligible' NOT NULL,
	"base_level" varchar(2),
	"recommended_level" varchar(2),
	"status" "athlete_evaluation_status" DEFAULT 'insufficient_data' NOT NULL,
	"workflow_state" "athlete_evaluation_workflow" DEFAULT 'draft' NOT NULL,
	"finalized_at" timestamp with time zone,
	"created_by" varchar(160),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "athlete_evaluation_runs_market_check" CHECK ("athlete_evaluation_runs"."market" IN ('china', 'north-america')),
	CONSTRAINT "athlete_evaluation_runs_ses_check" CHECK ("athlete_evaluation_runs"."ses" IS NULL OR "athlete_evaluation_runs"."ses" BETWEEN 0 AND 100),
	CONSTRAINT "athlete_evaluation_runs_coverage_check" CHECK ("athlete_evaluation_runs"."coverage" BETWEEN 0 AND 100),
	CONSTRAINT "athlete_evaluation_runs_base_level_check" CHECK ("athlete_evaluation_runs"."base_level" IS NULL OR "athlete_evaluation_runs"."base_level" IN ('L0', 'L1', 'L2', 'L3', 'L4')),
	CONSTRAINT "athlete_evaluation_runs_recommended_level_check" CHECK ("athlete_evaluation_runs"."recommended_level" IS NULL OR "athlete_evaluation_runs"."recommended_level" IN ('L0', 'L1', 'L2', 'L3', 'L4')),
	CONSTRAINT "athlete_evaluation_runs_finalized_check" CHECK ("athlete_evaluation_runs"."workflow_state" <> 'finalized' OR "athlete_evaluation_runs"."finalized_at" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "athlete_evaluation_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metric_score_id" uuid NOT NULL,
	"url" text NOT NULL,
	"publisher" varchar(160) NOT NULL,
	"title" varchar(300) NOT NULL,
	"published_at" date,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"excerpt" text NOT NULL,
	"status" "athlete_evaluation_source_status" DEFAULT 'suggested' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "athlete_evaluation_sources_url_check" CHECK ("athlete_evaluation_sources"."url" ~ '^https?://')
);
--> statement-breakpoint
CREATE TABLE "athlete_shoe_line_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shoe_line_id" uuid NOT NULL,
	"spu_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"verification_status" "athlete_product_link_status" DEFAULT 'needs_review' NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "athlete_shoe_line_products_verified_at_check" CHECK ("athlete_shoe_line_products"."verification_status" <> 'verified' OR "athlete_shoe_line_products"."verified_at" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "sku_products" ADD COLUMN "product_tier" "product_tier";--> statement-breakpoint
ALTER TABLE "sku_products" ADD COLUMN "launch_market" varchar(80);--> statement-breakpoint
ALTER TABLE "spu_products" ADD COLUMN "product_tier" "product_tier";--> statement-breakpoint
ALTER TABLE "spu_products" ADD COLUMN "launch_market" varchar(80);--> statement-breakpoint
ALTER TABLE "athlete_evaluation_metric_scores" ADD CONSTRAINT "athlete_evaluation_metric_scores_run_id_athlete_evaluation_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."athlete_evaluation_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_evaluation_runs" ADD CONSTRAINT "athlete_evaluation_runs_athlete_id_star_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."star_athletes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_evaluation_runs" ADD CONSTRAINT "athlete_evaluation_runs_model_version_athlete_evaluation_models_version_fk" FOREIGN KEY ("model_version") REFERENCES "public"."athlete_evaluation_models"("version") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "athlete_evaluation_sources" ADD CONSTRAINT "athlete_evaluation_sources_metric_score_id_athlete_evaluation_metric_scores_id_fk" FOREIGN KEY ("metric_score_id") REFERENCES "public"."athlete_evaluation_metric_scores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_shoe_line_products" ADD CONSTRAINT "athlete_shoe_line_products_shoe_line_id_athlete_shoe_lines_id_fk" FOREIGN KEY ("shoe_line_id") REFERENCES "public"."athlete_shoe_lines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_shoe_line_products" ADD CONSTRAINT "athlete_shoe_line_products_spu_id_spu_products_id_fk" FOREIGN KEY ("spu_id") REFERENCES "public"."spu_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_shoe_line_products" ADD CONSTRAINT "athlete_shoe_line_products_source_id_athlete_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."athlete_sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "athlete_evaluation_metric_scores_run_metric_unique" ON "athlete_evaluation_metric_scores" USING btree ("run_id","metric_key");--> statement-breakpoint
CREATE INDEX "athlete_evaluation_metric_scores_status_idx" ON "athlete_evaluation_metric_scores" USING btree ("status","metric_key");--> statement-breakpoint
CREATE UNIQUE INDEX "athlete_evaluation_models_single_active_idx" ON "athlete_evaluation_models" USING btree ("active") WHERE "athlete_evaluation_models"."active";--> statement-breakpoint
CREATE INDEX "athlete_evaluation_models_published_idx" ON "athlete_evaluation_models" USING btree ("published_at","version");--> statement-breakpoint
CREATE INDEX "athlete_evaluation_runs_athlete_created_idx" ON "athlete_evaluation_runs" USING btree ("athlete_id","created_at");--> statement-breakpoint
CREATE INDEX "athlete_evaluation_runs_status_date_idx" ON "athlete_evaluation_runs" USING btree ("status","as_of_date","created_at");--> statement-breakpoint
CREATE INDEX "athlete_evaluation_runs_scenario_workflow_idx" ON "athlete_evaluation_runs" USING btree ("scenario","workflow_state","created_at");--> statement-breakpoint
CREATE INDEX "athlete_evaluation_sources_metric_status_idx" ON "athlete_evaluation_sources" USING btree ("metric_score_id","status");--> statement-breakpoint
CREATE INDEX "athlete_evaluation_sources_dates_idx" ON "athlete_evaluation_sources" USING btree ("published_at","observed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "athlete_shoe_line_products_pair_unique" ON "athlete_shoe_line_products" USING btree ("shoe_line_id","spu_id");--> statement-breakpoint
CREATE INDEX "athlete_shoe_line_products_spu_status_idx" ON "athlete_shoe_line_products" USING btree ("spu_id","verification_status");
--> statement-breakpoint
INSERT INTO "athlete_evaluation_models" ("version", "configuration", "active")
VALUES (
  'ses-v1',
  '{"version":"ses-v1","scenarios":{"china-priority":{"D1":20,"D2":20,"D3":15,"D4":20,"D5":15,"D6":10},"north-america":{"D1":20,"D2":25,"D3":15,"D4":10,"D5":20,"D6":10},"product-portfolio":{"D1":15,"D2":15,"D3":20,"D4":15,"D5":25,"D6":10}},"metricWeights":{"D1":{"performance_impact":60,"honors_key_role":40},"D2":{"search_attention":35,"social_reach_engagement":40,"media_exposure":25},"D3":{"play_style_distinctiveness":40,"visual_identity":30,"narrative_completeness":30},"D4":{"china_attention":50,"china_activities":25,"target_audience_fit":25},"D5":{"brand_platform_fit":30,"portfolio_whitespace":40,"product_differentiation":30},"D6":{"availability_sustainability":35,"verified_reputation_safety":40,"career_cooperation_feasibility":25}},"thresholds":{"L1":45,"L2":55,"L3":70,"L4":85},"coverageFloor":80,"dimensionMinimumCoverage":70,"provisionalRequiredDimensions":["D1","D2","D4","D5"],"hardGates":{"storyDimensionMax":3,"attentionDimensionMax":5,"chinaMarketMinimum":3,"cappedLevel":"L2"}}'::jsonb,
  true
)
ON CONFLICT ("version") DO NOTHING;
--> statement-breakpoint
CREATE FUNCTION prevent_athlete_evaluation_model_mutation() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Published athlete evaluation model versions cannot be deleted';
  END IF;
  IF OLD.version IS DISTINCT FROM NEW.version
    OR OLD.configuration IS DISTINCT FROM NEW.configuration
    OR OLD.published_at IS DISTINCT FROM NEW.published_at
    OR OLD.published_by IS DISTINCT FROM NEW.published_by
    OR OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'Published athlete evaluation model configuration is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER athlete_evaluation_models_immutable
BEFORE UPDATE OR DELETE ON athlete_evaluation_models
FOR EACH ROW EXECUTE FUNCTION prevent_athlete_evaluation_model_mutation();
