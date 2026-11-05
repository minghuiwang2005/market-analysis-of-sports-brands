UPDATE "star_sports"
SET "intro" = 'NBA 签名鞋运动员档案。', "updated_at" = now()
WHERE "slug" = 'basketball';--> statement-breakpoint

INSERT INTO "star_athletes" (
  "slug", "sport_id", "name_zh", "name_en", "league", "position", "teams_summary", "nationality", "birth_date", "height_cm", "jersey_number", "bio",
  "portrait_url", "portrait_alt", "portrait_source_url", "portrait_credit", "portrait_license", "portrait_license_url", "career_highlights", "sort_order", "published"
)
SELECT
  seed.slug, sport.id, seed.name_zh, seed.name_en, seed.league, seed.position, seed.teams_summary, seed.nationality, seed.birth_date::date, seed.height_cm, seed.jersey_number, seed.bio,
  seed.portrait_url, seed.portrait_alt, seed.portrait_source_url, seed.portrait_credit, seed.portrait_license, seed.portrait_license_url, seed.career_highlights::jsonb, seed.sort_order, true
FROM (VALUES
  ('david-robinson','大卫·罗宾逊','David Robinson','NBA','中锋','圣安东尼奥马刺','美国','1965-08-06',216,'50','NBA 名宿，职业生涯效力圣安东尼奥马刺。Nike Air Command Force 于 1991 年作为他的个人签名鞋推出。','https://commons.wikimedia.org/wiki/Special:FilePath/David_Robinson_at_1988_Summer_Olympics_vs._Spain.jpg?width=960','大卫·罗宾逊代表美国队参加 1988 年奥运会比赛','https://commons.wikimedia.org/wiki/File:David_Robinson_at_1988_Summer_Olympics_vs._Spain.jpg','Ken Hackman / Wikimedia Commons','Public domain (U.S. federal government)','https://commons.wikimedia.org/wiki/Template:PD-USGov-Military-Navy','[{"value":"2","label":"NBA 总冠军"},{"value":"1995","label":"常规赛 MVP"}]',16),
  ('charles-barkley','查尔斯·巴克利','Charles Barkley','NBA','前锋','费城 76 人 / 菲尼克斯太阳 / 休斯敦火箭','美国','1963-02-20',198,'34','NBA 名人堂前锋，曾效力费城 76 人、菲尼克斯太阳和休斯敦火箭。Nike Air Force Max CB 于 1993 年推出。','https://commons.wikimedia.org/wiki/Special:FilePath/Barkley_Lipofsky.jpg?width=960','查尔斯·巴克利代表费城 76 人比赛照片','https://commons.wikimedia.org/wiki/File:Barkley_Lipofsky.jpg','Steve Lipofsky / Basketballphoto.com','CC BY 3.0','https://creativecommons.org/licenses/by/3.0/','[{"value":"1993","label":"常规赛 MVP"},{"value":"11×","label":"全明星入选"}]',17),
  ('penny-hardaway','安芬尼·哈达威','Anfernee Hardaway','NBA','后卫','奥兰多魔术 / 菲尼克斯太阳 / 纽约尼克斯 / 迈阿密热火','美国','1971-07-18',201,'1','NBA 后卫，曾效力奥兰多魔术、菲尼克斯太阳、纽约尼克斯和迈阿密热火。Nike Air Penny 系列于 1995 年开启。','https://commons.wikimedia.org/wiki/Special:FilePath/Penny_Hardaway_Knicks.jpg?width=960','安芬尼·哈达威身穿纽约尼克斯队球衣','https://commons.wikimedia.org/wiki/File:Penny_Hardaway_Knicks.jpg','Matthew Johnson / SkyscraperSunset','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0/','[{"value":"4×","label":"全明星入选"},{"value":"1996","label":"奥运会金牌"}]',18),
  ('jason-kidd','杰森·基德','Jason Kidd','NBA','后卫','达拉斯小牛 / 菲尼克斯太阳 / 新泽西篮网 / 纽约尼克斯','美国','1973-03-23',193,'5','NBA 名人堂控球后卫，曾效力达拉斯、菲尼克斯、新泽西和纽约。Nike Zoom Flight Five 于 1996 年成为其个人签名鞋款。','https://commons.wikimedia.org/wiki/Special:FilePath/J-Kidd.jpg?width=960','杰森·基德身穿达拉斯小牛队球衣比赛','https://commons.wikimedia.org/wiki/File:J-Kidd.jpg','Keith Allison / Wikimedia Commons','CC BY-SA 2.0','https://creativecommons.org/licenses/by-sa/2.0/','[{"value":"2011","label":"NBA 总冠军"},{"value":"10×","label":"全明星入选"}]',19),
  ('scottie-pippen','斯科蒂·皮蓬','Scottie Pippen','NBA','前锋','芝加哥公牛 / 休斯敦火箭 / 波特兰开拓者','美国','1965-09-25',203,'33','NBA 名人堂前锋，六次随芝加哥公牛夺得总冠军。Nike Air Pippen 1 于 1997 年推出。','https://commons.wikimedia.org/wiki/Special:FilePath/Scottie_Pippen_headshot.jpg?width=960','斯科蒂·皮蓬肖像照','https://commons.wikimedia.org/wiki/File:Scottie_Pippen_headshot.jpg','Noraft / Wikimedia Commons','CC BY 3.0','https://creativecommons.org/licenses/by/3.0/','[{"value":"6","label":"NBA 总冠军"},{"value":"7×","label":"全明星入选"}]',20),
  ('alonzo-mourning','阿朗佐·莫宁','Alonzo Mourning','NBA','中锋','夏洛特黄蜂 / 迈阿密热火 / 新泽西篮网','美国','1970-02-08',208,'33','NBA 名人堂中锋，曾效力夏洛特黄蜂、迈阿密热火和新泽西篮网。Nike Air Alonzo 于 1997 年推出。','https://commons.wikimedia.org/wiki/Special:FilePath/Alonzo_Mourning.jpg?width=960','阿朗佐·莫宁身穿迈阿密热火队球衣','https://commons.wikimedia.org/wiki/File:Alonzo_Mourning.jpg','Keith Allison / Wikimedia Commons','CC BY-SA 2.0','https://creativecommons.org/licenses/by-sa/2.0/','[{"value":"2006","label":"NBA 总冠军"},{"value":"2×","label":"最佳防守球员"}]',21),
  ('kevin-garnett','凯文·加内特','Kevin Garnett','NBA','前锋','明尼苏达森林狼 / 波士顿凯尔特人 / 布鲁克林篮网','美国','1976-05-19',211,'21','NBA 名人堂前锋，2008 年随波士顿凯尔特人夺冠。Nike Air Garnett 于 1998 年推出，之后延展出多代个人签名鞋。','https://commons.wikimedia.org/wiki/Special:FilePath/Kevin_Garnett.JPG?width=960','凯文·加内特身穿波士顿凯尔特人队球衣','https://commons.wikimedia.org/wiki/File:Kevin_Garnett.JPG','Shaka / Wikimedia Commons','CC BY-SA 2.0 Italy','https://creativecommons.org/licenses/by-sa/2.0/it/','[{"value":"2008","label":"NBA 总冠军"},{"value":"2004","label":"常规赛 MVP"}]',22),
  ('gary-payton','加里·佩顿','Gary Payton','NBA','后卫','西雅图超音速 / 密尔沃基雄鹿 / 洛杉矶湖人 / 波士顿凯尔特人 / 迈阿密热火','美国','1968-07-23',193,'20','NBA 名人堂后卫，1996 年获得最佳防守球员。Nike Air Zoom Flight 98 以他的绰号 The Glove 为系列标识。','https://commons.wikimedia.org/wiki/Special:FilePath/Gary_Payton_2005.jpg?width=960','加里·佩顿身穿迈阿密热火队球衣','https://commons.wikimedia.org/wiki/File:Gary_Payton_2005.jpg','Rene "Ralph" Min / Wikimedia Commons','CC BY 2.0','https://creativecommons.org/licenses/by/2.0/','[{"value":"1996","label":"最佳防守球员"},{"value":"9×","label":"全明星入选"}]',23),
  ('tim-duncan','蒂姆·邓肯','Tim Duncan','NBA','前锋 / 中锋','圣安东尼奥马刺','美属维尔京群岛','1976-04-25',211,'21','NBA 名人堂前锋 / 中锋，职业生涯效力圣安东尼奥马刺。Nike Total Air Foamposite Max 于 1998 年列入其个人签名鞋款。','https://commons.wikimedia.org/wiki/Special:FilePath/Tim_Duncan_Walks_Verizon_Center%27s_Floor.jpg?width=960','蒂姆·邓肯在圣安东尼奥马刺对阵华盛顿奇才的比赛中','https://commons.wikimedia.org/wiki/File:Tim_Duncan_Walks_Verizon_Center%27s_Floor.jpg','Geoff Livingston / Wikimedia Commons','CC BY 2.0','https://creativecommons.org/licenses/by/2.0/','[{"value":"5","label":"NBA 总冠军"},{"value":"2×","label":"常规赛 MVP"}]',24),
  ('vince-carter','文斯·卡特','Vince Carter','NBA','后卫 / 前锋','多伦多猛龙 / 新泽西篮网 / 奥兰多魔术 / 菲尼克斯太阳 / 达拉斯小牛 / 孟菲斯灰熊 / 萨克拉门托国王 / 亚特兰大老鹰','美国','1977-01-26',198,'15','NBA 名人堂后卫 / 前锋，NBA 生涯跨越 22 个赛季。Nike Shox BB4 于 2000 年成为其个人签名鞋款。','https://commons.wikimedia.org/wiki/Special:FilePath/Vince_Carter_2008_%28cropped%29.jpg?width=960','文斯·卡特身穿新泽西篮网队球衣，2008 年比赛照片','https://commons.wikimedia.org/wiki/File:Vince_Carter_2008_%28cropped%29.jpg','Nicolas Richoffer / Wikimedia Commons','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0/','[{"value":"8×","label":"全明星入选"},{"value":"1999","label":"年度最佳新秀"}]',25),
  ('dwyane-wade','德维恩·韦德','Dwyane Wade','NBA','后卫','迈阿密热火 / 芝加哥公牛 / 克利夫兰骑士','美国','1982-01-17',193,'3','三届 NBA 总冠军后卫，职业生涯大部分时间效力迈阿密热火。Jordan Brand 于 2011 年推出其首款个人签名鞋 Fly Wade。','https://commons.wikimedia.org/wiki/Special:FilePath/Dwyane_Wade.jpg?width=960','德维恩·韦德比赛资料照片','https://commons.wikimedia.org/wiki/File:Dwyane_Wade.jpg','Keith Allison / Wikimedia Commons','CC BY-SA 2.0','https://creativecommons.org/licenses/by-sa/2.0/','[{"value":"3","label":"NBA 总冠军"},{"value":"2006","label":"总决赛 MVP"}]',26)
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
SELECT athlete.id, seed.brand, seed.line_name, 'historical', seed.started_year, seed.ended_year, seed.representative_models::jsonb, 1
FROM (VALUES
  ('david-robinson','Nike','Air Command Force',1991,NULL,'[{"name":"Air Command Force","releaseYear":1991}]'),
  ('charles-barkley','Nike','Air Force Max CB',1993,NULL,'[{"name":"Air Force Max CB","releaseYear":1993}]'),
  ('penny-hardaway','Nike','Air Penny',1995,NULL,'[{"name":"Air Penny 1","releaseYear":1995}]'),
  ('jason-kidd','Nike','Zoom Flight Five',1996,NULL,'[{"name":"Zoom Flight Five","releaseYear":1996}]'),
  ('scottie-pippen','Nike','Air Pippen',1997,NULL,'[{"name":"Air Pippen 1","releaseYear":1997}]'),
  ('alonzo-mourning','Nike','Air Alonzo',1997,NULL,'[{"name":"Air Alonzo","releaseYear":1997}]'),
  ('kevin-garnett','Nike','Air Garnett',1998,NULL,'[{"name":"Air Garnett","releaseYear":1998}]'),
  ('gary-payton','Nike','The Glove',1998,NULL,'[{"name":"Air Zoom Flight 98","releaseYear":1998}]'),
  ('tim-duncan','Nike','Total Air Foamposite Max',1998,NULL,'[{"name":"Total Air Foamposite Max","releaseYear":1998}]'),
  ('vince-carter','Nike','Shox BB4',2000,NULL,'[{"name":"Shox BB4","releaseYear":2000}]'),
  ('dwyane-wade','Jordan Brand','Fly Wade',2011,2012,'[{"name":"Jordan Fly Wade","releaseYear":2011},{"name":"Jordan Fly Wade II","releaseYear":2012}]')
) AS seed(slug,brand,line_name,started_year,ended_year,representative_models)
JOIN "star_athletes" AS athlete ON athlete.slug = seed.slug
ON CONFLICT ("athlete_id", "line_name") DO UPDATE SET
  "brand" = EXCLUDED."brand", "relationship_status" = EXCLUDED."relationship_status", "started_year" = EXCLUDED."started_year",
  "ended_year" = EXCLUDED."ended_year", "representative_models" = EXCLUDED."representative_models", "updated_at" = now();--> statement-breakpoint

INSERT INTO "athlete_sources" ("athlete_id", "shoe_line_id", "source_url", "publisher", "title", "claim_scope", "evidence_note", "verification_status")
SELECT athlete.id, line.id, seed.source_url, seed.publisher, seed.title, seed.claim_scope, seed.evidence_note, 'verified'
FROM (VALUES
  ('david-robinson',NULL,'https://www.basketball-reference.com/players/r/robinda01.html','Basketball-Reference','David Robinson player profile','biography','球员资料、位置、身高、球队经历与生涯荣誉。'),
  ('charles-barkley',NULL,'https://www.basketball-reference.com/players/b/barklch01.html','Basketball-Reference','Charles Barkley player profile','biography','球员资料、位置、身高、球队经历与生涯荣誉。'),
  ('penny-hardaway',NULL,'https://www.basketball-reference.com/players/h/hardaan01.html','Basketball-Reference','Anfernee Hardaway player profile','biography','球员资料、位置、身高、球队经历与生涯荣誉。'),
  ('jason-kidd',NULL,'https://www.basketball-reference.com/players/k/kiddja01.html','Basketball-Reference','Jason Kidd player profile','biography','球员资料、位置、身高、球队经历与生涯荣誉。'),
  ('scottie-pippen',NULL,'https://www.basketball-reference.com/players/p/pippesc01.html','Basketball-Reference','Scottie Pippen player profile','biography','球员资料、位置、身高、球队经历与生涯荣誉。'),
  ('alonzo-mourning',NULL,'https://www.basketball-reference.com/players/m/mournal01.html','Basketball-Reference','Alonzo Mourning player profile','biography','球员资料、位置、身高、球队经历与生涯荣誉。'),
  ('kevin-garnett',NULL,'https://www.basketball-reference.com/players/g/garneke01.html','Basketball-Reference','Kevin Garnett player profile','biography','球员资料、位置、身高、球队经历与生涯荣誉。'),
  ('gary-payton',NULL,'https://www.basketball-reference.com/players/p/paytoga01.html','Basketball-Reference','Gary Payton player profile','biography','球员资料、位置、身高、球队经历与生涯荣誉。'),
  ('tim-duncan',NULL,'https://www.basketball-reference.com/players/d/duncati01.html','Basketball-Reference','Tim Duncan player profile','biography','球员资料、位置、身高、球队经历与生涯荣誉。'),
  ('vince-carter',NULL,'https://www.basketball-reference.com/players/c/cartevi01.html','Basketball-Reference','Vince Carter player profile','biography','球员资料、位置、身高、球队经历与生涯荣誉。'),
  ('dwyane-wade',NULL,'https://www.basketball-reference.com/players/w/wadedw01.html','Basketball-Reference','Dwyane Wade player profile','biography','球员资料、位置、身高、球队经历与生涯荣誉.'),
  ('david-robinson','Air Command Force','https://sneakernews.com/2017/01/10/complete-guide-to-nike-basketball-signature-athletes/','Sneaker News','A Complete List of All 21 Nike Basketball Signature Athletes','signature_line','Nike 历年正式签名球员名单将 Air Command Force（1991）列为 David Robinson 的签名鞋款。'),
  ('charles-barkley','Air Force Max CB','https://sneakernews.com/2017/01/10/complete-guide-to-nike-basketball-signature-athletes/','Sneaker News','A Complete List of All 21 Nike Basketball Signature Athletes','signature_line','Nike 历年正式签名球员名单记载 Charles Barkley 的 Air Force Max CB（1993）。'),
  ('penny-hardaway','Air Penny','https://sneakernews.com/2017/01/10/complete-guide-to-nike-basketball-signature-athletes/','Sneaker News','A Complete List of All 21 Nike Basketball Signature Athletes','signature_line','Nike 历年正式签名球员名单记载 Penny Hardaway 的 Air Penny 1（1995）。'),
  ('jason-kidd','Zoom Flight Five','https://sneakernews.com/2017/01/10/complete-guide-to-nike-basketball-signature-athletes/','Sneaker News','A Complete List of All 21 Nike Basketball Signature Athletes','signature_line','Nike 历年正式签名球员名单记载 Jason Kidd 的 Zoom Flight Five（1996）。'),
  ('scottie-pippen','Air Pippen','https://sneakernews.com/2017/01/10/complete-guide-to-nike-basketball-signature-athletes/','Sneaker News','A Complete List of All 21 Nike Basketball Signature Athletes','signature_line','Nike 历年正式签名球员名单记载 Scottie Pippen 的 Air Pippen 1（1997）。'),
  ('alonzo-mourning','Air Alonzo','https://sneakernews.com/2017/01/10/complete-guide-to-nike-basketball-signature-athletes/','Sneaker News','A Complete List of All 21 Nike Basketball Signature Athletes','signature_line','Nike 历年正式签名球员名单记载 Alonzo Mourning 的 Air Alonzo（1997）。'),
  ('kevin-garnett','Air Garnett','https://sneakernews.com/2017/01/10/complete-guide-to-nike-basketball-signature-athletes/','Sneaker News','A Complete List of All 21 Nike Basketball Signature Athletes','signature_line','Nike 历年正式签名球员名单记载 Kevin Garnett 的 Air Garnett（1998）。'),
  ('gary-payton','The Glove','https://sneakernews.com/2017/01/10/complete-guide-to-nike-basketball-signature-athletes/','Sneaker News','A Complete List of All 21 Nike Basketball Signature Athletes','signature_line','Nike 历年正式签名球员名单记载 Gary Payton 的 Air Zoom Flight 98 / The Glove（1998）。'),
  ('tim-duncan','Total Air Foamposite Max','https://sneakernews.com/2017/01/10/complete-guide-to-nike-basketball-signature-athletes/','Sneaker News','A Complete List of All 21 Nike Basketball Signature Athletes','signature_line','Nike 历年正式签名球员名单记载 Tim Duncan 的 Total Air Foamposite Max（1998）。'),
  ('vince-carter','Shox BB4','https://sneakernews.com/2017/01/10/complete-guide-to-nike-basketball-signature-athletes/','Sneaker News','A Complete List of All 21 Nike Basketball Signature Athletes','signature_line','Nike 历年正式签名球员名单记载 Vince Carter 的 Shox BB4（2000）。'),
  ('dwyane-wade','Fly Wade','https://www.nba.com/heat/news/jordanbrdwyanewadet20110506html','Miami Heat / NBA.com','Jordan Brand and Dwyane Wade Take Flight with Launch of the Jordan FLY WADE','signature_line','Jordan Brand（NIKE, Inc. 旗下品牌）宣布 Fly Wade 是 Wade 的首款个人签名鞋。'),
  ('dwyane-wade','Fly Wade','https://www.nba.com/news/dwyane-wade-signs-lifetime-shoe-deal-li-ning','NBA.com / The Associated Press','Dwyane Wade signs lifetime shoe deal with Li-Ning','partnership_status','报道记录 Wade 自 2012 年起代表 Li-Ning；与 2011 年 Jordan Fly Wade 系列资料共同支持其历史状态。'),
  ('david-robinson',NULL,'https://commons.wikimedia.org/wiki/File:David_Robinson_at_1988_Summer_Olympics_vs._Spain.jpg','Wikimedia Commons','David Robinson at 1988 Summer Olympics vs. Spain','portrait','文件页记录图中人物与作者 Ken Hackman。'),
  ('charles-barkley',NULL,'https://commons.wikimedia.org/wiki/File:Barkley_Lipofsky.jpg','Wikimedia Commons','Barkley Lipofsky','portrait','文件页记录照片作者 Steve Lipofsky / Basketballphoto.com。'),
  ('penny-hardaway',NULL,'https://commons.wikimedia.org/wiki/File:Penny_Hardaway_Knicks.jpg','Wikimedia Commons','Penny Hardaway Knicks','portrait','文件页记录照片作者 Matthew Johnson。'),
  ('jason-kidd',NULL,'https://commons.wikimedia.org/wiki/File:J-Kidd.jpg','Wikimedia Commons','J-Kidd','portrait','文件页记录照片作者 Keith Allison。'),
  ('scottie-pippen',NULL,'https://commons.wikimedia.org/wiki/File:Scottie_Pippen_headshot.jpg','Wikimedia Commons','Scottie Pippen headshot','portrait','文件页记录照片作者 Noraft。'),
  ('alonzo-mourning',NULL,'https://commons.wikimedia.org/wiki/File:Alonzo_Mourning.jpg','Wikimedia Commons','Alonzo Mourning','portrait','文件页记录照片作者 Keith Allison。'),
  ('kevin-garnett',NULL,'https://commons.wikimedia.org/wiki/File:Kevin_Garnett.JPG','Wikimedia Commons','Kevin Garnett','portrait','文件页记录照片作者 Shaka。'),
  ('gary-payton',NULL,'https://commons.wikimedia.org/wiki/File:Gary_Payton_2005.jpg','Wikimedia Commons','Gary Payton 2005','portrait','文件页记录照片作者 Rene Ralph Min。'),
  ('tim-duncan',NULL,'https://commons.wikimedia.org/wiki/File:Tim_Duncan_Walks_Verizon_Center%27s_Floor.jpg','Wikimedia Commons','Tim Duncan Walks Verizon Center’s Floor','portrait','文件页记录照片作者 Geoff Livingston。'),
  ('vince-carter',NULL,'https://commons.wikimedia.org/wiki/File:Vince_Carter_2008_%28cropped%29.jpg','Wikimedia Commons','Vince Carter 2008 cropped','portrait','文件页记录照片作者 Nicolas Richoffer。'),
  ('dwyane-wade',NULL,'https://commons.wikimedia.org/wiki/File:Dwyane_Wade.jpg','Wikimedia Commons','Dwyane Wade','portrait','文件页记录照片作者 Keith Allison。'),
  ('david-robinson',NULL,'https://commons.wikimedia.org/wiki/Template:PD-USGov-Military-Navy','Wikimedia Commons','Public domain: US federal government','image_license','文件页标注该美国国防部公务照片为美国公共领域作品。'),
  ('charles-barkley',NULL,'https://creativecommons.org/licenses/by/3.0/','Creative Commons','Attribution 3.0 Unported','image_license','对应 Commons 文件页标注的 CC BY 3.0 许可。'),
  ('penny-hardaway',NULL,'https://creativecommons.org/licenses/by-sa/4.0/','Creative Commons','Attribution-ShareAlike 4.0 International','image_license','对应 Commons 文件页标注的 CC BY-SA 4.0 许可。'),
  ('jason-kidd',NULL,'https://creativecommons.org/licenses/by-sa/2.0/','Creative Commons','Attribution-ShareAlike 2.0 Generic','image_license','对应 Commons 文件页标注的 CC BY-SA 2.0 许可。'),
  ('scottie-pippen',NULL,'https://creativecommons.org/licenses/by/3.0/','Creative Commons','Attribution 3.0 Unported','image_license','对应 Commons 文件页标注的 CC BY 3.0 许可。'),
  ('alonzo-mourning',NULL,'https://creativecommons.org/licenses/by-sa/2.0/','Creative Commons','Attribution-ShareAlike 2.0 Generic','image_license','对应 Commons 文件页标注的 CC BY-SA 2.0 许可。'),
  ('kevin-garnett',NULL,'https://creativecommons.org/licenses/by-sa/2.0/it/','Creative Commons','Attribution-ShareAlike 2.0 Italy','image_license','对应 Commons 文件页标注的 CC BY-SA 2.0 Italy 许可。'),
  ('gary-payton',NULL,'https://creativecommons.org/licenses/by/2.0/','Creative Commons','Attribution 2.0 Generic','image_license','对应 Commons 文件页标注的 CC BY 2.0 许可。'),
  ('tim-duncan',NULL,'https://creativecommons.org/licenses/by/2.0/','Creative Commons','Attribution 2.0 Generic','image_license','对应 Commons 文件页标注的 CC BY 2.0 许可。'),
  ('vince-carter',NULL,'https://creativecommons.org/licenses/by-sa/4.0/','Creative Commons','Attribution-ShareAlike 4.0 International','image_license','对应 Commons 文件页标注的 CC BY-SA 4.0 许可。'),
  ('dwyane-wade',NULL,'https://creativecommons.org/licenses/by-sa/2.0/','Creative Commons','Attribution-ShareAlike 2.0 Generic','image_license','对应 Commons 文件页标注的 CC BY-SA 2.0 许可。')
) AS seed(slug,line_name,source_url,publisher,title,claim_scope,evidence_note)
JOIN "star_athletes" AS athlete ON athlete.slug = seed.slug
LEFT JOIN "athlete_shoe_lines" AS line ON line.athlete_id = athlete.id AND line.line_name = seed.line_name
ON CONFLICT ("athlete_id", "source_url", "claim_scope") DO UPDATE SET
  "shoe_line_id" = EXCLUDED."shoe_line_id", "publisher" = EXCLUDED."publisher", "title" = EXCLUDED."title",
  "evidence_note" = EXCLUDED."evidence_note", "verification_status" = 'verified', "checked_at" = now(), "updated_at" = now();
