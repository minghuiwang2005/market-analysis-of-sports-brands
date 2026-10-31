CREATE TABLE "admin_login_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_hash" varchar(64) NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "llm_model_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"base_url" text NOT NULL,
	"model" varchar(200) NOT NULL,
	"api_key_ciphertext" text NOT NULL,
	"api_key_iv" varchar(24) NOT NULL,
	"api_key_auth_tag" varchar(32) NOT NULL,
	"api_key_last4" varchar(4) NOT NULL,
	"key_version" integer DEFAULT 1 NOT NULL,
	"priority" integer DEFAULT 10 NOT NULL,
	"timeout_seconds" integer DEFAULT 60 NOT NULL,
	"reasoning_enabled" boolean DEFAULT false NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"last_test_status" varchar(20) DEFAULT 'untested' NOT NULL,
	"last_tested_at" timestamp with time zone,
	"last_test_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "llm_model_configs_priority_positive" CHECK ("llm_model_configs"."priority" > 0),
	CONSTRAINT "llm_model_configs_timeout_range" CHECK ("llm_model_configs"."timeout_seconds" BETWEEN 1 AND 180),
	CONSTRAINT "llm_model_configs_test_status" CHECK ("llm_model_configs"."last_test_status" IN ('untested', 'success', 'failed')),
	CONSTRAINT "llm_model_configs_default_enabled" CHECK (NOT "llm_model_configs"."is_default" OR "llm_model_configs"."enabled")
);
--> statement-breakpoint
CREATE INDEX "admin_login_attempts_source_time_idx" ON "admin_login_attempts" USING btree ("source_hash","attempted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "llm_model_configs_single_default_idx" ON "llm_model_configs" USING btree ("is_default") WHERE "llm_model_configs"."is_default";