ALTER TABLE athlete_shoe_lines
  ADD COLUMN IF NOT EXISTS line_name_en varchar(120);
--> statement-breakpoint

ALTER TABLE athlete_shoe_lines
  ADD COLUMN IF NOT EXISTS relationship_type varchar(24) NOT NULL DEFAULT 'signature';
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'athlete_shoe_lines_relationship_type_check') THEN
    ALTER TABLE athlete_shoe_lines
      ADD CONSTRAINT athlete_shoe_lines_relationship_type_check
      CHECK (relationship_type IN ('signature', 'endorsement'));
  END IF;
END $$;
--> statement-breakpoint

UPDATE star_sports
SET content_status = 'active',
    intro = CASE slug
      WHEN 'football' THEN '收录 Nike 足球合作球员与可核验鞋款，区分签名系列、球员版和品牌合作。'
      WHEN 'tennis' THEN '收录 Nike 网球合作球员与可核验鞋款，区分签名系列、球员版和品牌合作。'
      WHEN 'athletics' THEN '收录 Nike 田径合作运动员与可核验跑鞋，区分运动员系列和品牌合作。'
    END,
    intro_en = CASE slug
      WHEN 'football' THEN 'Nike football athletes and sourced footwear, distinguishing signature lines, player editions and brand partnerships.'
      WHEN 'tennis' THEN 'Nike tennis athletes and sourced footwear, distinguishing signature lines, player editions and brand partnerships.'
      WHEN 'athletics' THEN 'Nike track and field athletes and sourced running shoes, distinguishing athlete collections from brand partnerships.'
    END,
    updated_at = now()
WHERE slug IN ('football', 'tennis', 'athletics');
--> statement-breakpoint

DO $$
DECLARE
  seed jsonb;
  item jsonb;
  sport_id uuid;
  athlete_id uuid;
  line_id uuid;
  relation_scope text;
  image_page text;
BEGIN
  seed := $seed$
[
{"slug":"cristiano-ronaldo","sport":"football","zh":"克里斯蒂亚诺·罗纳尔多","en":"Cristiano Ronaldo","posZh":"前锋","posEn":"Forward","natZh":"葡萄牙","natEn":"Portugal","bioZh":"葡萄牙前锋，长期与 Nike 合作并拥有 CR7 Mercurial 球员版鞋款。","bioEn":"Portuguese forward with a long Nike partnership and CR7 Mercurial player-edition footwear.","file":"Cristiano_Ronaldo.jpg","credit":"AtilaTheHun / Wikimedia Commons","license":"CC BY 2.0","licenseUrl":"https://creativecommons.org/licenses/by/2.0/","relUrl":"https://about.nike.com/en/newsroom/releases/nike-debuts-rip-the-script-a-step-inside-the-universe-of-nike-football","relTitle":"Nike Debuts “Rip the Script”: Nike Football","relNote":"Nike 2026 足球专题列出 Cristiano Ronaldo，并介绍 Mercurial 系列；其 FY18 报告记录 CR7 Mercurial 限量球鞋。 / Nike's 2026 football feature lists Cristiano Ronaldo and Mercurial; its FY18 report documents CR7 Mercurial limited-edition boots.","signatureUrl":"https://media.about.nike.com/files/d3df5655-4772-41c7-af0d-9f1c99badb4b/FY18_Nike_Impact-Report_Final.pdf","signatureTitle":"FY18 NIKE, Inc. Impact Report: CR7 Mercurial","signatureNote":"Nike FY18 影响报告记录 CR7 Mercurial Campeones 限量球鞋。 / Nike's FY18 Impact Report documents the limited-edition CR7 Mercurial Campeones boots.","lineZh":"CR7 Mercurial","lineEn":"CR7 Mercurial","type":"signature","status":"current","models":[{"name":"Nike Mercurial"}]},
{"slug":"kylian-mbappe","sport":"football","zh":"基利安·姆巴佩","en":"Kylian Mbappé","posZh":"前锋","posEn":"Forward","natZh":"法国","natEn":"France","bioZh":"法国前锋，曾长期与 Nike 合作并推出 Mercurial 球员版；2026 年转投 On 后，Nike 关系标记为历史。","bioEn":"French forward with a long Nike partnership and Mercurial player editions; his Nike relationship is historical after joining On in 2026.","file":"Kylian_Mbappé2.jpg","credit":"BalkanPhotos / Wikimedia Commons","license":"CC BY-SA 2.0","licenseUrl":"https://creativecommons.org/licenses/by-sa/2.0/","relUrl":"https://about.nike.com/en/newsroom/releases/nike-mercurial-kylian-mbappe-player-edition","relTitle":"Nike Mercurial Kylian Mbappé Player Edition","relNote":"Nike 官方发布姆巴佩 Mercurial 球员版；On 于 2026 年 9 月宣布与其合作，Nike 关系据此标为历史。 / Nike documented a Mbappé Mercurial player edition; On announced a partnership in September 2026, so the Nike relationship is historical.","endUrl":"https://press.on-running.com/on-enters-football-alongside-kylian-mbappe","endTitle":"On Enters Football alongside Kylian Mbappé","lineZh":"Mercurial 姆巴佩球员版","lineEn":"Mercurial Mbappé Player Editions","type":"endorsement","status":"historical","end":2026,"models":[{"name":"Nike Mercurial"}]},
{"slug":"erling-haaland","sport":"football","zh":"埃尔林·哈兰德","en":"Erling Haaland","posZh":"前锋","posEn":"Forward","natZh":"挪威","natEn":"Norway","bioZh":"挪威前锋，Nike 为其推出首款 Phantom 6 Low 球员版足球鞋。","bioEn":"Norwegian forward for whom Nike released a Phantom 6 Low player-edition boot.","file":"Erling-Haaland-2023.jpg","credit":"Patryk Antkiewicz / Wikimedia Commons","license":"CC BY-SA 2.0","licenseUrl":"https://creativecommons.org/licenses/by-sa/2.0/","relUrl":"https://about.nike.com/en/newsroom/releases/nike-phantom-6-erling-haaland-player-edition","relTitle":"Erling Haaland’s First Nike Phantom 6 Player Edition","relNote":"Nike 官方介绍哈兰德首款 Phantom 6 Low 球员版。 / Nike documents Haaland's first Phantom 6 Low player edition.","lineZh":"Nike Phantom 6 球员版","lineEn":"Nike Phantom 6 Player Edition","type":"endorsement","status":"current","models":[{"name":"Nike Phantom 6"}]},
{"slug":"vinicius-junior","sport":"football","zh":"维尼修斯·儒尼奥尔","en":"Vinícius Júnior","posZh":"前锋","posEn":"Forward","natZh":"巴西","natEn":"Brazil","bioZh":"巴西前锋，Nike 于 2025 年为其发布首款 Mercurial 球员版球鞋。","bioEn":"Brazilian forward whose first Mercurial player-edition boot was released by Nike in 2025.","file":"Vinicius_Jr_2021.jpg","credit":"Real Madrid C.F. / Wikimedia Commons","license":"CC BY 3.0","licenseUrl":"https://creativecommons.org/licenses/by/3.0/","relUrl":"https://about.nike.com/en/newsroom/releases/vini-jrs-first-nike-player-edition-boot-is-built-to-be-bold","relTitle":"Vini Jr.'s First Nike Player Edition Boot","relNote":"Nike 官方介绍维尼修斯首款 Mercurial 球员版。 / Nike documents Vini Jr.'s first Mercurial player-edition boot.","lineZh":"Nike Mercurial 维尼修斯球员版","lineEn":"Nike Mercurial Vini Jr. Player Edition","type":"endorsement","status":"current","models":[{"name":"Nike Mercurial Vapor 17"}]},
{"slug":"alexia-putellas","sport":"football","zh":"阿莱克西娅·普特利亚斯","en":"Alexia Putellas","posZh":"中场","posEn":"Midfielder","natZh":"西班牙","natEn":"Spain","bioZh":"西班牙中场，Nike 为其发布 Phantom 6 球员版球鞋。","bioEn":"Spanish midfielder with a Nike Phantom 6 player-edition boot.","file":"Alexia_Putellas.jpg","credit":"Xavier Rondón Medina / Wikimedia Commons","license":"CC BY 2.0","licenseUrl":"https://creativecommons.org/licenses/by/2.0/","relUrl":"https://about.nike.com/en/newsroom/releases/alexia-putellas-first-nike-player-edition-phantom-6-official-images","relTitle":"Alexia Putellas’ First Nike Phantom 6 Player Edition","relNote":"Nike 官方发布普特利亚斯 Phantom 6 球员版。 / Nike documents Putellas' Phantom 6 player edition.","lineZh":"Nike Phantom 6 球员版","lineEn":"Nike Phantom 6 Player Edition","type":"endorsement","status":"current","models":[{"name":"Nike Phantom 6"}]},
{"slug":"sam-kerr","sport":"football","zh":"萨曼莎·克尔","en":"Sam Kerr","posZh":"前锋","posEn":"Forward","natZh":"澳大利亚","natEn":"Australia","bioZh":"澳大利亚前锋，Nike 为其推出 Mercurial Superfly 球员版球鞋。","bioEn":"Australian forward with a Nike Mercurial Superfly player-edition boot.","file":"Sam_Kerr_vs_Kika_Toulouse_2013.jpg","credit":"KazLovesPinoe / Wikimedia Commons","license":"CC BY 2.0","licenseUrl":"https://creativecommons.org/licenses/by/2.0/","relUrl":"https://about.nike.com/en/newsroom/releases/sam-kerr-nike-player-edition-official-images","relTitle":"Sam Kerr Nike Player Edition","relNote":"Nike 官方发布 Sam Kerr 的 Mercurial Superfly 球员版。 / Nike documents Sam Kerr's Mercurial Superfly player edition.","lineZh":"Nike Mercurial Superfly 克尔球员版","lineEn":"Nike Mercurial Superfly Kerr Player Edition","type":"endorsement","status":"current","models":[{"name":"Nike Mercurial Superfly 11"}]},
{"slug":"jamal-musiala","sport":"football","zh":"贾马尔·穆西亚拉","en":"Jamal Musiala","posZh":"中场","posEn":"Midfielder","natZh":"德国","natEn":"Germany","bioZh":"德国中场，Nike 以 Tiempo Maestro 系列呈现其合作球鞋。","bioEn":"German midfielder featured in Nike's Tiempo Maestro footwear collaboration.","file":"Jamal_Musiala_WC2022.jpg","credit":"Tasnim News Agency / Hossein Zohrevand / Wikimedia Commons","license":"CC BY 4.0","licenseUrl":"https://creativecommons.org/licenses/by/4.0/","relUrl":"https://about.nike.com/en/newsroom/releases/nike-football-tiempo-maestro-official-images","relTitle":"Nike Football Tiempo Maestro","relNote":"Nike 官方介绍 Tiempo Maestro 球鞋及 Musiala 合作。 / Nike documents the Tiempo Maestro boot and Musiala collaboration.","lineZh":"Nike Tiempo Maestro 穆西亚拉合作款","lineEn":"Nike Tiempo Maestro Musiala Collaboration","type":"endorsement","status":"current","models":[{"name":"Nike Tiempo Maestro"}]},
{"slug":"lauren-james","sport":"football","zh":"劳伦·詹姆斯","en":"Lauren James","posZh":"前锋","posEn":"Forward","natZh":"英格兰","natEn":"England","bioZh":"英格兰前锋，入选 Nike United 女足球员阵容并参与 Mercurial 合作。","bioEn":"England forward featured in Nike United and its Mercurial collaboration.","file":"James_Chelsea_2023.png","credit":"LHC88 / Wikimedia Commons","license":"CC BY 4.0","licenseUrl":"https://creativecommons.org/licenses/by/4.0/","relUrl":"https://about.nike.com/en/newsroom/releases/nike-united-collective/","relTitle":"Nike United Collective","relNote":"Nike 将 Lauren James 列入 Mercurial 女足合作阵容。 / Nike includes Lauren James in its Mercurial-focused women's football collaboration.","lineZh":"Nike Mercurial 合作","lineEn":"Nike Mercurial Partnership","type":"endorsement","status":"current","models":[{"name":"Nike Mercurial Superfly 11"}]},
{"slug":"salma-paralluelo","sport":"football","zh":"萨尔玛·帕拉略洛","en":"Salma Paralluelo","posZh":"前锋","posEn":"Forward","natZh":"西班牙","natEn":"Spain","bioZh":"西班牙前锋，入选 Nike United 女足球员阵容并参与 Mercurial 合作。","bioEn":"Spain forward featured in Nike United and its Mercurial collaboration.","file":"Salma_Paralluelo_2019.jpg","credit":"Acción contra el Hambre España / Wikimedia Commons","license":"CC BY 3.0","licenseUrl":"https://creativecommons.org/licenses/by/3.0/","relUrl":"https://about.nike.com/en/newsroom/releases/nike-united-collective/","relTitle":"Nike United Collective","relNote":"Nike 将 Salma Paralluelo 列入 Mercurial 女足合作阵容。 / Nike includes Salma Paralluelo in its Mercurial-focused women's football collaboration.","lineZh":"Nike Mercurial 合作","lineEn":"Nike Mercurial Partnership","type":"endorsement","status":"current","models":[{"name":"Nike Mercurial Superfly 11"}]},
{"slug":"naomi-girma","sport":"football","zh":"娜奥米·吉尔马","en":"Naomi Girma","posZh":"后卫","posEn":"Defender","natZh":"美国","natEn":"United States","bioZh":"美国后卫，Nike United 将她与 Tiempo 系列球鞋关联。","bioEn":"United States defender featured by Nike United with the Tiempo boot franchise.","file":"Naomi_Girma_(cropped_2).jpg","credit":"Lance Cpl. Alex Devereux / U.S. Navy / Wikimedia Commons","license":"Public domain (U.S. Government)","licenseUrl":"https://commons.wikimedia.org/wiki/Template:PD-USGov-Military-Navy","relUrl":"https://about.nike.com/en/newsroom/releases/nike-united-collective/","relTitle":"Nike United Collective","relNote":"Nike United 将 Naomi Girma 与 Tiempo 球鞋系列关联。 / Nike United associates Naomi Girma with the Tiempo boot franchise.","lineZh":"Nike Tiempo 合作","lineEn":"Nike Tiempo Partnership","type":"endorsement","status":"current","models":[{"name":"Nike Tiempo"}]},

{"slug":"roger-federer","sport":"tennis","zh":"罗杰·费德勒","en":"Roger Federer","posZh":"单打","posEn":"Singles","natZh":"瑞士","natEn":"Switzerland","bioZh":"瑞士网球名将，曾与 Nike 长期合作并穿着 NikeCourt Vapor 系列比赛。","bioEn":"Swiss tennis great who had a long Nike partnership and competed in NikeCourt Vapor footwear.","file":"Federer_Roger.jpg","credit":"momovieman / Wikimedia Commons","license":"CC BY 2.0","licenseUrl":"https://creativecommons.org/licenses/by/2.0/","relUrl":"https://investors.nike.com/investors/news-events-and-reports/investor-news/investor-news-details/2009/Nike-Introduces-US-Open-Competition-Looks-for-Serena-Williams-Roger-Federer-Rafael-Nadal-and-Maria-Sharapova/default.aspx","relTitle":"Nike US Open Competition Looks","relNote":"Nike 2009 年美网发布将 Federer 列入 Nike 球员阵容；此处记录其历史鞋款合作。 / Nike's 2009 US Open release lists Federer among its athletes; this records his historical footwear partnership.","lineZh":"NikeCourt Vapor 合作","lineEn":"NikeCourt Vapor Partnership","type":"endorsement","status":"historical","models":[{"name":"Nike Zoom Vapor 9 Tour"}]},
{"slug":"rafael-nadal","sport":"tennis","zh":"拉斐尔·纳达尔","en":"Rafael Nadal","posZh":"单打","posEn":"Singles","natZh":"西班牙","natEn":"Spain","bioZh":"西班牙网球名将，Nike 官方记录其长期合作与签名系列；职业生涯于 2024 年结束。","bioEn":"Spanish tennis great with a Nike-documented partnership and signature collection; he retired from professional tennis in 2024.","file":"Rafael_Nadal.jpg","credit":"Yann Caradec / Wikimedia Commons","license":"CC BY-SA 2.0","licenseUrl":"https://creativecommons.org/licenses/by-sa/2.0/","relUrl":"https://about.nike.com/en/newsroom/releases/nike-celebrates-rafael-nadal","relTitle":"Nike Celebrates Rafael Nadal","relNote":"Nike 记载 Nadal 自 13 岁起为 Nike 运动员并介绍其 Raging Bull 签名系列。 / Nike documents Nadal as a Nike athlete since age 13 and describes his Raging Bull signature collection.","lineZh":"Rafa 签名系列","lineEn":"Rafa Signature Collection","type":"signature","status":"historical","models":[{"name":"NikeCourt Air Zoom Vapor Cage 4"}]},
{"slug":"serena-williams","sport":"tennis","zh":"塞雷娜·威廉姆斯","en":"Serena Williams","posZh":"单打","posEn":"Singles","natZh":"美国","natEn":"United States","bioZh":"美国网球运动员与 Nike 设计合作者；Nike 记录了其 NikeCourt Flare 2 球员版及 2026 年重返球场。","bioEn":"American tennis athlete and Nike design collaborator; Nike documented her Flare 2 player edition and her 2026 return to the court.","file":"SerenaWilliamsJuly08.jpg","credit":"Gina Hughes / Wikimedia Commons","license":"CC BY-SA 3.0","licenseUrl":"https://creativecommons.org/licenses/by-sa/3.0/","relUrl":"https://about.nike.com/en/magazine/why-serena-williams-is-returning-to-the-court","relTitle":"Why Serena Williams Is Returning to the Court","relNote":"Nike 2026 年特写介绍 Serena 重返球场训练及其长期品牌合作。 / Nike's 2026 feature covers Serena's return-to-court training and long-standing brand relationship.","lineZh":"NikeCourt 合作","lineEn":"NikeCourt Partnership","type":"endorsement","status":"current","models":[{"name":"NikeCourt Flare 2"}]},
{"slug":"andre-agassi","sport":"tennis","zh":"安德烈·阿加西","en":"Andre Agassi","posZh":"单打","posEn":"Singles","natZh":"美国","natEn":"United States","bioZh":"美国网球名将，Air Tech Challenge 系列是其具有代表性的 Nike 签名鞋。","bioEn":"American tennis great whose Nike Air Tech Challenge line became a defining signature tennis shoe series.","file":"Andre_Agassi_1999.jpg","credit":"Kingkongphoto & www.celebrity-photos.com / Wikimedia Commons","license":"CC BY-SA 2.0","licenseUrl":"https://creativecommons.org/licenses/by-sa/2.0/","relUrl":"https://about.nike.com/en-GB/magazine/how-nike-created-air-max-dn","relTitle":"How Nike Created Air Max DN","relNote":"Nike 文章回顾 Air Tech Challenge IV 与 Agassi 的鞋款合作。 / Nike's feature recalls the Air Tech Challenge IV and its relationship to Agassi.","lineZh":"Air Tech Challenge","lineEn":"Air Tech Challenge","type":"signature","status":"historical","models":[{"name":"Nike Air Tech Challenge IV"}]},
{"slug":"john-mcenroe","sport":"tennis","zh":"约翰·麦肯罗","en":"John McEnroe","posZh":"单打","posEn":"Singles","natZh":"美国","natEn":"United States","bioZh":"美国网球名将，Mac Attack 是 Nike 为其赛场表现打造的鞋款系列。","bioEn":"American tennis great associated with Nike's Mac Attack shoe line, originally designed for court performance.","file":"John_McEnroe.jpg","credit":"Edwin Martinez / Wikimedia Commons","license":"CC BY 2.0","licenseUrl":"https://creativecommons.org/licenses/by/2.0/","relUrl":"https://www.tennis.com/news/articles/john-mcenroe-1984-nike-mac-attack-retro-sneaker-travis-scott-collaboration","relTitle":"John McEnroe and the Nike Mac Attack","relNote":"Mac Attack 被记载为 McEnroe 的 Nike 球鞋系列。 / Mac Attack is documented as a Nike shoe line associated with McEnroe.","lineZh":"Nike Mac Attack","lineEn":"Nike Mac Attack","type":"signature","status":"historical","models":[{"name":"Nike Mac Attack"}]},
{"slug":"maria-sharapova","sport":"tennis","zh":"玛丽亚·莎拉波娃","en":"Maria Sharapova","posZh":"单打","posEn":"Singles","natZh":"俄罗斯","natEn":"Russia","bioZh":"俄罗斯网球名将，曾长期与 Nike 合作，Nike 发布过其大满贯赛场造型。","bioEn":"Russian tennis great with a long Nike partnership; Nike published her Grand Slam competition looks.","file":"Maria_Sharapova_at_the_2009_Wimbledon_Championships_01.jpg","credit":"Justin Smith / Wikimedia Commons","license":"CC BY-SA 2.0","licenseUrl":"https://creativecommons.org/licenses/by-sa/2.0/","relUrl":"https://investors.nike.com/investors/news-events-and-reports/investor-news/investor-news-details/2009/Nike-Introduces-US-Open-Competition-Looks-for-Serena-Williams-Roger-Federer-Rafael-Nadal-and-Maria-Sharapova/default.aspx","relTitle":"Nike US Open Competition Looks","relNote":"Nike 2009 年美网发布将 Sharapova 列为合作运动员。 / Nike's 2009 US Open release lists Sharapova as a Nike athlete.","lineZh":"Nike 网球合作","lineEn":"Nike Tennis Partnership","type":"endorsement","status":"historical","models":[]},
{"slug":"naomi-osaka","sport":"tennis","zh":"大坂直美","en":"Naomi Osaka","posZh":"单打","posEn":"Singles","natZh":"日本","natEn":"Japan","bioZh":"日本网球运动员，Nike Athlete 名录收录其资料并记录其品牌合作。","bioEn":"Japanese tennis athlete listed on Nike's athlete roster and featured in Nike collaborations.","file":"Naomi_Osaka_(27849814337).jpg","credit":"Peter Menzel / Wikimedia Commons","license":"CC BY-SA 2.0","licenseUrl":"https://creativecommons.org/licenses/by-sa/2.0/","relUrl":"https://about.nike.com/en/newsroom/releases/naomi-osaka-and-yoon-ahn","relTitle":"Naomi Osaka and Yoon Ahn","relNote":"Nike 官方记录 Osaka 与品牌设计合作，并在 athlete 名录中列出其资料。 / Nike documents Osaka's design collaboration and lists her on its athlete roster.","lineZh":"Nike 网球合作","lineEn":"Nike Tennis Partnership","type":"endorsement","status":"current","models":[]},
{"slug":"carlos-alcaraz","sport":"tennis","zh":"卡洛斯·阿尔卡拉斯","en":"Carlos Alcaraz","posZh":"单打","posEn":"Singles","natZh":"西班牙","natEn":"Spain","bioZh":"西班牙网球运动员，Nike Athlete 名录与 Nike 品牌活动均收录其合作。","bioEn":"Spanish tennis athlete featured on Nike's athlete roster and in Nike campaigns.","file":"Carlos_Alcaraz_Argentina_Open_2024.jpg","credit":"OMAR.ERRE / Wikimedia Commons","license":"CC BY 4.0","licenseUrl":"https://creativecommons.org/licenses/by/4.0/","relUrl":"https://about.nike.com/en/newsroom/releases/nike-why-do-it-campaign","relTitle":"Nike Why Do It Campaign","relNote":"Nike 官方 Athlete 名录与品牌 campaign 均将 Alcaraz 列为 Nike athlete。 / Nike's athlete roster and campaign include Alcaraz as a Nike athlete.","lineZh":"NikeCourt 合作","lineEn":"NikeCourt Partnership","type":"endorsement","status":"current","models":[]},
{"slug":"jannik-sinner","sport":"tennis","zh":"扬尼克·辛纳","en":"Jannik Sinner","posZh":"单打","posEn":"Singles","natZh":"意大利","natEn":"Italy","bioZh":"意大利网球运动员，Nike Athlete 名录收录其资料；Nike 为其设计过定制 ACG 鞋履造型。","bioEn":"Italian tennis athlete listed by Nike; Nike created a custom ACG footwear look for him.","file":"Jannik_Sinner.jpg","credit":"Beireke1 / Wikimedia Commons","license":"CC0 1.0","licenseUrl":"https://creativecommons.org/publicdomain/zero/1.0/","relUrl":"https://about.nike.com/en/magazine/jannik-sinner-nike-atelier-custom-look","relTitle":"Jannik Sinner's Custom Nike Atelier Look","relNote":"Nike 官方文章记录 Sinner 与 Nike 的定制鞋服合作。 / Nike documents Sinner's custom Nike footwear and apparel collaboration.","lineZh":"Nike 运动员合作","lineEn":"Nike Athlete Partnership","type":"endorsement","status":"current","models":[]},
{"slug":"qinwen-zheng","sport":"tennis","zh":"郑钦文","en":"Qinwen Zheng","posZh":"单打","posEn":"Singles","natZh":"中国","natEn":"China","bioZh":"中国网球运动员，Nike 官方 Athlete 名录收录其资料。","bioEn":"Chinese tennis athlete listed on Nike's official athlete roster.","file":"Zheng_Qinwen.png","credit":"中国新闻社 / Wikimedia Commons","license":"CC BY 4.0","licenseUrl":"https://creativecommons.org/licenses/by/4.0/","relUrl":"https://about.nike.com/en/newsroom/releases/nike-athletes","relTitle":"Nike Athletes","relNote":"Nike 官方 Athlete 名录列出 Qinwen Zheng；本批商品未推定未核实的球鞋型号。 / Nike's official athlete roster lists Qinwen Zheng; no unverified shoe model is inferred.","lineZh":"Nike 网球合作","lineEn":"Nike Tennis Partnership","type":"endorsement","status":"current","models":[]},

{"slug":"faith-kipyegon","sport":"athletics","zh":"菲斯·基皮耶贡","en":"Faith Kipyegon","posZh":"中长跑","posEn":"Middle-distance","natZh":"肯尼亚","natEn":"Kenya","bioZh":"肯尼亚中长跑运动员，Nike 于 2025 年发布以她命名的跑鞋服系列。","bioEn":"Kenyan middle-distance runner for whom Nike released a named footwear and apparel collection in 2025.","file":"Faith_Kipyegon_Oregon_2022.jpg","credit":"Erik van Leeuwen / Wikimedia Commons","license":"GFDL 1.2+","licenseUrl":"https://www.gnu.org/licenses/fdl-1.3.html","relUrl":"https://about.nike.com/en/newsroom/releases/faith-kipyegon-nike-running-collection-official-images","relTitle":"Faith Kipyegon Nike Running Collection","relNote":"Nike 官方介绍合作系列，明确列出 Alphafly 3 与 Victory 2 等鞋款。 / Nike documents the athlete collection including Alphafly 3 and Victory 2.","lineZh":"Faith Kipyegon 系列","lineEn":"Faith Kipyegon Collection","type":"endorsement","status":"current","models":[{"name":"Nike Alphafly 3"},{"name":"Nike Victory 2"}]},
{"slug":"eliud-kipchoge","sport":"athletics","zh":"埃鲁德·基普乔格","en":"Eliud Kipchoge","posZh":"长跑 / 马拉松","posEn":"Long-distance / marathon","natZh":"肯尼亚","natEn":"Kenya","bioZh":"肯尼亚马拉松运动员，Nike 曾为其推出 EK Umoja 系列及 Alphafly 2。","bioEn":"Kenyan marathon runner for whom Nike released the EK Umoja collection and Alphafly 2.","file":"2018_London_Marathon_Eliud_Kipchoge.jpg","credit":"Wikimedia Commons contributor","license":"CC0 1.0","licenseUrl":"https://creativecommons.org/publicdomain/zero/1.0/","relUrl":"https://about.nike.com/en/newsroom/releases/ek-umoja-collection","relTitle":"EK Umoja Collection","relNote":"Nike 官方发布 EK Umoja 与 Alphafly 2 合作系列。 / Nike documents the EK Umoja and Alphafly 2 collection.","lineZh":"EK Umoja 系列","lineEn":"EK Umoja Collection","type":"endorsement","status":"historical","models":[{"name":"Nike Alphafly 2"}]},
{"slug":"keely-hodgkinson","sport":"athletics","zh":"基莉·霍奇金森","en":"Keely Hodgkinson","posZh":"中跑","posEn":"Middle-distance","natZh":"英国","natEn":"Great Britain","bioZh":"英国中跑运动员，Nike 于 2026 年发布其首个签名运动员系列。","bioEn":"British middle-distance runner whose first Nike signature athlete collection launched in 2026.","file":"Keely_Hodgkinson_at_2023_European_Indoor_Championships2.jpg","credit":"Erik van Leeuwen / Wikimedia Commons","license":"CC BY-SA 4.0","licenseUrl":"https://creativecommons.org/licenses/by-sa/4.0/","relUrl":"https://about.nike.com/en-GB/newsroom/releases/keely-hodgkinsons-speed-and-style-converge-in-her-first-signature-nike-running-collection","relTitle":"Keely Hodgkinson's First Signature Nike Running Collection","relNote":"Nike 列出 Vomero Plus、Pegasus 42、Vaporfly 4、Victory 2 并称其为 Keely 首个签名系列。 / Nike names her first signature collection and lists four footwear models.","lineZh":"Keely Hodgkinson 签名系列","lineEn":"Keely Hodgkinson Signature Collection","type":"signature","status":"current","models":[{"name":"Nike Vomero Plus"},{"name":"Nike Pegasus 42"},{"name":"Nike Vaporfly 4"},{"name":"Nike Victory 2"}]},
{"slug":"shacarri-richardson","sport":"athletics","zh":"沙卡里·理查德森","en":"Sha’Carri Richardson","posZh":"短跑","posEn":"Sprint","natZh":"美国","natEn":"United States","bioZh":"美国短跑运动员及 Nike athlete，Nike Atelier 为其设计过定制跑鞋造型。","bioEn":"American sprinter and Nike athlete featured in a custom Nike Atelier running shoe look.","file":"00_Sha%27Carri_Richardson_(51918864178).jpg","credit":"jenaragon94 / Wikimedia Commons","license":"CC BY 2.0","licenseUrl":"https://creativecommons.org/licenses/by/2.0/","relUrl":"https://about.nike.com/en/magazine/creating-sha-carri-richardson-nike-atelier-athlos-london","relTitle":"Creating Sha’Carri Richardson's Nike Atelier Look","relNote":"Nike 官方为 Sha’Carri 定制造型的文章点名 Vomero Premium。 / Nike's custom-look feature names the Vomero Premium for Sha’Carri.","lineZh":"Nike Running 合作","lineEn":"Nike Running Partnership","type":"endorsement","status":"current","models":[{"name":"Nike Vomero Premium"}]},
{"slug":"sifan-hassan","sport":"athletics","zh":"西凡·哈桑","en":"Sifan Hassan","posZh":"中长跑 / 马拉松","posEn":"Middle-distance / marathon","natZh":"荷兰","natEn":"Netherlands","bioZh":"荷兰中长跑与马拉松运动员，Nike 官方专题记录她使用 Alphafly 3 竞赛鞋。","bioEn":"Dutch middle- and long-distance runner featured by Nike in Alphafly 3 competition footwear.","file":"Sifan_Hassan_2023_Chicago_Marathon_(cropped).jpg","credit":"Chad Veal / Wikimedia Commons","license":"CC BY-SA 4.0","licenseUrl":"https://creativecommons.org/licenses/by-sa/4.0/","relUrl":"https://about.nike.com/en/magazine/women-who-win-on-nike-air","relTitle":"Women Who Win on Nike Air","relNote":"Nike 官方专题记录 Sifan Hassan 与 Alphafly 3 跑鞋。 / Nike's feature documents Sifan Hassan with Alphafly 3 footwear.","lineZh":"Nike Running 合作","lineEn":"Nike Running Partnership","type":"endorsement","status":"current","models":[{"name":"Nike Alphafly 3"}]},
{"slug":"dina-asher-smith","sport":"athletics","zh":"迪娜·阿舍-史密斯","en":"Dina Asher-Smith","posZh":"短跑","posEn":"Sprint","natZh":"英国","natEn":"Great Britain","bioZh":"英国短跑运动员，Nike 官方运动员名录收录其田径档案。","bioEn":"British sprinter listed on Nike's official athlete roster.","file":"Dina_Asher-Smith.jpg","credit":"Andrewnward / Wikimedia Commons","license":"CC BY-SA 4.0","licenseUrl":"https://creativecommons.org/licenses/by-sa/4.0/","relUrl":"https://about.nike.com/en/newsroom/releases/nike-athletes","relTitle":"Nike Athletes","relNote":"Nike 官方运动员名录列出 Dina Asher-Smith。 / Nike's official athlete roster lists Dina Asher-Smith.","lineZh":"Nike Running 合作","lineEn":"Nike Running Partnership","type":"endorsement","status":"current","models":[]},
{"slug":"shelly-ann-fraser-pryce","sport":"athletics","zh":"谢莉-安·弗雷泽-普莱斯","en":"Shelly-Ann Fraser-Pryce","posZh":"短跑","posEn":"Sprint","natZh":"牙买加","natEn":"Jamaica","bioZh":"牙买加短跑名将，Nike 曾长期支持其职业生涯并发布致敬内容。","bioEn":"Jamaican sprinting great whose career Nike supported and later celebrated.","file":"Shelly_Fraser_Oregon_22.jpg","credit":"Erik van Leeuwen / Wikimedia Commons","license":"GFDL 1.2+","licenseUrl":"https://www.gnu.org/licenses/fdl-1.3.html","relUrl":"https://about.nike.com/en/newsroom/releases/nike-celebrates-shelly-ann-fraser-pryce","relTitle":"Nike Celebrates Shelly-Ann Fraser-Pryce","relNote":"Nike 官方致敬文章记录其合作关系；鞋款型号未作推定。 / Nike's tribute documents the partnership; no shoe model is inferred.","lineZh":"Nike Running 合作","lineEn":"Nike Running Partnership","type":"endorsement","status":"historical","models":[]},
{"slug":"nafissatou-thiam","sport":"athletics","zh":"纳菲萨图·蒂亚姆","en":"Nafissatou Thiam","posZh":"七项全能","posEn":"Heptathlon","natZh":"比利时","natEn":"Belgium","bioZh":"比利时七项全能运动员，Nike 官方名录收录其档案并报道其奥运夺冠。","bioEn":"Belgian heptathlete listed by Nike and covered after her Olympic victory.","file":"Nafissatou_Thiam_Oregon_2022.jpg","credit":"Erik van Leeuwen / Wikimedia Commons","license":"GFDL 1.2+","licenseUrl":"https://www.gnu.org/licenses/fdl-1.3.html","relUrl":"https://about.nike.com/en/newsroom/releases/nafissatou-thiam-wins-gold","relTitle":"Nafissatou Thiam Wins Gold","relNote":"Nike 报道 Thiam 获得奥运金牌；未推定具体鞋款。 / Nike covered Thiam's Olympic victory; no specific shoe model is inferred.","lineZh":"Nike 田径合作","lineEn":"Nike Track and Field Partnership","type":"endorsement","status":"current","models":[]},
{"slug":"jakob-ingebrigtsen","sport":"athletics","zh":"雅各布·英厄布里格森","en":"Jakob Ingebrigtsen","posZh":"中长跑","posEn":"Middle-distance","natZh":"挪威","natEn":"Norway","bioZh":"挪威中长跑运动员，Nike 官方运动员名录收录其田径档案。","bioEn":"Norwegian middle-distance runner listed on Nike's official athlete roster.","file":"Jakob_Ingebrigtsen.jpg","credit":"Radek Kucharski / Wikimedia Commons","license":"CC BY 2.0","licenseUrl":"https://creativecommons.org/licenses/by/2.0/","relUrl":"https://about.nike.com/en/newsroom/releases/nike-athletes","relTitle":"Nike Athletes","relNote":"Nike 官方运动员名录列出 Jakob Ingebrigtsen。 / Nike's official athlete roster lists Jakob Ingebrigtsen.","lineZh":"Nike Running 合作","lineEn":"Nike Running Partnership","type":"endorsement","status":"current","models":[]},
{"slug":"beatriz-hatz","sport":"athletics","zh":"贝娅特丽丝·哈茨","en":"Beatriz Hatz","posZh":"中长跑","posEn":"Middle-distance","natZh":"美国","natEn":"United States","bioZh":"美国中长跑运动员及 Nike athlete，Nike 官方专题将她与 Pegasus EasyOn 跑鞋联系起来。","bioEn":"American middle-distance runner and Nike athlete featured with Pegasus EasyOn running footwear.","file":"Beatriz_Hatz_2024_(cropped).jpg","credit":"Daieuxetdailleurs / Wikimedia Commons","license":"CC BY 4.0","licenseUrl":"https://creativecommons.org/licenses/by/4.0/","relUrl":"https://about.nike.com/en/magazine/women-who-win-on-nike-air","relTitle":"Women Who Win on Nike Air","relNote":"Nike 官方专题将 Beatriz Hatz 与 Pegasus EasyOn 联系起来。 / Nike's feature connects Beatriz Hatz with Pegasus EasyOn.","lineZh":"Nike Running 合作","lineEn":"Nike Running Partnership","type":"endorsement","status":"current","models":[{"name":"Nike Pegasus EasyOn"}]}
]$seed$::jsonb;

  FOR item IN SELECT value FROM jsonb_array_elements(seed)
  LOOP
    SELECT id INTO sport_id FROM star_sports WHERE slug = item->>'sport';

    INSERT INTO star_athletes (
      slug, sport_id, name_zh, name_en, league, league_en, position, position_en,
      nationality, nationality_en, bio, bio_en, portrait_url, portrait_alt,
      portrait_alt_en, portrait_source_url, portrait_credit, portrait_license,
      portrait_license_url, published, sort_order
    ) VALUES (
      item->>'slug', sport_id, item->>'zh', item->>'en',
      CASE item->>'sport' WHEN 'football' THEN '职业足球' WHEN 'tennis' THEN '职业网球' ELSE '田径' END,
      CASE item->>'sport' WHEN 'football' THEN 'Professional football' WHEN 'tennis' THEN 'Professional tennis' ELSE 'Track and field' END,
      item->>'posZh', item->>'posEn', item->>'natZh', item->>'natEn', item->>'bioZh', item->>'bioEn',
      'https://commons.wikimedia.org/wiki/Special:FilePath/' || (item->>'file') || '?width=960',
      (item->>'zh') || '比赛肖像', (item->>'en') || ' during competition',
      'https://commons.wikimedia.org/wiki/File:' || (item->>'file'),
      item->>'credit', item->>'license', item->>'licenseUrl', true,
      CASE item->>'sport' WHEN 'football' THEN 100 WHEN 'tennis' THEN 200 ELSE 300 END
    )
    ON CONFLICT (slug) DO UPDATE SET
      sport_id = EXCLUDED.sport_id, name_zh = EXCLUDED.name_zh, name_en = EXCLUDED.name_en,
      league = EXCLUDED.league, league_en = EXCLUDED.league_en,
      position = EXCLUDED.position, position_en = EXCLUDED.position_en,
      nationality = EXCLUDED.nationality, nationality_en = EXCLUDED.nationality_en,
      bio = EXCLUDED.bio, bio_en = EXCLUDED.bio_en,
      portrait_url = EXCLUDED.portrait_url, portrait_alt = EXCLUDED.portrait_alt,
      portrait_alt_en = EXCLUDED.portrait_alt_en, portrait_source_url = EXCLUDED.portrait_source_url,
      portrait_credit = EXCLUDED.portrait_credit, portrait_license = EXCLUDED.portrait_license,
      portrait_license_url = EXCLUDED.portrait_license_url, published = true, updated_at = now()
    RETURNING id INTO athlete_id;

    relation_scope := CASE item->>'type' WHEN 'signature' THEN 'signature_line' ELSE 'partnership_status' END;
    INSERT INTO athlete_shoe_lines (
      athlete_id, brand, line_name, line_name_en, relationship_type, relationship_status,
      started_year, ended_year, representative_models, sort_order
    ) VALUES (
      athlete_id, 'Nike', item->>'lineZh', item->>'lineEn', item->>'type', item->>'status',
      NULLIF(item->>'start', '')::integer, NULLIF(item->>'end', '')::integer,
      COALESCE(item->'models', '[]'::jsonb), 1
    )
    ON CONFLICT (athlete_id, line_name) DO UPDATE SET
      line_name_en = EXCLUDED.line_name_en, relationship_type = EXCLUDED.relationship_type,
      relationship_status = EXCLUDED.relationship_status, started_year = EXCLUDED.started_year,
      ended_year = EXCLUDED.ended_year, representative_models = EXCLUDED.representative_models,
      updated_at = now()
    RETURNING id INTO line_id;

    INSERT INTO athlete_sources (
      athlete_id, shoe_line_id, source_url, publisher, title, claim_scope, evidence_note, verification_status
    ) VALUES (
      athlete_id, line_id, item->>'relUrl', 'NIKE, Inc.', item->>'relTitle', relation_scope,
      item->>'relNote', 'verified'
    )
    ON CONFLICT (athlete_id, source_url, claim_scope) DO UPDATE SET
      shoe_line_id = EXCLUDED.shoe_line_id, title = EXCLUDED.title, evidence_note = EXCLUDED.evidence_note,
      verification_status = 'verified', updated_at = now();

    IF item ? 'signatureUrl' THEN
      INSERT INTO athlete_sources (athlete_id, shoe_line_id, source_url, publisher, title, claim_scope, evidence_note, verification_status)
      VALUES (athlete_id, line_id, item->>'signatureUrl', 'NIKE, Inc.', item->>'signatureTitle', 'signature_line', item->>'signatureNote', 'verified')
      ON CONFLICT (athlete_id, source_url, claim_scope) DO UPDATE SET
        shoe_line_id = EXCLUDED.shoe_line_id, title = EXCLUDED.title, evidence_note = EXCLUDED.evidence_note,
        verification_status = 'verified', updated_at = now();
    END IF;

    IF item ? 'endUrl' THEN
      INSERT INTO athlete_sources (athlete_id, source_url, publisher, title, claim_scope, evidence_note, verification_status)
      VALUES (athlete_id, item->>'endUrl', 'On', item->>'endTitle', 'partnership_status',
        'On 于 2026 年 9 月宣布与姆巴佩建立足球合作。 / On announced its football partnership with Mbappé in September 2026.',
        'verified')
      ON CONFLICT (athlete_id, source_url, claim_scope) DO UPDATE SET
        title = EXCLUDED.title, evidence_note = EXCLUDED.evidence_note, verification_status = 'verified', updated_at = now();
    END IF;

    image_page := 'https://commons.wikimedia.org/wiki/File:' || (item->>'file');
    INSERT INTO athlete_sources (athlete_id, source_url, publisher, title, claim_scope, evidence_note, verification_status)
    VALUES
      (athlete_id, image_page, 'Wikimedia Commons', 'Athlete portrait file', 'portrait',
        '图片署名：' || (item->>'credit') || '。 / Image attribution: ' || (item->>'credit') || '.',
        'verified'),
      (athlete_id, image_page, 'Wikimedia Commons', 'Image license', 'image_license',
        (item->>'license') || ' · ' || (item->>'licenseUrl') || ' · Attribution: ' || (item->>'credit'),
        'verified')
    ON CONFLICT (athlete_id, source_url, claim_scope) DO UPDATE SET
      title = EXCLUDED.title, evidence_note = EXCLUDED.evidence_note, verification_status = 'verified', updated_at = now();
  END LOOP;
END $$;
--> statement-breakpoint

UPDATE model_fields
SET label = '签名 / 合作明星', updated_at = now()
WHERE level = 'spu' AND key = 'signing_athlete' AND label = '签约明星';
--> statement-breakpoint

DO $$
DECLARE
  seed jsonb;
  item jsonb;
  product_id uuid;
  field_row record;
  field_value text;
BEGIN
  seed := $products$
[
{"code":"NIKE-SPU-FOOTBALL-MERCURIAL-VAPOR-17","name":"Nike Mercurial Vapor 17","sport":"足球","category":"足球鞋","series":"Mercurial","line":"Mercurial Vapor 17","description":"Nike Mercurial Vapor 17 足球鞋，2026 年发布。 / Nike Mercurial Vapor 17 football boot, introduced in 2026.","url":"https://about.nike.com/en-GB/newsroom/releases/built-for-speed-nike-unveils-new-mercurial-vapor-and-superfly-football-boots","athletes":"克里斯蒂亚诺·罗纳尔多（Cristiano Ronaldo）、维尼修斯·儒尼奥尔（Vinícius Júnior）"},
{"code":"NIKE-SPU-FOOTBALL-MERCURIAL-SUPERFLY-11","name":"Nike Mercurial Superfly 11","sport":"足球","category":"足球鞋","series":"Mercurial","line":"Mercurial Superfly 11","description":"Nike Mercurial Superfly 11 足球鞋，2026 年发布。 / Nike Mercurial Superfly 11 football boot, introduced in 2026.","url":"https://about.nike.com/en-GB/newsroom/releases/built-for-speed-nike-unveils-new-mercurial-vapor-and-superfly-football-boots","athletes":"克里斯蒂亚诺·罗纳尔多（Cristiano Ronaldo）、萨曼莎·克尔（Sam Kerr）、萨尔玛·帕拉略洛（Salma Paralluelo）"},
{"code":"NIKE-SPU-FOOTBALL-PHANTOM-6","name":"Nike Phantom 6","sport":"足球","category":"足球鞋","series":"Phantom","line":"Phantom 6","description":"Nike Phantom 6 足球鞋；Nike 官方分别发布哈兰德与普特利亚斯球员版。 / Nike Phantom 6 football boot with separately documented player editions for Haaland and Putellas.","url":"https://about.nike.com/en/newsroom/releases/nike-phantom-6-erling-haaland-player-edition","secondaryUrl":"https://about.nike.com/en/newsroom/releases/alexia-putellas-first-nike-player-edition-phantom-6-official-images","secondaryEvidence":"Nike 官方发布 Alexia Putellas Phantom 6 球员版。 / Nike documents Alexia Putellas' Phantom 6 player edition.","athletes":"埃尔林·哈兰德（Erling Haaland）、阿莱克西娅·普特利亚斯（Alexia Putellas）"},
{"code":"NIKE-SPU-FOOTBALL-TIEMPO-MAESTRO","name":"Nike Tiempo Maestro","sport":"足球","category":"足球鞋","series":"Tiempo","line":"Tiempo Maestro","description":"Nike Tiempo Maestro 足球鞋系列，官方报道包含 Musiala 合作。 / Nike Tiempo Maestro football boot featured in official Musiala collaboration coverage.","url":"https://about.nike.com/en/newsroom/releases/nike-football-tiempo-maestro-official-images","athletes":"贾马尔·穆西亚拉（Jamal Musiala）"},
{"code":"NIKE-SPU-FOOTBALL-TIEMPO","name":"Nike Tiempo","sport":"足球","category":"足球鞋","series":"Tiempo","line":"Tiempo","description":"Nike United 官方合作中 Naomi Girma 对应 Tiempo 足球鞋系列。 / Nike United documents Naomi Girma's association with the Tiempo football-boot franchise.","url":"https://about.nike.com/en/newsroom/releases/nike-united-collective/","athletes":"娜奥米·吉尔马（Naomi Girma）"},
{"code":"NIKE-SPU-TENNIS-AIR-TECH-CHALLENGE-IV","name":"Nike Air Tech Challenge IV","sport":"网球","category":"网球鞋","series":"Air Tech Challenge","line":"Air Tech Challenge IV","description":"Nike Air Tech Challenge IV 为 Agassi 签名鞋系列中的一代。 / Nike Air Tech Challenge IV from Andre Agassi's signature shoe line.","url":"https://about.nike.com/en-GB/magazine/how-nike-created-air-max-dn","athletes":"安德烈·阿加西（Andre Agassi）"},
{"code":"NIKE-SPU-TENNIS-MAC-ATTACK","name":"Nike Mac Attack","sport":"网球","category":"网球鞋","series":"Mac Attack","line":"Mac Attack","description":"Nike Mac Attack 为 John McEnroe 关联的网球鞋系列。 / Nike Mac Attack tennis shoe line associated with John McEnroe.","url":"https://www.tennis.com/news/articles/john-mcenroe-1984-nike-mac-attack-retro-sneaker-travis-scott-collaboration","athletes":"约翰·麦肯罗（John McEnroe）"},
{"code":"NIKE-SPU-TENNIS-ZOOM-VAPOR-9-TOUR","name":"Nike Zoom Vapor 9 Tour","sport":"网球","category":"网球鞋","series":"NikeCourt Vapor","line":"Zoom Vapor 9 Tour","description":"Nike Zoom Vapor 9 Tour 为 Federer 比赛需求开发的网球鞋。 / Nike Zoom Vapor 9 Tour developed for Roger Federer's on-court requirements.","url":"https://www.complex.com/sneakers/a/brandon-richard/nike-zoom-vapor-9-tour-designed-by-tinker-hatfield-for-roger-federer-summer-2012","athletes":"罗杰·费德勒（Roger Federer）"},
{"code":"NIKE-SPU-TENNIS-FLARE-2","name":"NikeCourt Flare 2","sport":"网球","category":"网球鞋","series":"NikeCourt","line":"Flare 2","description":"Nike 官方记录 Serena 穿着定制 NikeCourt Flare 2 球员版。 / Nike documents Serena in a custom NikeCourt Flare 2 player edition.","url":"https://about.nike.com/en/newsroom/releases/serena-williams-latest-look-for-flushing","athletes":"塞雷娜·威廉姆斯（Serena Williams）"},
{"code":"NIKE-SPU-TENNIS-VAPOR-CAGE-4","name":"NikeCourt Air Zoom Vapor Cage 4","sport":"网球","category":"网球鞋","series":"NikeCourt","line":"Air Zoom Vapor Cage 4","description":"Nike Nadal 鞋款目录中列有 NikeCourt Air Zoom Vapor Cage 4。 / Nike's Nadal shoe catalog lists the NikeCourt Air Zoom Vapor Cage 4.","url":"https://www.nike.com/w/rafael-nadal-shoes-24nddz273vczed1qzy7ok","athletes":"拉斐尔·纳达尔（Rafael Nadal）"},
{"code":"NIKE-SPU-ATHLETICS-ALPHAFLY-3","name":"Nike Alphafly 3","sport":"田径","category":"跑鞋","series":"Alphafly","line":"Alphafly 3","description":"Nike Alphafly 3，Faith Kipyegon 与 Sifan Hassan 的 Nike 来源均有记录。 / Nike Alphafly 3 documented in Nike sources for Faith Kipyegon and Sifan Hassan.","url":"https://about.nike.com/en/newsroom/releases/faith-kipyegon-nike-running-collection-official-images","secondaryUrl":"https://about.nike.com/en/magazine/women-who-win-on-nike-air","secondaryEvidence":"Nike 官方女性跑者专题记录 Sifan Hassan 使用 Nike Alphafly 3。 / Nike's women runners feature documents Sifan Hassan in Nike Alphafly 3.","athletes":"菲斯·基皮耶贡（Faith Kipyegon）、西凡·哈桑（Sifan Hassan）"},
{"code":"NIKE-SPU-ATHLETICS-ALPHAFLY-2","name":"Nike Alphafly 2","sport":"田径","category":"跑鞋","series":"Alphafly","line":"Alphafly 2","description":"Nike Alphafly 2，EK Umoja 合作系列中的马拉松竞赛鞋。 / Nike Alphafly 2 in the EK Umoja collaboration collection.","url":"https://about.nike.com/en/newsroom/releases/ek-umoja-collection","athletes":"埃鲁德·基普乔格（Eliud Kipchoge）"},
{"code":"NIKE-SPU-ATHLETICS-VICTORY-2","name":"Nike Victory 2","sport":"田径","category":"田径钉鞋","series":"Victory","line":"Victory 2","description":"Nike Victory 2 中距离钉鞋，Faith Kipyegon 与 Keely Hodgkinson 系列均有来源。 / Nike Victory 2 middle-distance spike documented in both Faith Kipyegon and Keely Hodgkinson collections.","url":"https://about.nike.com/en-GB/newsroom/releases/keely-hodgkinsons-speed-and-style-converge-in-her-first-signature-nike-running-collection","secondaryUrl":"https://about.nike.com/en/newsroom/releases/faith-kipyegon-nike-running-collection-official-images","secondaryEvidence":"Nike 官方介绍 Faith Kipyegon 系列中的 Victory 2 跑钉。 / Nike documents the Victory 2 spike in Faith Kipyegon's collection.","athletes":"菲斯·基皮耶贡（Faith Kipyegon）、基莉·霍奇金森（Keely Hodgkinson）"},
{"code":"NIKE-SPU-ATHLETICS-VOMERO-PLUS","name":"Nike Vomero Plus","sport":"田径","category":"跑鞋","series":"Vomero","line":"Vomero Plus","description":"Nike Vomero Plus 缓震训练鞋，收录在 Keely Hodgkinson 签名系列。 / Nike Vomero Plus cushioning trainer in Keely Hodgkinson's signature collection.","url":"https://about.nike.com/en-GB/newsroom/releases/keely-hodgkinsons-speed-and-style-converge-in-her-first-signature-nike-running-collection","athletes":"基莉·霍奇金森（Keely Hodgkinson）"},
{"code":"NIKE-SPU-ATHLETICS-PEGASUS-42","name":"Nike Pegasus 42","sport":"田径","category":"跑鞋","series":"Pegasus","line":"Pegasus 42","description":"Nike Pegasus 42 日常训练鞋，收录在 Keely Hodgkinson 系列。 / Nike Pegasus 42 daily trainer in Keely Hodgkinson's collection.","url":"https://about.nike.com/en-GB/newsroom/releases/keely-hodgkinsons-speed-and-style-converge-in-her-first-signature-nike-running-collection","athletes":"基莉·霍奇金森（Keely Hodgkinson）"},
{"code":"NIKE-SPU-ATHLETICS-VAPORFLY-4","name":"Nike Vaporfly 4","sport":"田径","category":"跑鞋","series":"Vaporfly","line":"Vaporfly 4","description":"Nike Vaporfly 4 公路竞速鞋，收录在 Keely Hodgkinson 系列。 / Nike Vaporfly 4 road racing shoe in Keely Hodgkinson's collection.","url":"https://about.nike.com/en-GB/newsroom/releases/keely-hodgkinsons-speed-and-style-converge-in-her-first-signature-nike-running-collection","athletes":"基莉·霍奇金森（Keely Hodgkinson）"},
{"code":"NIKE-SPU-ATHLETICS-PEGASUS-EASYON","name":"Nike Pegasus EasyOn","sport":"田径","category":"跑鞋","series":"Pegasus","line":"Pegasus EasyOn","description":"Nike Pegasus EasyOn 跑鞋，Nike 官方专题关联 Beatriz Hatz。 / Nike Pegasus EasyOn featured by Nike with Beatriz Hatz.","url":"https://about.nike.com/en/magazine/women-who-win-on-nike-air","athletes":"贝娅特丽丝·哈茨（Beatriz Hatz）"},
{"code":"NIKE-SPU-ATHLETICS-VOMERO-PREMIUM","name":"Nike Vomero Premium","sport":"田径","category":"跑鞋","series":"Vomero","line":"Vomero Premium","description":"Nike 为 Sha’Carri Richardson 定制造型中使用的跑鞋。 / Running shoe used in Nike's custom look for Sha’Carri Richardson.","url":"https://about.nike.com/en/magazine/creating-sha-carri-richardson-nike-atelier-athlos-london","athletes":"沙卡里·理查德森（Sha’Carri Richardson）"}
]$products$::jsonb;

  FOR item IN SELECT value FROM jsonb_array_elements(seed)
  LOOP
    INSERT INTO spu_products (spu_code, name, brand)
    VALUES (item->>'code', item->>'name', 'Nike')
    ON CONFLICT (spu_code) DO UPDATE SET name = EXCLUDED.name, brand = EXCLUDED.brand, updated_at = now()
    RETURNING id INTO product_id;

    INSERT INTO product_code_registry (code, spu_id)
    VALUES (item->>'code', product_id)
    ON CONFLICT (code) DO UPDATE SET spu_id = EXCLUDED.spu_id;

    FOR field_row IN
      SELECT id, key FROM model_fields
      WHERE level = 'spu' AND key IN ('sport', 'category', 'series', 'product_line', 'description', 'official_url', 'signing_athlete')
    LOOP
      field_value := CASE field_row.key
        WHEN 'sport' THEN item->>'sport'
        WHEN 'category' THEN item->>'category'
        WHEN 'series' THEN item->>'series'
        WHEN 'product_line' THEN item->>'line'
        WHEN 'description' THEN item->>'description'
        WHEN 'official_url' THEN item->>'url'
        WHEN 'signing_athlete' THEN item->>'athletes'
      END;
      INSERT INTO spu_field_values (spu_id, field_id, text_value)
      VALUES (product_id, field_row.id, field_value)
      ON CONFLICT (spu_id, field_id) DO UPDATE SET text_value = EXCLUDED.text_value, updated_at = now();
    END LOOP;

    INSERT INTO source_records (
      spu_id, url, source_type, market, observed_at, evidence_text, verification_status, publicly_visible
    )
    SELECT product_id, item->>'url', 'official_or_research_source', 'Global', now(),
      item->>'description', 'verified', true
    WHERE NOT EXISTS (
      SELECT 1 FROM source_records
      WHERE spu_id = product_id AND url = item->>'url' AND source_type = 'official_or_research_source'
    );

    IF item ? 'secondaryUrl' THEN
      INSERT INTO source_records (
        spu_id, url, source_type, market, observed_at, evidence_text, verification_status, publicly_visible
      )
      SELECT product_id, item->>'secondaryUrl', 'official_or_research_source', 'Global', now(),
        item->>'secondaryEvidence', 'verified', true
      WHERE NOT EXISTS (
        SELECT 1 FROM source_records
        WHERE spu_id = product_id AND url = item->>'secondaryUrl' AND source_type = 'official_or_research_source'
      );
    END IF;
  END LOOP;
END $$;
