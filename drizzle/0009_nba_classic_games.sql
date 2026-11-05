CREATE TABLE IF NOT EXISTS "nba_classic_games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_key" varchar(120) NOT NULL,
	"occurred_year" integer NOT NULL,
	"game_label" varchar(120) NOT NULL,
	"title" varchar(240) NOT NULL,
	"matchup" varchar(180) NOT NULL,
	"result" varchar(80) NOT NULL,
	"description" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nba_classic_games_year_range_check" CHECK ("occurred_year" BETWEEN 1946 AND 2200)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nba_classic_games_event_key_unique" ON "nba_classic_games" USING btree ("event_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nba_classic_games_published_year_order_idx" ON "nba_classic_games" USING btree ("published","occurred_year","sort_order");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nba_classic_game_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"url" text NOT NULL,
	"publisher" varchar(160) NOT NULL,
	"source_title" varchar(300) NOT NULL,
	"evidence_note" text NOT NULL,
	"verification_status" varchar(24) DEFAULT 'needs_review' NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nba_classic_game_sources_verification_status_check" CHECK ("verification_status" IN ('verified', 'needs_review')),
	CONSTRAINT "nba_classic_game_sources_game_id_nba_classic_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "nba_classic_games"("id") ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nba_classic_game_sources_game_url_unique" ON "nba_classic_game_sources" USING btree ("game_id","url");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nba_classic_game_sources_game_status_idx" ON "nba_classic_game_sources" USING btree ("game_id","verification_status");
--> statement-breakpoint
INSERT INTO "nba_classic_games" ("event_key", "occurred_year", "game_label", "title", "matchup", "result", "description", "sort_order", "published")
VALUES
	('1970-finals-game-3', 1970, 'NBA 总决赛 · 第三场', 'Jerry West 的 60 英尺压哨球', '纽约尼克斯 vs 洛杉矶湖人', '111–108（尼克斯胜）', 'Jerry West 在比赛结束前投中约 60 英尺的压哨球，将比赛拖入加时；尼克斯最终以 111–108 取胜。', 10, true),
	('1998-finals-game-6', 1998, 'NBA 总决赛 · 第六场', '乔丹抢断后命中制胜跳投', '芝加哥公牛 vs 犹他爵士', '87–86（公牛胜）', '比赛最后阶段，乔丹从 Karl Malone 手中抢断，随后投中反超跳投。芝加哥以 87–86 获胜，拿下八年内第六座总冠军。', 20, true),
	('2013-finals-game-6', 2013, 'NBA 总决赛 · 第六场', 'Ray Allen 的底角三分续命', '迈阿密热火 vs 圣安东尼奥马刺', '103–100（热火胜）', 'Ray Allen 在终场前命中扳平三分，将比赛拖入加时；热火最终以 103–100 获胜，并将系列赛带入第七场。', 30, true)
ON CONFLICT ("event_key") DO UPDATE SET
	"occurred_year" = EXCLUDED."occurred_year",
	"game_label" = EXCLUDED."game_label",
	"title" = EXCLUDED."title",
	"matchup" = EXCLUDED."matchup",
	"result" = EXCLUDED."result",
	"description" = EXCLUDED."description",
	"sort_order" = EXCLUDED."sort_order",
	"published" = EXCLUDED."published",
	"updated_at" = now();
--> statement-breakpoint
INSERT INTO "nba_classic_game_sources" ("game_id", "url", "publisher", "source_title", "evidence_note", "verification_status")
SELECT game."id", source."url", 'NBA.com', source."source_title", source."evidence_note", 'verified'
FROM "nba_classic_games" AS game
CROSS JOIN (VALUES
	('1970-finals-game-3', 'https://www.nba.com/news/history-finals-moments-jerry-wests-buzzer-beater-in-1970', 'Top NBA Finals moments: Jerry West''s buzzer-beater in 1970', 'NBA.com records West''s tying 60-foot buzzer-beater in Game 3, the overtime period, and New York''s 111–108 win.'),
	('1998-finals-game-6', 'https://www.nba.com/news/history-finals-moments-michael-jordan-last-shot-1998', 'Top NBA Finals moments: Michael Jordan''s jumper seals 1998 title', 'NBA.com records Jordan''s late steal, the go-ahead jumper with 5.2 seconds remaining, the 87–86 final score, and Chicago''s title.'),
	('2013-finals-game-6', 'https://www.nba.com/news/history-finals-moments-ray-allen-3-pointer-game-6', 'Top NBA Finals moments: Ray Allen''s late 3 turns tide for Heat', 'NBA.com records Allen''s game-tying three with 5.2 seconds remaining and Miami''s overtime win; the official NBA game archive records the 103–100 final score.')
) AS source("event_key", "url", "source_title", "evidence_note")
WHERE game."event_key" = source."event_key"
ON CONFLICT ("game_id", "url") DO UPDATE SET
	"publisher" = EXCLUDED."publisher",
	"source_title" = EXCLUDED."source_title",
	"evidence_note" = EXCLUDED."evidence_note",
	"verification_status" = 'verified',
	"checked_at" = now();
