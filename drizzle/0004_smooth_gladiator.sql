CREATE TABLE "athlete_shoe_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"athlete_id" uuid NOT NULL,
	"brand" varchar(80) NOT NULL,
	"line_name" varchar(120) NOT NULL,
	"relationship_status" varchar(20) NOT NULL,
	"started_year" integer,
	"ended_year" integer,
	"representative_models" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "athlete_shoe_lines_brand_check" CHECK ("athlete_shoe_lines"."brand" IN ('Nike', 'Jordan Brand')),
	CONSTRAINT "athlete_shoe_lines_status_check" CHECK ("athlete_shoe_lines"."relationship_status" IN ('current', 'historical')),
	CONSTRAINT "athlete_shoe_lines_year_check" CHECK (
      ("athlete_shoe_lines"."started_year" IS NULL OR "athlete_shoe_lines"."started_year" BETWEEN 1900 AND 2200)
      AND ("athlete_shoe_lines"."ended_year" IS NULL OR "athlete_shoe_lines"."ended_year" BETWEEN 1900 AND 2200)
      AND ("athlete_shoe_lines"."ended_year" IS NULL OR "athlete_shoe_lines"."started_year" IS NULL OR "athlete_shoe_lines"."ended_year" >= "athlete_shoe_lines"."started_year")
    )
);
--> statement-breakpoint
CREATE TABLE "athlete_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"athlete_id" uuid NOT NULL,
	"shoe_line_id" uuid,
	"source_url" text NOT NULL,
	"publisher" varchar(160) NOT NULL,
	"title" varchar(300) NOT NULL,
	"published_at" date,
	"claim_scope" varchar(40) NOT NULL,
	"evidence_note" text NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verification_status" varchar(24) DEFAULT 'needs_review' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "athlete_sources_claim_scope_check" CHECK ("athlete_sources"."claim_scope" IN ('biography', 'signature_line', 'partnership_status', 'portrait', 'image_license', 'career_highlight')),
	CONSTRAINT "athlete_sources_verification_status_check" CHECK ("athlete_sources"."verification_status" IN ('verified', 'needs_review'))
);
--> statement-breakpoint
CREATE TABLE "star_athletes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(100) NOT NULL,
	"sport_id" uuid NOT NULL,
	"name_zh" varchar(120) NOT NULL,
	"name_en" varchar(160) NOT NULL,
	"league" varchar(80),
	"position" varchar(80),
	"teams_summary" text,
	"nationality" varchar(80),
	"birth_date" date,
	"height_cm" integer,
	"jersey_number" varchar(12),
	"bio" text NOT NULL,
	"portrait_url" text,
	"portrait_alt" text,
	"portrait_source_url" text,
	"portrait_credit" varchar(240),
	"portrait_license" varchar(80),
	"portrait_license_url" text,
	"career_highlights" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "star_athletes_slug_unique" UNIQUE("slug"),
	CONSTRAINT "star_athletes_published_portrait_check" CHECK (NOT "star_athletes"."published" OR (
        "star_athletes"."portrait_url" IS NOT NULL
        AND "star_athletes"."portrait_alt" IS NOT NULL
        AND "star_athletes"."portrait_source_url" IS NOT NULL
        AND "star_athletes"."portrait_credit" IS NOT NULL
        AND "star_athletes"."portrait_license" IS NOT NULL
        AND "star_athletes"."portrait_license_url" IS NOT NULL
      )),
	CONSTRAINT "star_athletes_height_positive_check" CHECK ("star_athletes"."height_cm" IS NULL OR "star_athletes"."height_cm" BETWEEN 100 AND 250)
);
--> statement-breakpoint
CREATE TABLE "star_sports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(40) NOT NULL,
	"name_zh" varchar(60) NOT NULL,
	"name_en" varchar(80) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"content_status" varchar(20) DEFAULT 'coming_soon' NOT NULL,
	"intro" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "star_sports_slug_unique" UNIQUE("slug"),
	CONSTRAINT "star_sports_content_status_check" CHECK ("star_sports"."content_status" IN ('active', 'coming_soon'))
);
--> statement-breakpoint
ALTER TABLE "athlete_shoe_lines" ADD CONSTRAINT "athlete_shoe_lines_athlete_id_star_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."star_athletes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_sources" ADD CONSTRAINT "athlete_sources_athlete_id_star_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."star_athletes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_sources" ADD CONSTRAINT "athlete_sources_shoe_line_id_athlete_shoe_lines_id_fk" FOREIGN KEY ("shoe_line_id") REFERENCES "public"."athlete_shoe_lines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "star_athletes" ADD CONSTRAINT "star_athletes_sport_id_star_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."star_sports"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "athlete_shoe_lines_athlete_line_unique" ON "athlete_shoe_lines" USING btree ("athlete_id","line_name");--> statement-breakpoint
CREATE INDEX "athlete_shoe_lines_athlete_status_order_idx" ON "athlete_shoe_lines" USING btree ("athlete_id","relationship_status","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "athlete_sources_athlete_url_scope_unique" ON "athlete_sources" USING btree ("athlete_id","source_url","claim_scope");--> statement-breakpoint
CREATE INDEX "athlete_sources_athlete_status_idx" ON "athlete_sources" USING btree ("athlete_id","verification_status");--> statement-breakpoint
CREATE INDEX "athlete_sources_shoe_line_idx" ON "athlete_sources" USING btree ("shoe_line_id");--> statement-breakpoint
CREATE INDEX "star_athletes_sport_published_order_idx" ON "star_athletes" USING btree ("sport_id","published","sort_order");--> statement-breakpoint
CREATE INDEX "star_sports_status_order_idx" ON "star_sports" USING btree ("content_status","sort_order");--> statement-breakpoint
INSERT INTO "star_sports" ("slug", "name_zh", "name_en", "sort_order", "content_status", "intro") VALUES
  ('basketball', '篮球', 'Basketball', 1, 'active', '以 Nike 与 Jordan Brand 签名鞋系列为线索，整理 NBA 球员档案、鞋款关系与可核验来源。首批目录为研究样本，不代表穷尽所有历史球员。'),
  ('football', '足球', 'Football', 2, 'coming_soon', '足球运动员档案正在整理，开放前将核对签名鞋合作、球员基础资料和图片许可。'),
  ('tennis', '网球', 'Tennis', 3, 'coming_soon', '网球运动员档案正在整理，开放前将核对签名鞋合作、球员基础资料和图片许可。'),
  ('athletics', '田径', 'Athletics', 4, 'coming_soon', '田径运动员档案正在整理，开放前将核对签名鞋合作、运动员基础资料和图片许可。')
ON CONFLICT ("slug") DO UPDATE SET
  "name_zh" = EXCLUDED."name_zh", "name_en" = EXCLUDED."name_en", "sort_order" = EXCLUDED."sort_order",
  "content_status" = EXCLUDED."content_status", "intro" = EXCLUDED."intro", "updated_at" = now();--> statement-breakpoint
INSERT INTO "star_athletes" (
  "slug", "sport_id", "name_zh", "name_en", "league", "position", "teams_summary", "nationality", "birth_date", "height_cm", "jersey_number", "bio",
  "portrait_url", "portrait_alt", "portrait_source_url", "portrait_credit", "portrait_license", "portrait_license_url", "career_highlights", "sort_order", "published"
)
SELECT
  seed.slug, sport.id, seed.name_zh, seed.name_en, seed.league, seed.position, seed.teams_summary, seed.nationality, seed.birth_date::date, seed.height_cm, seed.jersey_number, seed.bio,
  seed.portrait_url, seed.portrait_alt, seed.portrait_source_url, seed.portrait_credit, seed.portrait_license, seed.portrait_license_url, seed.career_highlights::jsonb, seed.sort_order, true
FROM (VALUES
  ('michael-jordan','迈克尔·乔丹','Michael Jordan','NBA','后卫','芝加哥公牛 / 华盛顿奇才','美国','1963-02-17',198,'23','六次 NBA 总冠军、五次常规赛 MVP 与十次得分王。以 Air Jordan 个人签名鞋系列连接职业篮球与球鞋文化。','/images/stars/michael-jordan.jpg','1997 年身穿芝加哥公牛队球衣、手持篮球的迈克尔·乔丹','https://commons.wikimedia.org/wiki/File:Steve_Lipfosky_--_Michael_Jordan_(1997)_(cropped)_3x4.jpg','Steve Lipofsky / Basketballphoto.com','CC BY-SA 3.0','https://creativecommons.org/licenses/by-sa/3.0/','[{"value":"6","label":"NBA 总冠军"},{"value":"5","label":"常规赛 MVP"},{"value":"14","label":"全明星入选"},{"value":"30.1","label":"生涯场均得分"}]',1),
  ('lebron-james','勒布朗·詹姆斯','LeBron James','NBA','前锋','克利夫兰骑士 / 迈阿密热火 / 洛杉矶湖人','美国','1984-12-30',206,'23','四次 NBA 总冠军与四次常规赛 MVP 得主；Nike LeBron 系列持续推出个人签名篮球鞋。','https://commons.wikimedia.org/wiki/Special:FilePath/LeBron_James_with_Cleveland_2018.jpeg?width=960','勒布朗·詹姆斯身穿克利夫兰骑士队球衣，2018 年比赛照片','https://commons.wikimedia.org/wiki/File:LeBron_James_with_Cleveland_2018.jpeg','Erik Drost / Wikimedia Commons','CC BY 2.0','https://creativecommons.org/licenses/by/2.0/','[{"value":"4","label":"NBA 总冠军"},{"value":"4","label":"常规赛 MVP"}]',2),
  ('kobe-bryant','科比·布莱恩特','Kobe Bryant','NBA','后卫','洛杉矶湖人','美国','1978-08-23',198,'24','五次 NBA 总冠军与一次常规赛 MVP 得主。Nike Kobe 系列以 Protro 版本持续回归。','https://commons.wikimedia.org/wiki/Special:FilePath/Kobe_B_Bryant.jpg?width=960','科比·布莱恩特比赛资料照片','https://commons.wikimedia.org/wiki/File:Kobe_B_Bryant.jpg','Joe Johnson2 / Wikimedia Commons','CC BY-SA 3.0','https://creativecommons.org/licenses/by-sa/3.0/','[{"value":"5","label":"NBA 总冠军"},{"value":"2","label":"总决赛 MVP"}]',3),
  ('kevin-durant','凯文·杜兰特','Kevin Durant','NBA','前锋','雷霆 / 勇士 / 篮网 / 太阳 / 火箭','美国','1988-09-29',211,'7','两次 NBA 总冠军与一次常规赛 MVP 得主；Nike KD 系列延续其个人签名鞋产品线。','https://commons.wikimedia.org/wiki/Special:FilePath/Kevin_Durant.jpg?width=960','凯文·杜兰特身穿俄克拉荷马城雷霆队球衣','https://commons.wikimedia.org/wiki/File:Kevin_Durant.jpg','Justin Smith / J.smith / Wikimedia Commons','CC BY-SA 3.0','https://creativecommons.org/licenses/by-sa/3.0/','[{"value":"2","label":"NBA 总冠军"},{"value":"1","label":"常规赛 MVP"}]',4),
  ('kyrie-irving','凯里·欧文','Kyrie Irving','NBA','后卫','骑士 / 凯尔特人 / 篮网 / 独行侠','美国','1992-03-23',188,'11','2016 年 NBA 总冠军成员。Nike Kyrie 曾推出多代个人签名鞋；该系列标记为历史系列。','https://commons.wikimedia.org/wiki/Special:FilePath/KyrieIrving.jpg?width=960','凯里·欧文比赛资料照片','https://commons.wikimedia.org/wiki/File:KyrieIrving.jpg','Erik Drost / Wikimedia Commons','CC BY 2.0','https://creativecommons.org/licenses/by/2.0/','[{"value":"2016","label":"NBA 总冠军"},{"value":"2014","label":"全明星赛 MVP"}]',5),
  ('giannis-antetokounmpo','扬尼斯·阿德托昆博','Giannis Antetokounmpo','NBA','前锋','密尔沃基雄鹿','希腊','1994-12-06',211,'34','两次常规赛 MVP、2021 年 NBA 总冠军与总决赛 MVP 得主；Nike Giannis Freak 系列持续推出。','https://commons.wikimedia.org/wiki/Special:FilePath/Giannis_Antetokounmpo_(51915264514).jpg?width=960','扬尼斯·阿德托昆博身穿密尔沃基雄鹿队球衣','https://commons.wikimedia.org/wiki/File:Giannis_Antetokounmpo_(51915264514).jpg','Erik Drost / Wikimedia Commons','CC BY 2.0','https://creativecommons.org/licenses/by/2.0/','[{"value":"2","label":"常规赛 MVP"},{"value":"2021","label":"总冠军 / 总决赛 MVP"}]',6),
  ('ja-morant','贾·莫兰特','Ja Morant','NBA','后卫','孟菲斯灰熊','美国','1999-08-10',188,'12','2020 年最佳新秀、2022 年进步最快球员；Nike JA 系列持续推出个人签名鞋。','https://commons.wikimedia.org/wiki/Special:FilePath/Ja_Morant_(51814444505).jpg?width=960','贾·莫兰特比赛资料照片','https://commons.wikimedia.org/wiki/File:Ja_Morant_(51814444505).jpg','Erik Drost / Wikimedia Commons','CC BY 2.0','https://creativecommons.org/licenses/by/2.0/','[{"value":"2020","label":"年度最佳新秀"},{"value":"2022","label":"进步最快球员"}]',7),
  ('devin-booker','德文·布克','Devin Booker','NBA','后卫','菲尼克斯太阳','美国','1996-10-30',196,'1','菲尼克斯太阳核心球员；Nike Book 系列以其比赛风格为设计主题。','https://commons.wikimedia.org/wiki/Special:FilePath/Devinbookercrop.png?width=960','德文·布克肖像资料照片','https://commons.wikimedia.org/wiki/File:Devinbookercrop.png','Leaf8613 / Wikimedia Commons','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0/','[{"value":"2021","label":"NBA 总决赛"},{"value":"4×","label":"全明星入选"}]',8),
  ('paul-george','保罗·乔治','Paul George','NBA','前锋','步行者 / 雷霆 / 快船 / 76人','美国','1990-05-02',203,'8','多次入选全明星与最佳防守阵容；Nike PG 系列曾推出多代个人签名鞋，现列为历史系列。','https://commons.wikimedia.org/wiki/Special:FilePath/1_paul_george_2026.jpg?width=960','保罗·乔治比赛资料照片','https://commons.wikimedia.org/wiki/File:1_paul_george_2026.jpg','Chensiyuan / Wikimedia Commons','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0/','[{"value":"9×","label":"全明星入选"},{"value":"4×","label":"最佳防守阵容第一队"}]',9),
  ('carmelo-anthony','卡梅罗·安东尼','Carmelo Anthony','NBA','前锋','掘金 / 尼克斯 / 雷霆 / 火箭 / 开拓者 / 湖人','美国','1984-05-29',201,'7','十次入选全明星、三次奥运会金牌得主；Jordan Brand Melo 系列曾推出多代个人签名鞋。','https://commons.wikimedia.org/wiki/Special:FilePath/Carmelo_Anthony_(2007).jpg?width=960','卡梅罗·安东尼身穿丹佛掘金队球衣','https://commons.wikimedia.org/wiki/File:Carmelo_Anthony_(2007).jpg','Greg Ma / Wikimedia Commons','CC BY 2.0','https://creativecommons.org/licenses/by/2.0/','[{"value":"10×","label":"全明星入选"},{"value":"3","label":"奥运会金牌"}]',10),
  ('chris-paul','克里斯·保罗','Chris Paul','NBA','后卫','黄蜂 / 快船 / 火箭 / 雷霆 / 太阳 / 勇士 / 马刺','美国','1985-05-06',183,'3','2006 年最佳新秀与十二次全明星球员；Jordan Brand CP3 系列曾推出多代个人签名鞋。','https://commons.wikimedia.org/wiki/Special:FilePath/ChrisPaul.jpg?width=960','克里斯·保罗比赛资料照片','https://commons.wikimedia.org/wiki/File:ChrisPaul.jpg','Keith Allison / Wikimedia Commons','CC BY-SA 2.0','https://creativecommons.org/licenses/by-sa/2.0/','[{"value":"12×","label":"全明星入选"},{"value":"2006","label":"年度最佳新秀"}]',11),
  ('russell-westbrook','拉塞尔·威斯布鲁克','Russell Westbrook','NBA','后卫','雷霆 / 火箭 / 奇才 / 湖人 / 快船 / 掘金 / 国王','美国','1988-11-12',193,'4','2017 年常规赛 MVP；Jordan Brand Why Not? 系列曾推出个人签名篮球鞋。','https://commons.wikimedia.org/wiki/Special:FilePath/Russell_Westbrook.jpg?width=960','拉塞尔·威斯布鲁克比赛资料照片','https://commons.wikimedia.org/wiki/File:Russell_Westbrook.jpg','Keith Allison / Wikimedia Commons','CC BY-SA 2.0','https://creativecommons.org/licenses/by-sa/2.0/','[{"value":"2017","label":"常规赛 MVP"},{"value":"3×","label":"场均三双赛季"}]',12),
  ('luka-doncic','卢卡·东契奇','Luka Dončić','NBA','后卫','达拉斯独行侠 / 洛杉矶湖人','斯洛文尼亚','1999-02-28',201,'77','多次入选全明星与最佳阵容；Jordan Brand Luka 系列持续推出个人签名鞋。','https://commons.wikimedia.org/wiki/Special:FilePath/Luka_Doncic.jpg?width=960','卢卡·东契奇比赛资料照片','https://commons.wikimedia.org/wiki/File:Luka_Doncic.jpg','Erik Drost / Wikimedia Commons','CC BY 2.0','https://creativecommons.org/licenses/by/2.0/','[{"value":"5×","label":"全明星入选"},{"value":"5×","label":"最佳阵容第一队"}]',13),
  ('jayson-tatum','杰森·塔图姆','Jayson Tatum','NBA','前锋','波士顿凯尔特人','美国','1998-03-03',203,'0','2024 年 NBA 总冠军成员；Jordan Brand Tatum 系列持续推出个人签名篮球鞋。','https://commons.wikimedia.org/wiki/Special:FilePath/Jayson_Tatum_(cropped).jpg?width=960','杰森·塔图姆肖像资料照片','https://commons.wikimedia.org/wiki/File:Jayson_Tatum_(cropped).jpg','Erik Drost / Wikimedia Commons','CC BY 2.0','https://creativecommons.org/licenses/by/2.0/','[{"value":"2024","label":"NBA 总冠军"},{"value":"6×","label":"全明星入选"}]',14),
  ('zion-williamson','锡安·威廉森','Zion Williamson','NBA','前锋','新奥尔良鹈鹕','美国','2000-07-06',198,'1','2020 年最佳新秀阵容成员；Jordan Brand Zion 系列持续推出个人签名篮球鞋。','https://commons.wikimedia.org/wiki/Special:FilePath/Zion_Williamson_2020.jpg?width=960','锡安·威廉森比赛资料照片','https://commons.wikimedia.org/wiki/File:Zion_Williamson_2020.jpg','Erik Drost / Wikimedia Commons','CC BY 2.0','https://creativecommons.org/licenses/by/2.0/','[{"value":"2020","label":"最佳新秀阵容第一队"},{"value":"2021","label":"NBA 全明星"}]',15)
) AS seed(slug,name_zh,name_en,league,position,teams_summary,nationality,birth_date,height_cm,jersey_number,bio,portrait_url,portrait_alt,portrait_source_url,portrait_credit,portrait_license,portrait_license_url,career_highlights,sort_order)
JOIN "star_sports" AS sport ON sport."slug" = 'basketball'
ON CONFLICT ("slug") DO UPDATE SET
  "sport_id" = EXCLUDED."sport_id", "name_zh" = EXCLUDED."name_zh", "name_en" = EXCLUDED."name_en", "league" = EXCLUDED."league",
  "position" = EXCLUDED."position", "teams_summary" = EXCLUDED."teams_summary", "nationality" = EXCLUDED."nationality", "birth_date" = EXCLUDED."birth_date",
  "height_cm" = EXCLUDED."height_cm", "jersey_number" = EXCLUDED."jersey_number", "bio" = EXCLUDED."bio", "portrait_url" = EXCLUDED."portrait_url",
  "portrait_alt" = EXCLUDED."portrait_alt", "portrait_source_url" = EXCLUDED."portrait_source_url", "portrait_credit" = EXCLUDED."portrait_credit",
  "portrait_license" = EXCLUDED."portrait_license", "portrait_license_url" = EXCLUDED."portrait_license_url", "career_highlights" = EXCLUDED."career_highlights",
  "sort_order" = EXCLUDED."sort_order", "published" = true, "updated_at" = now();--> statement-breakpoint
INSERT INTO "athlete_shoe_lines" ("athlete_id", "brand", "line_name", "relationship_status", "started_year", "ended_year", "representative_models", "sort_order")
SELECT athlete.id, seed.brand, seed.line_name, seed.relationship_status, seed.started_year, seed.ended_year, seed.representative_models::jsonb, 1
FROM (VALUES
  ('michael-jordan','Jordan Brand','Air Jordan','current',1985,NULL,'[{"name":"Air Jordan 1","releaseYear":1985,"designer":"Peter Moore","description":"系列起点，以鲜明篮球鞋轮廓进入大众视野。","image":{"url":"/images/stars/air-jordan-1.jpg","alt":"红白黑配色的 Air Jordan 1 球鞋资料照片","sourceUrl":"https://commons.wikimedia.org/wiki/File:Nike_Air_Jordan_I.jpg","credit":"Osyffar","license":"CC0 1.0","licenseUrl":"https://creativecommons.org/publicdomain/zero/1.0/"}},{"name":"Air Jordan 3","releaseYear":1988,"designer":"Tinker Hatfield","description":"爆裂纹与 Jumpman 标志成为系列的重要设计语言。","image":{"url":"/images/stars/air-jordan-3.jpg","alt":"白色和水泥灰配色的 Air Jordan 3 球鞋资料照片","sourceUrl":"https://commons.wikimedia.org/wiki/File:Air_Jordan_III,_(White_Cement_Colorway).jpg","credit":"2Pacalyp","license":"CC BY-SA 4.0","licenseUrl":"https://creativecommons.org/licenses/by-sa/4.0/"}},{"name":"Air Jordan 11","releaseYear":1995,"designer":"Tinker Hatfield","description":"漆皮鞋面成为该型号醒目的设计细节。","image":{"url":"/images/stars/air-jordan-11.jpg","alt":"黑红配色的 Air Jordan 11 球鞋资料照片","sourceUrl":"https://commons.wikimedia.org/wiki/File:Air_Jordan_XI_(cropped).jpg","credit":"2Pacalyp / Fourthords","license":"CC BY-SA 4.0","licenseUrl":"https://creativecommons.org/licenses/by-sa/4.0/"}},{"name":"Air Jordan 13","releaseYear":1997,"designer":"Tinker Hatfield","description":"以黑猫为灵感，鞋底形态借鉴豹爪。","image":{"url":"/images/stars/air-jordan-13.jpg","alt":"白黑红配色的 Air Jordan 13 球鞋资料照片","sourceUrl":"https://commons.wikimedia.org/wiki/File:Nike_Air_Jordan_XIII_(cropped).jpg","credit":"2Pacalyp / Fourthords","license":"CC BY-SA 4.0","licenseUrl":"https://creativecommons.org/licenses/by-sa/4.0/"}}]'),
  ('lebron-james','Nike','LeBron','current',2003,NULL,'[{"name":"LeBron 24","releaseYear":2026}]'),
  ('kobe-bryant','Nike','Kobe','current',2005,NULL,'[{"name":"Kobe 10 Protro","releaseYear":2026},{"name":"Kobe 3 Protro","releaseYear":2025}]'),
  ('kevin-durant','Nike','KD','current',2008,NULL,'[{"name":"KD19","releaseYear":2026}]'),
  ('kyrie-irving','Nike','Kyrie','historical',2014,2022,'[{"name":"Kyrie Infinity","releaseYear":2022}]'),
  ('giannis-antetokounmpo','Nike','Giannis Freak','current',2019,NULL,'[{"name":"Freak 8","releaseYear":2026}]'),
  ('ja-morant','Nike','JA','current',2022,NULL,'[{"name":"JA 4","releaseYear":2026}]'),
  ('devin-booker','Nike','Book','current',2024,NULL,'[{"name":"Book 2","releaseYear":2025}]'),
  ('paul-george','Nike','PG','historical',2017,NULL,'[{"name":"PG 1","releaseYear":2017},{"name":"PG 6","releaseYear":2022}]'),
  ('carmelo-anthony','Jordan Brand','Melo','historical',2004,2018,'[{"name":"M13","releaseYear":2018}]'),
  ('chris-paul','Jordan Brand','CP3','historical',2008,2019,'[{"name":"CP3.12","releaseYear":2019}]'),
  ('russell-westbrook','Jordan Brand','Why Not?','historical',2018,NULL,'[{"name":"Why Not? Zer0.7","releaseYear":2023}]'),
  ('luka-doncic','Jordan Brand','Luka','current',2022,NULL,'[{"name":"Luka 5","releaseYear":2025}]'),
  ('jayson-tatum','Jordan Brand','Tatum','current',2023,NULL,'[{"name":"Tatum 5","releaseYear":2026}]'),
  ('zion-williamson','Jordan Brand','Zion','current',2019,NULL,'[{"name":"Zion 4","releaseYear":2025}]')
) AS seed(slug,brand,line_name,relationship_status,started_year,ended_year,representative_models)
JOIN "star_athletes" AS athlete ON athlete.slug = seed.slug
ON CONFLICT ("athlete_id", "line_name") DO UPDATE SET
  "brand" = EXCLUDED."brand", "relationship_status" = EXCLUDED."relationship_status", "started_year" = EXCLUDED."started_year",
  "ended_year" = EXCLUDED."ended_year", "representative_models" = EXCLUDED."representative_models", "updated_at" = now();--> statement-breakpoint
INSERT INTO "athlete_sources" ("athlete_id", "shoe_line_id", "source_url", "publisher", "title", "claim_scope", "evidence_note", "verification_status")
SELECT athlete.id, line.id, seed.url, seed.publisher, seed.title, seed.claim_scope, seed.evidence_note, 'verified'
FROM (VALUES
  ('michael-jordan',NULL,'https://www.nba.com/news/history-nba-legend-michael-jordan','NBA.com','Michael Jordan: NBA Legend','biography','用于球员生涯简介与荣誉概要。'),
  ('michael-jordan','Air Jordan','https://www.nike.com/jordan/air-jordan-1','Nike','Air Jordan 1','signature_line','Air Jordan 官方系列入口；既有页面另记录代表型号。'),
  ('michael-jordan',NULL,'https://commons.wikimedia.org/wiki/File:Steve_Lipfosky_--_Michael_Jordan_(1997)_(cropped)_3x4.jpg','Wikimedia Commons','Michael Jordan (1997) portrait','portrait','记录乔丹照片原始文件页和作者。'),
  ('michael-jordan',NULL,'https://creativecommons.org/licenses/by-sa/3.0/','Creative Commons','Attribution-ShareAlike 3.0','image_license','照片页标注 CC BY-SA 3.0。'),
  ('lebron-james',NULL,'https://www.nba.com/stats/player/2544','NBA.com','LeBron James Player Stats','biography','用于球员资料和职业生涯概况。'),
  ('lebron-james','LeBron','https://about.nike.com/en/newsroom/releases/nike-and-lebron-james-help-players-level-up-with-the-lebron-24-his-lightest-game-shoe-ever','Nike Newsroom','Nike and LeBron James introduce the LeBron 24','signature_line','Nike 官方资料确认 LeBron 24 属于其个人签名鞋系列。'),
  ('lebron-james',NULL,'https://commons.wikimedia.org/wiki/File:LeBron_James_with_Cleveland_2018.jpeg','Wikimedia Commons','LeBron James with Cleveland 2018','portrait','照片作者 Erik Drost。'),
  ('lebron-james',NULL,'https://creativecommons.org/licenses/by/2.0/','Creative Commons','Attribution 2.0 Generic','image_license','Commons 文件页标注 CC BY 2.0。'),
  ('kobe-bryant',NULL,'https://www.nba.com/stats/player/977','NBA.com','Kobe Bryant Player Stats','biography','用于球员生涯资料。'),
  ('kobe-bryant','Kobe','https://about.nike.com/en/newsroom/releases/nike-basketball-debuts-the-kobe-10-protro-an-iconic-silhouette-reimagined-for-todays-game','Nike Newsroom','Nike Basketball debuts the Kobe 10 Protro','signature_line','Nike 官方发布 Kobe Protro 系列资料。'),
  ('kobe-bryant',NULL,'https://commons.wikimedia.org/wiki/File:Kobe_B_Bryant.jpg','Wikimedia Commons','Kobe B Bryant','portrait','照片来源与署名信息见 Commons 文件页。'),
  ('kobe-bryant',NULL,'https://creativecommons.org/licenses/by-sa/3.0/','Creative Commons','Attribution-ShareAlike 3.0','image_license','Commons 文件页标注 CC BY-SA 3.0。'),
  ('kevin-durant',NULL,'https://www.nba.com/stats/player/201142','NBA.com','Kevin Durant Player Stats','biography','用于球员资料和职业生涯概况。'),
  ('kevin-durant','KD','https://about.nike.com/en-GB/newsroom/releases/nike-basketball-and-kevin-durant-hit-the-dagger-with-the-launch-of-the-kd19','Nike Newsroom','Nike Basketball and Kevin Durant launch the KD19','signature_line','Nike 官方发布 KD19 签名鞋资料。'),
  ('kevin-durant',NULL,'https://commons.wikimedia.org/wiki/File:Kevin_Durant.jpg','Wikimedia Commons','Kevin Durant','portrait','照片作者 Justin Smith。'),
  ('kevin-durant',NULL,'https://creativecommons.org/licenses/by-sa/3.0/','Creative Commons','Attribution-ShareAlike 3.0','image_license','Commons 文件页标注 CC BY-SA 3.0。'),
  ('kyrie-irving',NULL,'https://www.nba.com/stats/player/202681','NBA.com','Kyrie Irving Player Stats','biography','用于球员资料和职业生涯概况。'),
  ('kyrie-irving','Kyrie','https://www.nba.com/news/nike-parts-ways-with-nets-guard-kyrie-irving','NBA.com','Nike parts ways with Kyrie Irving','signature_line','报道确认 Nike 曾与欧文合作并推出个人签名鞋，合作于 2022 年结束。'),
  ('kyrie-irving',NULL,'https://commons.wikimedia.org/wiki/File:KyrieIrving.jpg','Wikimedia Commons','KyrieIrving','portrait','照片作者 Erik Drost。'),
  ('kyrie-irving',NULL,'https://creativecommons.org/licenses/by/2.0/','Creative Commons','Attribution 2.0 Generic','image_license','Commons 文件页标注 CC BY 2.0。'),
  ('giannis-antetokounmpo',NULL,'https://www.nba.com/stats/player/203507','NBA.com','Giannis Antetokounmpo Player Stats','biography','用于球员资料和职业生涯概况。'),
  ('giannis-antetokounmpo','Giannis Freak','https://about.nike.com/en/newsroom/releases/giannis-antetokounmpo-nike-freak-8-official-images','Nike Newsroom','Giannis Antetokounmpo Nike Freak 8','signature_line','Nike 官方发布 Freak 8 签名鞋资料。'),
  ('giannis-antetokounmpo',NULL,'https://commons.wikimedia.org/wiki/File:Giannis_Antetokounmpo_(51915264514).jpg','Wikimedia Commons','Giannis Antetokounmpo portrait','portrait','照片作者 Erik Drost。'),
  ('giannis-antetokounmpo',NULL,'https://creativecommons.org/licenses/by/2.0/','Creative Commons','Attribution 2.0 Generic','image_license','Commons 文件页标注 CC BY 2.0。'),
  ('ja-morant',NULL,'https://www.nba.com/stats/player/1629630','NBA.com','Ja Morant Player Stats','biography','用于球员资料和职业生涯概况。'),
  ('ja-morant','JA','https://about.nike.com/en/newsroom/releases/become-a-defenders-worst-nightmare-with-the-nike-ja-4-ja-morant-fourth-signature-shoe','Nike Newsroom','Nike JA 4: Ja Morant fourth signature shoe','signature_line','Nike 官方资料确认 JA 4 为第四代签名鞋。'),
  ('ja-morant',NULL,'https://commons.wikimedia.org/wiki/File:Ja_Morant_(51814444505).jpg','Wikimedia Commons','Ja Morant (51814444505)','portrait','照片作者 Erik Drost。'),
  ('ja-morant',NULL,'https://creativecommons.org/licenses/by/2.0/','Creative Commons','Attribution 2.0 Generic','image_license','Commons 文件页标注 CC BY 2.0。'),
  ('devin-booker',NULL,'https://www.nba.com/stats/player/1626164','NBA.com','Devin Booker Player Stats','biography','用于球员资料和职业生涯概况。'),
  ('devin-booker','Book','https://about.nike.com/en/newsroom/releases/nike-book-2-official-images-release-info','Nike Newsroom','Nike Book 2 official images and release info','signature_line','Nike 官方发布 Book 2 签名鞋资料。'),
  ('devin-booker',NULL,'https://commons.wikimedia.org/wiki/File:Devinbookercrop.png','Wikimedia Commons','Devinbookercrop','portrait','照片作者 Leaf8613。'),
  ('devin-booker',NULL,'https://creativecommons.org/licenses/by-sa/4.0/','Creative Commons','Attribution-ShareAlike 4.0','image_license','Commons 文件页标注 CC BY-SA 4.0。'),
  ('paul-george',NULL,'https://www.nba.com/stats/player/202331','NBA.com','Paul George Player Stats','biography','用于球员资料和职业生涯概况。'),
  ('paul-george','PG','https://www.nba.com/pacers/news/paul-georges-pg1-ferocity-hits-shelves-saturday','Indiana Pacers','Paul George PG1 release','signature_line','球队官方资料确认 PG1 为个人签名鞋系列产品；记录历史系列关系。'),
  ('paul-george',NULL,'https://commons.wikimedia.org/wiki/File:1_paul_george_2026.jpg','Wikimedia Commons','Paul George 2026','portrait','照片作者 Chensiyuan。'),
  ('paul-george',NULL,'https://creativecommons.org/licenses/by-sa/4.0/','Creative Commons','Attribution-ShareAlike 4.0','image_license','Commons 文件页标注 CC BY-SA 4.0。'),
  ('carmelo-anthony',NULL,'https://www.nba.com/stats/player/2546','NBA.com','Carmelo Anthony Player Stats','biography','用于球员资料和职业生涯概况。'),
  ('carmelo-anthony','Melo','https://www.nbcsports.com/nba/news/report-jordan-brand-ending-carmelo-anthonys-signature-shoe-line','NBC Sports','Jordan Brand ending Carmelo Anthony signature shoe line','signature_line','报道记录 Melo 个人签名鞋系列结束。'),
  ('carmelo-anthony',NULL,'https://commons.wikimedia.org/wiki/File:Carmelo_Anthony_(2007).jpg','Wikimedia Commons','Carmelo Anthony (2007)','portrait','照片作者 Greg Ma。'),
  ('carmelo-anthony',NULL,'https://creativecommons.org/licenses/by/2.0/','Creative Commons','Attribution 2.0 Generic','image_license','Commons 文件页标注 CC BY 2.0。'),
  ('chris-paul',NULL,'https://www.nba.com/stats/player/101108','NBA.com','Chris Paul Player Stats','biography','用于球员资料和职业生涯概况。'),
  ('chris-paul','CP3','https://investors.nike.com/investors/news-events-and-reports/investor-news/investor-news-details/2008/Jordan-Brand-Launches-First-Signature-Shoe-for-Chris-Paul/default.aspx','Nike Investor Relations','Jordan Brand launches first signature shoe for Chris Paul','signature_line','Nike 投资者关系官方资料确认 CP3 个人签名鞋系列。'),
  ('chris-paul',NULL,'https://commons.wikimedia.org/wiki/File:ChrisPaul.jpg','Wikimedia Commons','ChrisPaul','portrait','照片作者 Keith Allison。'),
  ('chris-paul',NULL,'https://creativecommons.org/licenses/by-sa/2.0/','Creative Commons','Attribution-ShareAlike 2.0','image_license','Commons 文件页标注 CC BY-SA 2.0。'),
  ('russell-westbrook',NULL,'https://www.nba.com/stats/player/201566','NBA.com','Russell Westbrook Player Stats','biography','用于球员资料和职业生涯概况。'),
  ('russell-westbrook','Why Not?','https://www.sportsbusinessjournal.com/Daily/Issues/2015/07/13/Marketing-and-Sponsorship/Westbrook/','Sports Business Journal','Jordan Brand and Russell Westbrook signature footwear','signature_line','报道记录 Westbrook 与 Jordan Brand 的个人鞋款合作；只将系列产品状态标记为历史系列。'),
  ('russell-westbrook',NULL,'https://commons.wikimedia.org/wiki/File:Russell_Westbrook.jpg','Wikimedia Commons','Russell Westbrook','portrait','照片作者 Keith Allison。'),
  ('russell-westbrook',NULL,'https://creativecommons.org/licenses/by-sa/2.0/','Creative Commons','Attribution-ShareAlike 2.0','image_license','Commons 文件页标注 CC BY-SA 2.0。'),
  ('luka-doncic',NULL,'https://www.nba.com/stats/player/1629029','NBA.com','Luka Dončić Player Stats','biography','用于球员资料和职业生涯概况。'),
  ('luka-doncic','Luka','https://about.nike.com/en/newsroom/releases/jordan-brand-luka-5-official-images','Nike Newsroom','Jordan Brand Luka 5 official images','signature_line','Jordan Brand 官方发布 Luka 5 签名鞋资料。'),
  ('luka-doncic',NULL,'https://commons.wikimedia.org/wiki/File:Luka_Doncic.jpg','Wikimedia Commons','Luka Doncic','portrait','照片作者 Erik Drost。'),
  ('luka-doncic',NULL,'https://creativecommons.org/licenses/by/2.0/','Creative Commons','Attribution 2.0 Generic','image_license','Commons 文件页标注 CC BY 2.0。'),
  ('jayson-tatum',NULL,'https://www.nba.com/stats/player/1628369','NBA.com','Jayson Tatum Player Stats','biography','用于球员资料和职业生涯概况。'),
  ('jayson-tatum','Tatum','https://about.nike.com/en/newsroom/releases/jordan-brand-invites-players-to-control-the-game-with-jayson-tatums-new-signature-shoe-the-tatum-5','Nike Newsroom','Jordan Brand Tatum 5 official release','signature_line','Jordan Brand 官方发布 Tatum 5 签名鞋资料。'),
  ('jayson-tatum',NULL,'https://commons.wikimedia.org/wiki/File:Jayson_Tatum_(cropped).jpg','Wikimedia Commons','Jayson Tatum cropped portrait','portrait','照片作者 Erik Drost。'),
  ('jayson-tatum',NULL,'https://creativecommons.org/licenses/by/2.0/','Creative Commons','Attribution 2.0 Generic','image_license','Commons 文件页标注 CC BY 2.0。'),
  ('zion-williamson',NULL,'https://www.nba.com/stats/player/1629627','NBA.com','Zion Williamson Player Stats','biography','用于球员资料和职业生涯概况。'),
  ('zion-williamson','Zion','https://about.nike.com/en-GB/newsroom/releases/jordan-brands-new-zion-4-is-built-for-strength-and-speed','Nike Newsroom','Jordan Brand Zion 4 release','signature_line','Jordan Brand 官方发布 Zion 4 签名鞋资料。'),
  ('zion-williamson',NULL,'https://commons.wikimedia.org/wiki/File:Zion_Williamson_2020.jpg','Wikimedia Commons','Zion Williamson 2020','portrait','照片作者 Erik Drost。'),
  ('zion-williamson',NULL,'https://creativecommons.org/licenses/by/2.0/','Creative Commons','Attribution 2.0 Generic','image_license','Commons 文件页标注 CC BY 2.0。')
) AS seed(slug,line_name,url,publisher,title,claim_scope,evidence_note)
JOIN "star_athletes" AS athlete ON athlete.slug = seed.slug
LEFT JOIN "athlete_shoe_lines" AS line ON line.athlete_id = athlete.id AND line.line_name = seed.line_name
ON CONFLICT ("athlete_id", "source_url", "claim_scope") DO UPDATE SET
  "shoe_line_id" = EXCLUDED."shoe_line_id", "publisher" = EXCLUDED."publisher", "title" = EXCLUDED."title",
  "evidence_note" = EXCLUDED."evidence_note", "verification_status" = 'verified', "checked_at" = now(), "updated_at" = now();
