INSERT INTO "star_athletes" (
  "slug", "sport_id", "name_zh", "name_en", "league", "position", "teams_summary", "nationality", "birth_date", "height_cm", "jersey_number", "bio",
  "portrait_url", "portrait_alt", "portrait_source_url", "portrait_credit", "portrait_license", "portrait_license_url", "career_highlights", "sort_order", "published"
)
SELECT
  seed.slug, sport.id, seed.name_zh, seed.name_en, seed.league, seed.position, seed.teams_summary, seed.nationality, seed.birth_date::date, seed.height_cm, seed.jersey_number, seed.bio,
  seed.portrait_url, seed.portrait_alt, seed.portrait_source_url, seed.portrait_credit, seed.portrait_license, seed.portrait_license_url, seed.career_highlights::jsonb, seed.sort_order, true
FROM (VALUES
  ('dennis-rodman','丹尼斯·罗德曼','Dennis Rodman','NBA','前锋 / 中锋','底特律活塞 / 圣安东尼奥马刺 / 芝加哥公牛 / 洛杉矶湖人 / 达拉斯小牛','美国','1961-05-13',201,'91','NBA 名人堂前锋 / 中锋，五次随底特律活塞和芝加哥公牛夺得总冠军。Nike 曾为其推出 Air Worm Ndestrukt 等个人关联签名鞋款。','https://commons.wikimedia.org/wiki/Special:FilePath/Dennis_Rodman_01_%2834679281591%29.jpg?width=960','丹尼斯·罗德曼出席公开活动的照片','https://commons.wikimedia.org/wiki/File:Dennis_Rodman_01_%2834679281591%29.jpg','GabboT / Wikimedia Commons','CC BY-SA 2.0','https://creativecommons.org/licenses/by-sa/2.0/','[{"value":"5","label":"NBA 总冠军"},{"value":"2","label":"最佳防守球员"}]',27),
  ('chris-webber','克里斯·韦伯','Chris Webber','NBA','前锋','金州勇士 / 华盛顿子弹 / 萨克拉门托国王 / 费城 76 人 / 底特律活塞','美国','1973-03-01',208,'4','NBA 名人堂前锋，曾五次入选全明星。Nike Air Max CW 是以其姓名缩写标识的个人签名鞋，后续复刻版本更名为 Air Max Sensation。','https://commons.wikimedia.org/wiki/Special:FilePath/Chris_Webber_2003.jpg?width=960','克里斯·韦伯在 2003 年 NBA 比赛中的照片','https://commons.wikimedia.org/wiki/File:Chris_Webber_2003.jpg','MavsFan28 / Wikimedia Commons','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0/','[{"value":"5×","label":"全明星入选"},{"value":"1994","label":"年度最佳新秀"}]',28),
  ('tim-hardaway','蒂姆·哈达威','Tim Hardaway','NBA','后卫','金州勇士 / 迈阿密热火 / 达拉斯小牛 / 丹佛掘金 / 印第安纳步行者','美国','1966-09-01',183,'10','NBA 名人堂控球后卫，曾五次入选全明星。Nike Air Zoom T-Bug Flight 是为其推出的个人签名鞋款。','https://commons.wikimedia.org/wiki/Special:FilePath/20150902_Quest_Multisport_clinic_Tim_Hardaway.JPG?width=960','蒂姆·哈达威参加青少年篮球训练营','https://commons.wikimedia.org/wiki/File:20150902_Quest_Multisport_clinic_Tim_Hardaway.JPG','TonyTheTiger / Wikimedia Commons','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0/','[{"value":"5×","label":"全明星入选"},{"value":"1997","label":"最佳阵容第一队"}]',29),
  ('steve-nash','史蒂夫·纳什','Steve Nash','NBA','后卫','菲尼克斯太阳 / 达拉斯小牛 / 洛杉矶湖人','加拿大','1974-02-07',191,'13','NBA 名人堂控球后卫，两次获得常规赛 MVP。Nike Zoom MVP X 曾以 Steve Nash 标识及其专属配色发布，列为历史签名鞋款。','https://commons.wikimedia.org/wiki/Special:FilePath/Steve_Nash.jpg?width=960','史蒂夫·纳什身穿菲尼克斯太阳队球衣','https://commons.wikimedia.org/wiki/File:Steve_Nash.jpg','Keith Allison / Wikimedia Commons','CC BY-SA 2.0','https://creativecommons.org/licenses/by-sa/2.0/','[{"value":"2","label":"常规赛 MVP"},{"value":"8×","label":"全明星入选"}]',30),
  ('paul-pierce','保罗·皮尔斯','Paul Pierce','NBA','前锋','波士顿凯尔特人 / 布鲁克林篮网 / 华盛顿奇才 / 洛杉矶快船','美国','1977-10-13',201,'34','NBA 名人堂前锋，2008 年总冠军与总决赛 MVP。Nike Air Max Pierce / P2 系列曾为其推出多代个人签名鞋。','https://commons.wikimedia.org/wiki/Special:FilePath/Celtics_Rolling_Rally_Paul_Pierce.jpg?width=960','保罗·皮尔斯在 2008 年凯尔特人夺冠庆典上展示总决赛 MVP 奖杯','https://commons.wikimedia.org/wiki/File:Celtics_Rolling_Rally_Paul_Pierce.jpg','Paul Keleher / Wikimedia Commons','CC BY 2.0','https://creativecommons.org/licenses/by/2.0/','[{"value":"2008","label":"NBA 总冠军 / 总决赛 MVP"},{"value":"10×","label":"全明星入选"}]',31)
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
SELECT athlete.id, seed.brand, seed.line_name, 'historical', seed.started_year, NULL, seed.representative_models::jsonb, 1
FROM (VALUES
  ('dennis-rodman','Nike','Ndestrukt',1996,'[{"name":"Air Worm Ndestrukt","releaseYear":1996},{"name":"Air Shake Ndestrukt","releaseYear":1996}]'),
  ('chris-webber','Nike','Air Max CW',1995,'[{"name":"Air Max CW","releaseYear":1995},{"name":"Air Max Sensation","releaseYear":1998}]'),
  ('tim-hardaway','Nike','T-Bug Flight',1998,'[{"name":"Air Zoom T-Bug Flight","releaseYear":1998}]'),
  ('steve-nash','Nike','Steve Nash',2009,'[{"name":"Zoom MVP X","releaseYear":2009}]'),
  ('paul-pierce','Nike','Air Max Pierce',2005,'[{"name":"Air Max Pierce 1","releaseYear":2005},{"name":"Air Max P2","releaseYear":2005}]')
) AS seed(slug,brand,line_name,started_year,representative_models)
JOIN "star_athletes" AS athlete ON athlete.slug = seed.slug
ON CONFLICT ("athlete_id", "line_name") DO UPDATE SET
  "brand" = EXCLUDED."brand", "relationship_status" = EXCLUDED."relationship_status", "started_year" = EXCLUDED."started_year",
  "ended_year" = EXCLUDED."ended_year", "representative_models" = EXCLUDED."representative_models", "updated_at" = now();--> statement-breakpoint

INSERT INTO "athlete_sources" ("athlete_id", "shoe_line_id", "source_url", "publisher", "title", "claim_scope", "evidence_note", "verification_status")
SELECT athlete.id, line.id, seed.source_url, seed.publisher, seed.title, seed.claim_scope, seed.evidence_note, 'verified'
FROM (VALUES
  ('dennis-rodman',NULL,'https://www.nba.com/player/23/dennis-rodman','NBA.com','Dennis Rodman player profile','biography','球员资料、身高、球队经历与生涯荣誉。'),
  ('dennis-rodman','Ndestrukt','https://www.sneakerfreaker.com/features/the-evolution-of-dennis-rodmans-sneaker-style','Sneaker Freaker','The Evolution of Dennis Rodman’s NBA Sneaker Style','signature_line','区分 Nike Air Worm Ndestrukt 的正式签名身份与 Air Shake Ndestrukt 的球员关联款；此处仅记录可查证的历史产品关系。'),
  ('dennis-rodman',NULL,'https://commons.wikimedia.org/wiki/File:Dennis_Rodman_01_(34679281591).jpg','Wikimedia Commons','Dennis Rodman 01','portrait','照片作者 GabboT。'),
  ('dennis-rodman',NULL,'https://creativecommons.org/licenses/by-sa/2.0/','Creative Commons','Attribution-ShareAlike 2.0 Generic','image_license','Commons 文件页标注 CC BY-SA 2.0。'),
  ('chris-webber',NULL,'https://www.nba.com/stats/player/100','NBA.com','Chris Webber player profile','biography','用于球员资料、身高、球队经历与职业生涯概况。'),
  ('chris-webber','Air Max CW','https://sneakernews.com/2015/08/19/flashback-to-95-the-best-of-the-rest/','Sneaker News','Flashback to ’95: The Best of the Rest','signature_line','报道记载 Nike 为 Chris Webber 推出首款签名鞋 Air Max CW；鞋跟带有 CW 标识。'),
  ('chris-webber',NULL,'https://commons.wikimedia.org/wiki/File:Chris_Webber_2003.jpg','Wikimedia Commons','Chris Webber 2003','portrait','照片作者 MavsFan28。'),
  ('chris-webber',NULL,'https://creativecommons.org/licenses/by-sa/4.0/','Creative Commons','Attribution-ShareAlike 4.0 International','image_license','Commons 文件页标注 CC BY-SA 4.0。'),
  ('tim-hardaway',NULL,'https://www.nba.com/stats/player/896/traditional','NBA.com','Tim Hardaway player profile','biography','用于球员资料、身高、球队经历与职业生涯概况。'),
  ('tim-hardaway','T-Bug Flight','https://www.nicekicks.com/tim-hardaway/','Nice Kicks','Tim Hardaway','signature_line','明确将 Nike Air Zoom T-Bug Flight 记为 Tim Hardaway 的个人签名鞋。'),
  ('tim-hardaway',NULL,'https://commons.wikimedia.org/wiki/File:20150902_Quest_Multisport_clinic_Tim_Hardaway.JPG','Wikimedia Commons','Tim Hardaway at Quest Multisport clinic','portrait','照片作者 TonyTheTiger。'),
  ('tim-hardaway',NULL,'https://creativecommons.org/licenses/by-sa/4.0/','Creative Commons','Attribution-ShareAlike 4.0 International','image_license','Commons 文件页标注 CC BY-SA 4.0。'),
  ('steve-nash',NULL,'https://www.nba.com/stats/player/959/traditional','NBA.com','Steve Nash player profile','biography','用于球员资料、身高、球队经历与职业生涯概况。'),
  ('steve-nash','Steve Nash','https://sneakernews.com/2008/11/15/nike-zoom-mvp-x-steve-nash-pe/','Sneaker News','Nike Zoom MVP X – Steve Nash PE','signature_line','Nike Zoom MVP X 的 Nash 专属配色带有 Steve Nash 标识并公开发布；来源同时指出该鞋也由其他后卫穿着，因此按单一历史签名型号记录，不扩大为多代产品线。'),
  ('steve-nash',NULL,'https://commons.wikimedia.org/wiki/File:Steve_Nash.jpg','Wikimedia Commons','Steve Nash','portrait','照片作者 Keith Allison。'),
  ('steve-nash',NULL,'https://creativecommons.org/licenses/by-sa/2.0/','Creative Commons','Attribution-ShareAlike 2.0 Generic','image_license','Commons 文件页标注 CC BY-SA 2.0。'),
  ('paul-pierce',NULL,'https://www.nba.com/stats/player/1718/traditional','NBA.com','Paul Pierce player profile','biography','用于球员资料、身高、球队经历与职业生涯概况。'),
  ('paul-pierce','Air Max Pierce','https://kicksologists.com/2025/01/27/every-basketball-player-to-have-a-signature-shoe-deal-with-nike/','Kicksologists','Every Basketball Player to Have a Signature Shoe Deal with Nike','signature_line','记载 Paul Pierce 的 Nike Air Max P2 签名鞋及其 2005 年首发；鞋款目录另记录 Air Max Pierce 名称。'),
  ('paul-pierce',NULL,'https://commons.wikimedia.org/wiki/File:Celtics_Rolling_Rally_Paul_Pierce.jpg','Wikimedia Commons','Celtics Rolling Rally Paul Pierce','portrait','照片作者 Paul Keleher。'),
  ('paul-pierce',NULL,'https://creativecommons.org/licenses/by/2.0/','Creative Commons','Attribution 2.0 Generic','image_license','Commons 文件页标注 CC BY 2.0。')
) AS seed(slug,shoe_line,source_url,publisher,title,claim_scope,evidence_note)
JOIN "star_athletes" AS athlete ON athlete.slug = seed.slug
LEFT JOIN "athlete_shoe_lines" AS line ON line.athlete_id = athlete.id AND line.line_name = seed.shoe_line
ON CONFLICT ("athlete_id", "source_url", "claim_scope") DO UPDATE SET
  "shoe_line_id" = EXCLUDED."shoe_line_id", "publisher" = EXCLUDED."publisher", "title" = EXCLUDED."title",
  "evidence_note" = EXCLUDED."evidence_note", "verification_status" = 'verified', "checked_at" = now(), "updated_at" = now();
