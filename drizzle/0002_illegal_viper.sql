CREATE TABLE "sports_timeline_event_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"url" text NOT NULL,
	"publisher" varchar(160) NOT NULL,
	"source_title" varchar(300) NOT NULL,
	"published_at" date,
	"claim_scope" varchar(40) NOT NULL,
	"evidence_note" text NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verification_status" varchar(24) DEFAULT 'needs_review' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sports_timeline_event_sources_claim_scope_check" CHECK ("sports_timeline_event_sources"."claim_scope" IN ('league_event', 'athlete_signing')),
	CONSTRAINT "sports_timeline_event_sources_verification_status_check" CHECK ("sports_timeline_event_sources"."verification_status" IN ('verified', 'needs_review'))
);
--> statement-breakpoint
CREATE TABLE "sports_timeline_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_key" varchar(120) NOT NULL,
	"sport" varchar(30) NOT NULL,
	"event_type" varchar(40) NOT NULL,
	"category" varchar(40) NOT NULL,
	"occurred_year" integer NOT NULL,
	"occurred_month" integer,
	"occurred_day" integer,
	"date_precision" varchar(10) NOT NULL,
	"athlete_name_zh" varchar(120),
	"athlete_name_en" varchar(160),
	"organization" varchar(120),
	"title" varchar(240) NOT NULL,
	"description" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sports_timeline_events_year_range_check" CHECK ("sports_timeline_events"."occurred_year" BETWEEN 1800 AND 2200),
	CONSTRAINT "sports_timeline_events_date_parts_check" CHECK ((
        ("sports_timeline_events"."date_precision" = 'year' AND "sports_timeline_events"."occurred_month" IS NULL AND "sports_timeline_events"."occurred_day" IS NULL)
        OR ("sports_timeline_events"."date_precision" = 'month' AND "sports_timeline_events"."occurred_month" BETWEEN 1 AND 12 AND "sports_timeline_events"."occurred_day" IS NULL)
        OR (
          "sports_timeline_events"."date_precision" = 'day'
          AND "sports_timeline_events"."occurred_month" BETWEEN 1 AND 12
          AND "sports_timeline_events"."occurred_day" BETWEEN 1 AND CASE
            WHEN "sports_timeline_events"."occurred_month" IN (1, 3, 5, 7, 8, 10, 12) THEN 31
            WHEN "sports_timeline_events"."occurred_month" IN (4, 6, 9, 11) THEN 30
            WHEN "sports_timeline_events"."occurred_month" = 2 THEN CASE
              WHEN ("sports_timeline_events"."occurred_year" % 400 = 0) OR ("sports_timeline_events"."occurred_year" % 4 = 0 AND "sports_timeline_events"."occurred_year" % 100 <> 0) THEN 29
              ELSE 28
            END
            ELSE 0
          END
        )
      )),
	CONSTRAINT "sports_timeline_events_type_category_check" CHECK ((
        ("sports_timeline_events"."event_type" = 'league_milestone'
          AND "sports_timeline_events"."category" IN ('league', 'rules', 'people', 'global', 'culture')
          AND "sports_timeline_events"."athlete_name_zh" IS NULL
          AND "sports_timeline_events"."athlete_name_en" IS NULL
          AND "sports_timeline_events"."organization" IS NULL)
        OR ("sports_timeline_events"."event_type" = 'athlete_signing'
          AND "sports_timeline_events"."category" = 'athlete_signing'
          AND "sports_timeline_events"."athlete_name_zh" IS NOT NULL
          AND "sports_timeline_events"."athlete_name_en" IS NOT NULL
          AND "sports_timeline_events"."organization" IS NOT NULL)
      ))
);
--> statement-breakpoint
ALTER TABLE "sports_timeline_event_sources" ADD CONSTRAINT "sports_timeline_event_sources_event_id_sports_timeline_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."sports_timeline_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sports_timeline_event_sources_event_url_unique" ON "sports_timeline_event_sources" USING btree ("event_id","url");--> statement-breakpoint
CREATE INDEX "sports_timeline_event_sources_event_status_idx" ON "sports_timeline_event_sources" USING btree ("event_id","verification_status");--> statement-breakpoint
CREATE UNIQUE INDEX "sports_timeline_events_event_key_unique" ON "sports_timeline_events" USING btree ("event_key");--> statement-breakpoint
CREATE INDEX "sports_timeline_events_sport_published_year_order_idx" ON "sports_timeline_events" USING btree ("sport","published","occurred_year","sort_order");
--> statement-breakpoint
INSERT INTO "sports_timeline_events" (
	"event_key", "sport", "event_type", "category", "occurred_year", "occurred_month", "occurred_day", "date_precision",
	"athlete_name_zh", "athlete_name_en", "organization", "title", "description", "sort_order", "published"
) VALUES
	('nba-2026-present', 'nba', 'league_milestone', 'league', 2026, 10, NULL, 'month', NULL, NULL, NULL, '走过八十年，故事仍在继续', '从 1946 年的 BAA 到拥有 30 支球队的 NBA，联盟持续举办常规赛与季后赛，并不断发展篮球文化。此处为截至 2026 年 10 月的概览。', 0, true),
	('nba-2025-media-rights', 'nba', 'league_milestone', 'global', 2025, NULL, NULL, 'year', NULL, NULL, NULL, '新一轮媒体版权合作开启', '与迪士尼、NBCUniversal 和亚马逊的长期协议从 2025—26 赛季开始实施，NBA 比赛进入新的播出与流媒体分发阶段。', 0, true),
	('nba-2023-in-season-tournament', 'nba', 'league_milestone', 'rules', 2023, 12, 9, 'day', NULL, NULL, NULL, '首届季中锦标赛落幕', '2023 年 12 月 9 日，NBA 首次举办的季中锦标赛落幕；洛杉矶湖人赢得首座 NBA 杯。', 0, true),
	('nba-2020-bubble-season', 'nba', 'league_milestone', 'league', 2020, NULL, NULL, 'year', NULL, NULL, NULL, '赛季暂停后在单一赛区复赛', '联盟于 2020 年 3 月暂停比赛，7 月在佛罗里达州奥兰多附近的单一赛区恢复 2019—20 赛季。', 0, true),
	('nba-2001-development-league', 'nba', 'league_milestone', 'culture', 2001, NULL, NULL, 'year', NULL, NULL, NULL, '发展联盟开始比赛', 'NBA Development League（现 NBA G League）在 2001—02 赛季开启比赛，扩展了球员培养与成长路径。', 0, true),
	('nba-1997-wnba-first-games', 'nba', 'league_milestone', 'culture', 1997, 6, NULL, 'month', NULL, NULL, NULL, 'WNBA 首场比赛举行', '由 NBA 支持创办的 WNBA 于 1997 年 6 月举行首批常规赛，为职业女子篮球建立新的舞台。', 0, true),
	('nba-1992-dream-team', 'nba', 'league_milestone', 'global', 1992, NULL, NULL, 'year', NULL, NULL, NULL, '美国“梦之队”亮相奥运会', '首次由 NBA 球星组成的美国男篮奥运队夺得金牌，成为篮球走向全球的重要象征。', 0, true),
	('nba-1984-draft-class', 'nba', 'league_milestone', 'people', 1984, NULL, NULL, 'year', NULL, NULL, NULL, '一届影响深远的选秀', '迈克尔·乔丹、哈基姆·奥拉朱旺、查尔斯·巴克利和约翰·斯托克顿在这一年进入联盟。', 0, true),
	('nba-1979-three-point-line', 'nba', 'league_milestone', 'rules', 1979, NULL, NULL, 'year', NULL, NULL, NULL, '三分线成为正式规则', 'NBA 在 1979—80 赛季正式采用三分球规则，为此后几十年的战术演变打开新的空间。', 0, true),
	('nba-1976-aba-merger', 'nba', 'league_milestone', 'league', 1976, NULL, NULL, 'year', NULL, NULL, NULL, '四支 ABA 球队加入 NBA', '原 ABA 的篮网、步行者、掘金和马刺加入 NBA，联盟规模与球员版图随之扩大。', 0, true),
	('nba-1954-shot-clock', 'nba', 'league_milestone', 'rules', 1954, NULL, NULL, 'year', NULL, NULL, NULL, '24 秒进攻计时启用', '联盟于 1954 年引入 24 秒进攻计时，改变比赛节奏，也成为现代篮球的核心规则之一。', 0, true),
	('nba-1950-integration', 'nba', 'league_milestone', 'people', 1950, NULL, NULL, 'year', NULL, NULL, NULL, '黑人球员进入 NBA', '查克·库珀、纳特·克利夫顿和厄尔·劳埃德分别在选秀、签约与正式比赛中取得开创性突破。', 0, true),
	('nba-1949-baa-nbl-merger', 'nba', 'league_milestone', 'league', 1949, 8, 3, 'day', NULL, NULL, NULL, 'BAA 与 NBL 合并', '1949 年 8 月 3 日，BAA 与国家篮球联盟（NBL）合并，现代 NBA 由此形成。', 0, true),
	('nba-1946-baa-founded', 'nba', 'league_milestone', 'league', 1946, 6, NULL, 'month', NULL, NULL, NULL, 'BAA 在纽约成立', '美国篮球协会（BAA）成立，成为后来 NBA 的前身。同年 11 月，纽约尼克斯与多伦多哈士奇进行了联盟首场比赛。', 0, true),
	('athlete-michael-jordan-nike-1984', 'nba', 'athlete_signing', 'athlete_signing', 1984, 10, 26, 'day', '迈克尔·乔丹', 'Michael Jordan', 'Nike', '乔丹与 Nike 签署球鞋合作', '1984 年 10 月 26 日，乔丹与 Nike 签署球鞋代言合作，为 Air Jordan 系列的诞生奠定基础。', 0, true),
	('athlete-carmelo-anthony-nike-2003', 'nba', 'athlete_signing', 'athlete_signing', 2003, 5, 20, 'day', '卡梅隆·安东尼', 'Carmelo Anthony', 'Nike', '安东尼与 Nike 签订多年球鞋合作', '安东尼于 2003 年 5 月与 Nike 签订多年球鞋合作。', 0, true),
	('athlete-lebron-james-nike-2003', 'nba', 'athlete_signing', 'athlete_signing', 2003, 5, 22, 'day', '勒布朗·詹姆斯', 'LeBron James', 'Nike', '詹姆斯与 Nike 签署新秀代言合同', 'Nike 于 2003 年 5 月 22 日与詹姆斯签下新秀代言合同。', 0, true),
	('athlete-kobe-bryant-nike-2003', 'nba', 'athlete_signing', 'athlete_signing', 2003, 6, 23, 'day', '科比·布莱恩特', 'Kobe Bryant', 'Nike', '科比与 Nike 签署球鞋代言合同', '科比于 2003 年 6 月与 Nike 签署球鞋代言合同，合作包含其个人鞋款计划。', 0, true),
	('athlete-chris-paul-jordan-2006', 'nba', 'athlete_signing', 'athlete_signing', 2006, 11, NULL, 'month', '克里斯·保罗', 'Chris Paul', 'Jordan Brand', '保罗加入 Jordan Brand', '2006 年 11 月，保罗签署多年合约，成为 Jordan Brand 鞋服与配饰代言球员。', 0, true),
	('athlete-kevin-durant-nike-2007', 'nba', 'athlete_signing', 'athlete_signing', 2007, NULL, NULL, 'year', '凯文·杜兰特', 'Kevin Durant', 'Nike', '杜兰特与 Nike 的合作始于 2007 年', '公开报道记载杜兰特与 Nike 的合作关系始于 2007 年；公开资料未提供更精确的签约日。', 0, true),
	('athlete-kyrie-irving-nike-2011', 'nba', 'athlete_signing', 'athlete_signing', 2011, 7, 14, 'day', '凯里·欧文', 'Kyrie Irving', 'Nike', '欧文宣布加入 Nike Basketball', '欧文于 2011 年 7 月 14 日公开宣布签约 Nike；日期按同期报道所载的公开签约消息记录。', 0, true),
	('athlete-giannis-antetokounmpo-nike-2013', 'nba', 'athlete_signing', 'athlete_signing', 2013, NULL, NULL, 'year', '扬尼斯·阿德托昆博', 'Giannis Antetokounmpo', 'Nike', '阿德托昆博与 Nike 建立球鞋合作', '媒体对经纪人的采访回顾称，Nike 在 2013 年选秀前与阿德托昆博签下首份球鞋合作；来源未给出具体日期。', 0, true),
	('athlete-devin-booker-nike-2015', 'nba', 'athlete_signing', 'athlete_signing', 2015, NULL, NULL, 'year', '德文·布克', 'Devin Booker', 'Nike', '布克于 2015 年加入 Nike', '公开报道回顾称，布克在 2015 年被选中进入 NBA 前与 Nike 签约；来源未给出具体日期。', 0, true),
	('athlete-russell-westbrook-jordan-2017', 'nba', 'athlete_signing', 'athlete_signing', 2017, 9, 13, 'day', '拉塞尔·威斯布鲁克', 'Russell Westbrook', 'Jordan Brand', '威斯布鲁克与 Jordan Brand 签署十年续约', '2017 年 9 月的公开报道披露，威斯布鲁克与 Jordan Brand 签署十年续约；此条记录的是续约，不是首次合作。', 0, true),
	('athlete-jayson-tatum-jordan-2019', 'nba', 'athlete_signing', 'athlete_signing', 2019, 6, 21, 'day', '杰森·塔图姆', 'Jayson Tatum', 'Jordan Brand', '塔图姆签署 Jordan Brand 多年球鞋合同', '2019 年 6 月 21 日的公开报道指出，塔图姆与 Jordan Brand 达成多年球鞋合同。', 0, true),
	('athlete-zion-williamson-jordan-2019', 'nba', 'athlete_signing', 'athlete_signing', 2019, 7, 23, 'day', '蔡恩·威廉森', 'Zion Williamson', 'Jordan Brand', '威廉森宣布签约 Jordan Brand', '威廉森于 2019 年 7 月 23 日宣布签约 Jordan Brand，Jordan Brand 同日公开欢迎其加入。', 0, true),
	('athlete-luka-doncic-jordan-2019', 'nba', 'athlete_signing', 'athlete_signing', 2019, 12, 27, 'day', '卢卡·东契奇', 'Luka Dončić', 'Jordan Brand', '东契奇加入 Jordan Brand', 'Jordan Brand 于 2019 年 12 月 27 日发布公告，欢迎东契奇加入品牌阵容。', 0, true),
	('athlete-ja-morant-nike-2022', 'nba', 'athlete_signing', 'athlete_signing', 2022, 12, 25, 'day', '贾·莫兰特', 'Ja Morant', 'Nike', 'Nike 宣布莫兰特加入签名球员阵容', 'Nike 于 2022 年 12 月 25 日宣布莫兰特加入 Nike Basketball 签名球员阵容；此处记录品牌公告日，不推定合同签署日。', 0, true),
	('athlete-kevin-durant-nike-lifetime-2023', 'nba', 'athlete_signing', 'athlete_signing', 2023, 4, 28, 'day', '凯文·杜兰特', 'Kevin Durant', 'Nike', '杜兰特与 Nike 达成终身合同', '美联社于 2023 年 4 月 28 日报道，杜兰特与 Nike 达成终身合作合同；这是续约事件。', 0, true)
ON CONFLICT ("event_key") DO UPDATE SET
	"sport" = EXCLUDED."sport",
	"event_type" = EXCLUDED."event_type",
	"category" = EXCLUDED."category",
	"occurred_year" = EXCLUDED."occurred_year",
	"occurred_month" = EXCLUDED."occurred_month",
	"occurred_day" = EXCLUDED."occurred_day",
	"date_precision" = EXCLUDED."date_precision",
	"athlete_name_zh" = EXCLUDED."athlete_name_zh",
	"athlete_name_en" = EXCLUDED."athlete_name_en",
	"organization" = EXCLUDED."organization",
	"title" = EXCLUDED."title",
	"description" = EXCLUDED."description",
	"sort_order" = EXCLUDED."sort_order",
	"published" = EXCLUDED."published",
	"updated_at" = now();
--> statement-breakpoint
WITH seed("event_key", "url", "publisher", "source_title", "published_at", "claim_scope", "evidence_note") AS (
	VALUES
		('nba-2026-present', 'https://www.nba.com/news/about', 'NBA.com', 'About The NBA', NULL::date, 'league_event', 'NBA 官方介绍提供联盟背景与当前球队规模；八十周年由 1946 至 2026 年份推算。'),
		('nba-2025-media-rights', 'https://pr.nba.com/nba-walt-disney-company-nbcuniversal-amazon-prime-video-media-agreements/', 'NBA Communications', 'NBA signs new 11-year media agreements with The Walt Disney Company, NBCUniversal and Amazon Prime Video through 2035-36 season', '2024-07-24', 'league_event', 'NBA 官方公告说明新媒体协议从 2025-26 赛季起生效。'),
		('nba-2023-in-season-tournament', 'https://www.nba.com/news/2023-nba-in-season-tournament-tracker', 'NBA.com', 'NBA In-Season Tournament Tracker: Lakers win NBA Cup', NULL::date, 'league_event', 'NBA 官方专题记录首届季中锦标赛决赛于 2023 年 12 月 9 日举行，湖人击败步行者夺冠。'),
		('nba-2020-bubble-season', 'https://www.nba.com/nba-returns-2020-faq', 'NBA.com', 'Everything you need to know about the 2019-20 NBA season restart', NULL::date, 'league_event', 'NBA 官方 FAQ 记录赛季暂停及奥兰多复赛安排。'),
		('nba-2001-development-league', 'https://gleague.nba.com/faq', 'NBA G League', 'Frequently Asked Questions: NBA G League', NULL::date, 'league_event', 'NBA G League 官方 FAQ 说明联盟从 2001-02 赛季开始比赛。'),
		('nba-1997-wnba-first-games', 'https://www.nba.com/news/history-this-date-in-nba-june', 'NBA.com', 'This Date in the NBA: June', NULL::date, 'league_event', 'NBA 官方历史档案记录 WNBA 于 1997 年 6 月举行首批常规赛。'),
		('nba-1992-dream-team', 'https://www.nba.com/news/history-top-moments-dream-team-1992', 'NBA.com', 'Top Moments: Dream Team takes world by storm in 1992', NULL::date, 'league_event', 'NBA 官方历史文章记录 1992 年梦之队奥运表现及其传播影响。'),
		('nba-1984-draft-class', 'https://www.nba.com/news/history-season-review-1984-85', 'NBA.com', 'Season Review: 1984-85', NULL::date, 'league_event', 'NBA 官方赛季回顾涵盖 1984 年选秀及该届球员进入联盟。'),
		('nba-1979-three-point-line', 'https://www.nba.com/news/history-3-pointer-evolution-nba-game-larry-bird-stephen-curry-james-harden', 'NBA.com', 'Doubt, disdain marked most NBA teams’ first forays into 3-point land', NULL::date, 'league_event', 'NBA 官方历史文章回顾联盟在 1979-80 赛季引入三分球。'),
		('nba-1976-aba-merger', 'https://www.nba.com/news/history-season-review-1976-77', 'NBA.com', 'Season Review: 1976-77', NULL::date, 'league_event', 'NBA 官方赛季回顾记录 ABA 四支球队于 1976 年加入联盟。'),
		('nba-1954-shot-clock', 'https://jr.nba.com/the-birth-of-the-nba/', 'Jr. NBA', 'The Birth of the NBA', '2015-09-23', 'league_event', 'Jr. NBA 官方历史资料记载 NBA 于 1954 年引入 24 秒进攻计时。'),
		('nba-1950-integration', 'https://www.nba.com/news/history-top-moments-earl-lloyd-chuck-cooper-nat-clifton-new-path-nba', 'NBA.com', 'Top Moments: Earl Lloyd, Chuck Cooper, Nat Clifton blaze new path in NBA', NULL::date, 'league_event', 'NBA 官方历史文章记录库珀、克利夫顿和劳埃德于 1950 年打破种族壁垒。'),
		('nba-1949-baa-nbl-merger', 'https://www.nba.com/news/history-this-date-in-nba-aug', 'NBA.com', 'This Date in the NBA: August', NULL::date, 'league_event', 'NBA 官方历史档案记载 BAA 与 NBL 于 1949 年 8 月 3 日合并。'),
		('nba-1946-baa-founded', 'https://careers.nba.com/history/', 'NBA Careers', 'Discover the Rich Tradition of NBA', NULL::date, 'league_event', 'NBA 官方介绍将 BAA 成立地点记为纽约，并将成立时间记为 1946 年 6 月。'),
		('nba-1946-baa-founded', 'https://jr.nba.com/the-birth-of-the-nba/', 'Jr. NBA', 'The Birth of the NBA', '2015-09-23', 'league_event', 'Jr. NBA 官方历史资料记录 BAA 于 1946 年 11 月 1 日进行了联盟首场比赛。'),
		('athlete-michael-jordan-nike-1984', 'https://www.guinnessworldrecords.com/world-records/776613-largest-sneaker-endorsement', 'Guinness World Records', 'Largest sneaker endorsement', NULL::date, 'athlete_signing', '页面列出 Michael Jordan 与 Nike 于 1984 年 10 月 26 日签署球鞋赞助合同。'),
		('athlete-carmelo-anthony-nike-2003', 'https://www.sportsbusinessjournal.com/Journal/Issues/2003/08/18/Marketingsponsorship/Nikes-Deals-For-Endorsers-Top-%2414B/', 'Sports Business Journal', 'Nike’s deals for endorsers top $1.4B', NULL::date, 'athlete_signing', '报道说明 Nike 于 2003 年 5 月 20 日公布与 Carmelo Anthony 的代言合同。'),
		('athlete-lebron-james-nike-2003', 'https://www.nike.com/basketball/lebron-james', 'Nike', 'LeBron James', NULL::date, 'athlete_signing', 'Nike 官方球员页面明确记载 2003 年 5 月 22 日与 LeBron James 签下新秀代言合同。'),
		('athlete-kobe-bryant-nike-2003', 'https://www.sportsbusinessjournal.com/Daily/Issues/2003/06/24/Sponsorships-Advertising-Marketing/Swoosh-Kobe-Bryant-Will-Lace-Up-Nikes-Under-New-Shoe-Deal/', 'Sports Business Journal', 'Swoosh: Kobe Bryant Will Lace Up Nikes Under New Shoe Deal', NULL::date, 'athlete_signing', '同期报道确认 Kobe Bryant 于 2003 年 6 月与 Nike 签署代言合同。'),
		('athlete-chris-paul-jordan-2006', 'https://www.sportsbusinessjournal.com/Daily/Issues/2006/11/06/Sponsorships-Advertising-Marketing/Three-Young-NBA-Stars-Land-Deals-With-Nikes-Jordan-Brand/', 'Sports Business Journal', 'Three Young NBA Stars Land Deals With Nike’s Jordan Brand', NULL::date, 'athlete_signing', '同期报道确认 Chris Paul 签署六年 Jordan Brand 代言合同；页面所支持精度为 2006 年 11 月。'),
		('athlete-kevin-durant-nike-2007', 'https://www.nba.com/news/kevin-durant-signs-lifetime-deal-with-nike?slide=modal', 'NBA.com / Associated Press', 'Kevin Durant becomes 3rd NBA player to sign lifetime deal with Nike', NULL::date, 'athlete_signing', '美联社报道指出 Durant 与 Nike 的合作关系始于 2007 年；未据此推断月日。'),
		('athlete-kyrie-irving-nike-2011', 'https://www.sportsbusinessjournal.com/Daily/Closing-Bell/2011/07/14/Kyrie/', 'Sports Business Journal', 'Kyrie Irving Signs With Nike, No. 1 NBA Pick Announces On Twitter', NULL::date, 'athlete_signing', '同期报道注明 Irving 于 2011 年 7 月 14 日宣布加入 Nike Basketball。'),
		('athlete-giannis-antetokounmpo-nike-2013', 'https://andscape.com/features/the-story-behind-giannis-antetokounmpos-first-nike-signature-sneaker/', 'Andscape', 'The story behind Giannis Antetokounmpo’s first Nike signature sneaker', NULL::date, 'athlete_signing', 'Andscape 报道回顾其经纪人对合作历程的描述，确认首份球鞋合作在 2013 年新秀赛季前达成；无具体日期。'),
		('athlete-devin-booker-nike-2015', 'https://boardroom.tv/devin-booker-nike-contract-extension/', 'Boardroom', 'EXCLUSIVE: Devin Booker Extends Contract With Nike', NULL::date, 'athlete_signing', '报道回顾 Booker 在 2015 年被选入 NBA 前与 Nike 签约；无具体日期。'),
		('athlete-russell-westbrook-jordan-2017', 'https://www.nba.com/news/report-russell-westbrook-signs-10-year-extension-jordan-brand', 'NBA.com', 'Report: Russell Westbrook signs 10-year extension with Jordan brand', '2017-09-13', 'athlete_signing', 'NBA.com 同期报道记录 Westbrook 与 Jordan Brand 签署十年续约。'),
		('athlete-jayson-tatum-jordan-2019', 'https://bleacherreport.com/articles/2842201-celtics-jayson-tatum-agrees-to-multiyear-shoe-contract-with-jordan-brand', 'Bleacher Report', 'Celtics’ Jayson Tatum Agrees to Multiyear Shoe Contract with Jordan Brand', '2019-06-21', 'athlete_signing', '报道指出 Tatum 于 2019 年 6 月 21 日与 Jordan Brand 达成多年球鞋合同。'),
		('athlete-zion-williamson-jordan-2019', 'https://www.nba.com/news/zion-williamson-chooses-jordan-brand', 'NBA.com', 'Zion Williamson announces he’s signing with Jordan Brand', '2019-07-23', 'athlete_signing', 'NBA.com 记录 Williamson 于 2019 年 7 月 23 日宣布签约，品牌亦于当日欢迎其加入。'),
		('athlete-luka-doncic-jordan-2019', 'https://www.webwire.com/ViewPressRel.asp?aId=252363', 'Jordan Brand via WebWire', 'Jordan Brand Adds Luka Doncic to the Family', '2019-12-27', 'athlete_signing', 'Jordan Brand 新闻稿于 2019 年 12 月 27 日欢迎 Dončić 加入品牌阵容。'),
		('athlete-ja-morant-nike-2022', 'https://about.nike.com/en/newsroom/releases/nike-basketball-adds-ja-morant-to-its-signature-roster', 'Nike', 'Nike Basketball Adds Ja Morant to Its Signature Roster', '2022-12-25', 'athlete_signing', 'Nike 官方公告于 2022 年 12 月 25 日宣布 Morant 加入签名球员阵容；这是公告日期，并非推测的合同签署日。'),
		('athlete-kevin-durant-nike-lifetime-2023', 'https://www.nba.com/news/kevin-durant-signs-lifetime-deal-with-nike?slide=modal', 'NBA.com / Associated Press', 'Kevin Durant becomes 3rd NBA player to sign lifetime deal with Nike', '2023-04-28', 'athlete_signing', '美联社报道确认 Durant 与 Nike 于 2023 年 4 月 28 日达成终身合同；来源日期为报道和公告日期。')
)
INSERT INTO "sports_timeline_event_sources" (
	"event_id", "url", "publisher", "source_title", "published_at", "claim_scope", "evidence_note", "verification_status"
)
SELECT event."id", seed."url", seed."publisher", seed."source_title", seed."published_at", seed."claim_scope", seed."evidence_note", 'verified'
FROM seed
INNER JOIN "sports_timeline_events" AS event ON event."event_key" = seed."event_key"
ON CONFLICT ("event_id", "url") DO UPDATE SET
	"publisher" = EXCLUDED."publisher",
	"source_title" = EXCLUDED."source_title",
	"published_at" = EXCLUDED."published_at",
	"claim_scope" = EXCLUDED."claim_scope",
	"evidence_note" = EXCLUDED."evidence_note",
	"verification_status" = EXCLUDED."verification_status";
