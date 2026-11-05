ALTER TABLE "sports_timeline_events" ADD COLUMN IF NOT EXISTS "organization_en" varchar(160);
--> statement-breakpoint
ALTER TABLE "sports_timeline_events" ADD COLUMN IF NOT EXISTS "title_en" varchar(240);
--> statement-breakpoint
ALTER TABLE "sports_timeline_events" ADD COLUMN IF NOT EXISTS "description_en" text;
--> statement-breakpoint
ALTER TABLE "nba_classic_games" ADD COLUMN IF NOT EXISTS "game_label_en" varchar(120);
--> statement-breakpoint
ALTER TABLE "nba_classic_games" ADD COLUMN IF NOT EXISTS "title_en" varchar(240);
--> statement-breakpoint
ALTER TABLE "nba_classic_games" ADD COLUMN IF NOT EXISTS "matchup_en" varchar(180);
--> statement-breakpoint
ALTER TABLE "nba_classic_games" ADD COLUMN IF NOT EXISTS "result_en" varchar(80);
--> statement-breakpoint
ALTER TABLE "nba_classic_games" ADD COLUMN IF NOT EXISTS "description_en" text;
--> statement-breakpoint
ALTER TABLE "star_sports" ADD COLUMN IF NOT EXISTS "intro_en" text;
--> statement-breakpoint
ALTER TABLE "star_athletes" ADD COLUMN IF NOT EXISTS "league_en" varchar(80);
--> statement-breakpoint
ALTER TABLE "star_athletes" ADD COLUMN IF NOT EXISTS "position_en" varchar(80);
--> statement-breakpoint
ALTER TABLE "star_athletes" ADD COLUMN IF NOT EXISTS "teams_summary_en" text;
--> statement-breakpoint
ALTER TABLE "star_athletes" ADD COLUMN IF NOT EXISTS "nationality_en" varchar(80);
--> statement-breakpoint
ALTER TABLE "star_athletes" ADD COLUMN IF NOT EXISTS "bio_en" text;
--> statement-breakpoint
ALTER TABLE "star_athletes" ADD COLUMN IF NOT EXISTS "portrait_alt_en" text;
--> statement-breakpoint
ALTER TABLE "star_athletes" ADD COLUMN IF NOT EXISTS "career_highlights_en" jsonb;
--> statement-breakpoint
WITH translations(event_key, organization_en, title_en, description_en) AS (VALUES
  ('nba-2026-present', NULL, 'Eight decades down, the story continues', 'From the BAA in 1946 to a 30-team NBA, the league continues to stage regular seasons and playoffs while shaping basketball culture. This overview reflects the league as of October 2026.'),
  ('nba-2025-media-rights', NULL, 'A new era of media partnerships begins', 'Long-term agreements with Disney, NBCUniversal, and Amazon take effect in the 2025–26 season, opening a new chapter in NBA broadcasting and streaming distribution.'),
  ('nba-2023-in-season-tournament', NULL, 'The inaugural In-Season Tournament concludes', 'On December 9, 2023, the NBA held the final of its first In-Season Tournament. The Los Angeles Lakers won the first NBA Cup.'),
  ('nba-2020-bubble-season', NULL, 'The season resumes at a single-site campus', 'The league paused play in March 2020 and resumed the 2019–20 season in July at a single-site campus near Orlando, Florida.'),
  ('nba-2001-development-league', NULL, 'The Development League begins play', 'The NBA Development League, now the NBA G League, began play in the 2001–02 season and expanded player development pathways.'),
  ('nba-1997-wnba-first-games', NULL, 'The WNBA plays its first games', 'The WNBA, established with NBA support, began its first regular-season games in June 1997, creating a new stage for professional women’s basketball.'),
  ('nba-1992-dream-team', NULL, 'The U.S. Dream Team takes the Olympic stage', 'The first U.S. Olympic men’s basketball team featuring NBA stars won gold and became a defining symbol of basketball’s global reach.'),
  ('nba-1984-draft-class', NULL, 'A draft class that shaped the league', 'Michael Jordan, Hakeem Olajuwon, Charles Barkley, and John Stockton entered the league in 1984.'),
  ('nba-1979-three-point-line', NULL, 'The three-point line becomes an official rule', 'The NBA adopted the three-point shot in the 1979–80 season, creating new possibilities for tactical evolution in the decades that followed.'),
  ('nba-1976-aba-merger', NULL, 'Four ABA teams join the NBA', 'The Nets, Pacers, Nuggets, and Spurs joined the NBA from the ABA, expanding the league and its player landscape.'),
  ('nba-1954-shot-clock', NULL, 'The 24-second shot clock is introduced', 'The league introduced the 24-second shot clock in 1954, changing the pace of play and establishing a core rule of modern basketball.'),
  ('nba-1950-integration', NULL, 'Black players enter the NBA', 'Chuck Cooper, Nat Clifton, and Earl Lloyd broke barriers through the draft, signing, and first official game appearances.'),
  ('nba-1949-baa-nbl-merger', NULL, 'The BAA and NBL merge', 'On August 3, 1949, the BAA and National Basketball League merged to form the modern NBA.'),
  ('nba-1946-baa-founded', NULL, 'The BAA is founded in New York', 'The Basketball Association of America (BAA), predecessor to the NBA, was founded. In November, the New York Knicks and Toronto Huskies played the league’s first game.'),
  ('athlete-michael-jordan-nike-1984', 'Nike', 'Jordan signs a footwear partnership with Nike', 'On October 26, 1984, Michael Jordan signed a footwear endorsement agreement with Nike, laying the foundation for the Air Jordan line.'),
  ('athlete-carmelo-anthony-nike-2003', 'Nike', 'Anthony signs a multi-year footwear deal with Nike', 'Carmelo Anthony signed a multi-year footwear deal with Nike in May 2003.'),
  ('athlete-lebron-james-nike-2003', 'Nike', 'James signs a rookie endorsement deal with Nike', 'Nike signed LeBron James to a rookie endorsement deal on May 22, 2003.'),
  ('athlete-kobe-bryant-nike-2003', 'Nike', 'Bryant signs a footwear endorsement deal with Nike', 'Kobe Bryant signed a footwear endorsement deal with Nike in June 2003, including plans for his own product line.'),
  ('athlete-chris-paul-jordan-2006', 'Jordan Brand', 'Paul joins Jordan Brand', 'In November 2006, Chris Paul signed a multi-year deal to represent Jordan Brand footwear, apparel, and accessories.'),
  ('athlete-kevin-durant-nike-2007', 'Nike', 'Durant’s partnership with Nike begins', 'Public reporting dates Kevin Durant’s partnership with Nike to 2007; sources do not provide a more precise signing date.'),
  ('athlete-kyrie-irving-nike-2011', 'Nike', 'Irving announces his move to Nike Basketball', 'Kyrie Irving publicly announced his Nike signing on July 14, 2011; the date reflects the announcement reported at the time.'),
  ('athlete-giannis-antetokounmpo-nike-2013', 'Nike', 'Antetokounmpo begins a footwear partnership with Nike', 'An interview with his agent recalled that Nike signed Giannis Antetokounmpo to his first footwear deal before the 2013 draft; no exact date was reported.'),
  ('athlete-devin-booker-nike-2015', 'Nike', 'Booker joins Nike in 2015', 'Public reporting recalls that Devin Booker signed with Nike before entering the NBA in 2015; no exact date was reported.'),
  ('athlete-russell-westbrook-jordan-2017', 'Jordan Brand', 'Westbrook signs a 10-year extension with Jordan Brand', 'Public reports in September 2017 said Russell Westbrook signed a 10-year extension with Jordan Brand. This records an extension, not the start of the partnership.'),
  ('athlete-jayson-tatum-jordan-2019', 'Jordan Brand', 'Tatum signs a multi-year Jordan Brand footwear deal', 'Reports published on June 21, 2019 said Jayson Tatum had agreed to a multi-year footwear deal with Jordan Brand.'),
  ('athlete-zion-williamson-jordan-2019', 'Jordan Brand', 'Williamson announces his Jordan Brand signing', 'Zion Williamson announced his Jordan Brand signing on July 23, 2019, and Jordan Brand welcomed him the same day.'),
  ('athlete-luka-doncic-jordan-2019', 'Jordan Brand', 'Dončić joins Jordan Brand', 'Jordan Brand announced Luka Dončić’s addition to its roster on December 27, 2019.'),
  ('athlete-ja-morant-nike-2022', 'Nike', 'Nike adds Morant to its signature roster', 'Nike announced Ja Morant’s addition to the Nike Basketball signature roster on December 25, 2022. This is the brand announcement date, not an inferred contract date.'),
  ('athlete-kevin-durant-nike-lifetime-2023', 'Nike', 'Durant agrees to a lifetime deal with Nike', 'The Associated Press reported on April 28, 2023 that Kevin Durant had agreed to a lifetime partnership with Nike. This was a renewal event.')
)
UPDATE "sports_timeline_events" AS event
SET "organization_en" = COALESCE(event."organization_en", translations.organization_en),
    "title_en" = COALESCE(event."title_en", translations.title_en),
    "description_en" = COALESCE(event."description_en", translations.description_en)
FROM translations
WHERE event."event_key" = translations.event_key;
--> statement-breakpoint
WITH translations(event_key, game_label_en, title_en, matchup_en, result_en, description_en) AS (VALUES
  ('1970-finals-game-3', 'NBA Finals · Game 3', 'Jerry West’s 60-foot buzzer-beater', 'New York Knicks vs. Los Angeles Lakers', '111–108 (Knicks win)', 'Jerry West hit an approximately 60-foot buzzer-beater to tie the game and force overtime. New York eventually won 111–108.'),
  ('1998-finals-game-6', 'NBA Finals · Game 6', 'Jordan’s steal sets up the title-winning jumper', 'Chicago Bulls vs. Utah Jazz', '87–86 (Bulls win)', 'Late in the game, Michael Jordan stole the ball from Karl Malone and made the go-ahead jumper. Chicago won 87–86 to claim its sixth title in eight years.'),
  ('2013-finals-game-6', 'NBA Finals · Game 6', 'Ray Allen’s corner three keeps Miami alive', 'Miami Heat vs. San Antonio Spurs', '103–100 (Heat win)', 'Ray Allen made a tying three-pointer late in regulation to force overtime. Miami won 103–100 and sent the series to Game 7.')
)
UPDATE "nba_classic_games" AS game
SET "game_label_en" = COALESCE(game."game_label_en", translations.game_label_en),
    "title_en" = COALESCE(game."title_en", translations.title_en),
    "matchup_en" = COALESCE(game."matchup_en", translations.matchup_en),
    "result_en" = COALESCE(game."result_en", translations.result_en),
    "description_en" = COALESCE(game."description_en", translations.description_en)
FROM translations
WHERE game."event_key" = translations.event_key;
--> statement-breakpoint
UPDATE "star_sports"
SET "intro_en" = COALESCE("intro_en", CASE "slug"
  WHEN 'basketball' THEN 'Profiles of NBA athletes connected to Nike and Jordan Brand signature footwear, with traceable shoe-line relationships and sources.'
  WHEN 'football' THEN 'Football athlete profiles are being prepared. Signature-shoe relationships, athlete information, and image licenses will be reviewed before publication.'
  WHEN 'tennis' THEN 'Tennis athlete profiles are being prepared. Signature-shoe relationships, athlete information, and image licenses will be reviewed before publication.'
  WHEN 'athletics' THEN 'Track and field athlete profiles are being prepared. Signature-shoe relationships, athlete information, and image licenses will be reviewed before publication.'
  ELSE NULL END),
  "updated_at" = now()
WHERE "slug" IN ('basketball', 'football', 'tennis', 'athletics');
--> statement-breakpoint
WITH translations(slug, teams_summary_en, bio_en, portrait_alt_en) AS (VALUES
  ('michael-jordan', 'Chicago Bulls / Washington Wizards', 'Six-time NBA champion, five-time regular-season MVP, and ten-time scoring champion. His Air Jordan signature line links professional basketball with sneaker culture.', 'Michael Jordan holding a basketball in a Chicago Bulls uniform in 1997'),
  ('lebron-james', 'Cleveland Cavaliers / Miami Heat / Los Angeles Lakers', 'Four-time NBA champion and four-time regular-season MVP. The Nike LeBron line continues to release signature basketball shoes.', 'LeBron James in a Cleveland Cavaliers uniform during a 2018 game'),
  ('kobe-bryant', 'Los Angeles Lakers', 'Five-time NBA champion and one-time regular-season MVP. The Nike Kobe line continues to return in Protro editions.', 'Kobe Bryant in a game photo'),
  ('kevin-durant', 'Oklahoma City Thunder / Golden State Warriors / Brooklyn Nets / Phoenix Suns / Houston Rockets', 'Two-time NBA champion and one-time regular-season MVP. The Nike KD line continues as his signature footwear collection.', 'Kevin Durant in an Oklahoma City Thunder uniform'),
  ('kyrie-irving', 'Cleveland Cavaliers / Boston Celtics / Brooklyn Nets / Dallas Mavericks', 'A member of the 2016 NBA championship team. Nike Kyrie released multiple signature models; the line is now marked historical.', 'Kyrie Irving in a game photo'),
  ('giannis-antetokounmpo', 'Milwaukee Bucks', 'Two-time regular-season MVP and 2021 NBA champion and Finals MVP. The Nike Giannis Freak line continues to release signature shoes.', 'Giannis Antetokounmpo in a Milwaukee Bucks uniform'),
  ('ja-morant', 'Memphis Grizzlies', '2020 Rookie of the Year and 2022 Most Improved Player. The Nike JA line continues to release his signature shoes.', 'Ja Morant in a game photo'),
  ('devin-booker', 'Phoenix Suns', 'A central Phoenix Suns player. The Nike Book line takes its design cues from his style of play.', 'Devin Booker in a profile photo'),
  ('paul-george', 'Indiana Pacers / Oklahoma City Thunder / LA Clippers / Philadelphia 76ers', 'A multiple-time All-Star and All-Defensive selection. Nike PG released several signature models; the line is now marked historical.', 'Paul George in a game photo'),
  ('carmelo-anthony', 'Denver Nuggets / New York Knicks / Oklahoma City Thunder / Houston Rockets / Portland Trail Blazers / Los Angeles Lakers', 'Ten-time All-Star and three-time Olympic gold medalist. Jordan Brand Melo released several signature models.', 'Carmelo Anthony in a Denver Nuggets uniform'),
  ('chris-paul', 'New Orleans Hornets / LA Clippers / Houston Rockets / Oklahoma City Thunder / Phoenix Suns / Golden State Warriors / San Antonio Spurs', 'The 2006 Rookie of the Year and a twelve-time All-Star. Jordan Brand CP3 released multiple signature models.', 'Chris Paul in a game photo'),
  ('russell-westbrook', 'Oklahoma City Thunder / Houston Rockets / Washington Wizards / Los Angeles Lakers / LA Clippers / Denver Nuggets / Sacramento Kings', 'The 2017 regular-season MVP. Jordan Brand’s Why Not? line released signature basketball shoes.', 'Russell Westbrook in a game photo'),
  ('luka-doncic', 'Dallas Mavericks / Los Angeles Lakers', 'A multiple-time All-Star and All-NBA selection. The Jordan Brand Luka line continues to release signature shoes.', 'Luka Dončić in a game photo'),
  ('jayson-tatum', 'Boston Celtics', 'A member of the 2024 NBA championship team. The Jordan Brand Tatum line continues to release signature basketball shoes.', 'Jayson Tatum in a profile photo'),
  ('zion-williamson', 'New Orleans Pelicans', 'A member of the 2020 All-Rookie First Team. The Jordan Brand Zion line continues to release signature basketball shoes.', 'Zion Williamson in a game photo'),
  ('david-robinson', 'San Antonio Spurs', 'A former NBA player who spent his career with the San Antonio Spurs. The Nike Air Command Force launched as his signature shoe in 1991.', 'David Robinson representing the United States against Spain at the 1988 Olympics'),
  ('charles-barkley', 'Philadelphia 76ers / Phoenix Suns / Houston Rockets', 'A Hall of Fame forward who played for the Philadelphia 76ers, Phoenix Suns, and Houston Rockets. The Nike Air Force Max CB launched in 1993.', 'Charles Barkley playing for the Philadelphia 76ers'),
  ('penny-hardaway', 'Orlando Magic / Phoenix Suns / New York Knicks / Miami Heat', 'An NBA guard who played for Orlando, Phoenix, New York, and Miami. The Nike Air Penny line began in 1995.', 'Anfernee Hardaway in a New York Knicks uniform'),
  ('jason-kidd', 'Dallas Mavericks / Phoenix Suns / New Jersey Nets / New York Knicks', 'A Hall of Fame point guard who played for Dallas, Phoenix, New Jersey, and New York. The Nike Zoom Flight Five became his signature shoe in 1996.', 'Jason Kidd playing for the Dallas Mavericks'),
  ('scottie-pippen', 'Chicago Bulls / Houston Rockets / Portland Trail Blazers', 'A Hall of Fame forward and six-time champion with the Chicago Bulls. The Nike Air Pippen 1 launched in 1997.', 'Scottie Pippen portrait'),
  ('alonzo-mourning', 'Charlotte Hornets / Miami Heat / New Jersey Nets', 'A Hall of Fame center who played for Charlotte, Miami, and New Jersey. The Nike Air Alonzo launched in 1997.', 'Alonzo Mourning in a Miami Heat uniform'),
  ('kevin-garnett', 'Minnesota Timberwolves / Boston Celtics / Brooklyn Nets', 'A Hall of Fame forward and 2008 champion with the Boston Celtics. Nike Air Garnett launched in 1998 and expanded into several signature models.', 'Kevin Garnett in a Boston Celtics uniform'),
  ('gary-payton', 'Seattle SuperSonics / Milwaukee Bucks / Los Angeles Lakers / Boston Celtics / Miami Heat', 'A Hall of Fame guard and 1996 Defensive Player of the Year. Nike Air Zoom Flight 98 carried his nickname, The Glove.', 'Gary Payton in a Miami Heat uniform'),
  ('tim-duncan', 'San Antonio Spurs', 'A Hall of Fame forward and center who spent his NBA career with the San Antonio Spurs. The Nike Total Air Foamposite Max was associated with his signature footwear in 1998.', 'Tim Duncan in a San Antonio Spurs game against the Washington Wizards'),
  ('vince-carter', 'Toronto Raptors / New Jersey Nets / Orlando Magic / Phoenix Suns / Dallas Mavericks / Memphis Grizzlies / Sacramento Kings / Atlanta Hawks', 'A Hall of Fame guard and forward whose NBA career spanned 22 seasons. The Nike Shox BB4 became his signature shoe in 2000.', 'Vince Carter in a New Jersey Nets uniform in 2008'),
  ('dwyane-wade', 'Miami Heat / Chicago Bulls / Cleveland Cavaliers', 'A three-time NBA champion who spent most of his career with the Miami Heat. Jordan Brand launched his first signature shoe, Fly Wade, in 2011.', 'Dwyane Wade in a game photo'),
  ('dennis-rodman', 'Detroit Pistons / San Antonio Spurs / Chicago Bulls / Los Angeles Lakers / Dallas Mavericks', 'A Hall of Fame forward and center, he won five NBA championships with the Detroit Pistons and Chicago Bulls. Nike released player-associated signature models including the Air Worm Ndestrukt.', 'Dennis Rodman at a public event'),
  ('chris-webber', 'Golden State Warriors / Washington Bullets / Sacramento Kings / Philadelphia 76ers / Detroit Pistons', 'A Hall of Fame forward and five-time All-Star. The Nike Air Max CW was his signature shoe; later retros were renamed Air Max Sensation.', 'Chris Webber during an NBA game in 2003'),
  ('tim-hardaway', 'Golden State Warriors / Miami Heat / Dallas Mavericks / Denver Nuggets / Indiana Pacers', 'A Hall of Fame point guard and five-time All-Star. Nike released the Air Zoom T-Bug Flight as his signature shoe.', 'Tim Hardaway at a youth basketball clinic'),
  ('steve-nash', 'Phoenix Suns / Dallas Mavericks / Los Angeles Lakers', 'A Hall of Fame point guard and two-time regular-season MVP. The Nike Zoom MVP X was released in a Steve Nash-branded player edition and is recorded as a historical signature model.', 'Steve Nash in a Phoenix Suns uniform'),
  ('paul-pierce', 'Boston Celtics / Brooklyn Nets / Washington Wizards / LA Clippers', 'A Hall of Fame forward, 2008 champion, and Finals MVP. Nike released multiple signature shoes for him in the Air Max Pierce and P2 lines.', 'Paul Pierce at the 2008 Celtics championship rally')
)
UPDATE "star_athletes" AS athlete
SET "league_en" = COALESCE(athlete."league_en", athlete."league"),
    "position_en" = COALESCE(athlete."position_en", CASE athlete."position"
      WHEN '后卫' THEN 'Guard' WHEN '前锋' THEN 'Forward' WHEN '中锋' THEN 'Center'
      WHEN '前锋 / 中锋' THEN 'Forward / Center' WHEN '前锋 / 后卫' THEN 'Forward / Guard'
      WHEN '后卫 / 前锋' THEN 'Guard / Forward' ELSE athlete."position" END),
    "teams_summary_en" = COALESCE(athlete."teams_summary_en", translations.teams_summary_en),
    "nationality_en" = COALESCE(athlete."nationality_en", CASE athlete."nationality"
      WHEN '美国' THEN 'United States' WHEN '希腊' THEN 'Greece' WHEN '加拿大' THEN 'Canada'
      WHEN '斯洛文尼亚' THEN 'Slovenia' WHEN '美属维尔京群岛' THEN 'U.S. Virgin Islands'
      ELSE athlete."nationality" END),
    "bio_en" = COALESCE(athlete."bio_en", translations.bio_en),
    "portrait_alt_en" = COALESCE(athlete."portrait_alt_en", translations.portrait_alt_en),
    "career_highlights_en" = COALESCE(athlete."career_highlights_en", (
      SELECT jsonb_agg(jsonb_build_object('value', highlight->>'value', 'label', CASE highlight->>'label'
        WHEN 'NBA 总冠军' THEN 'NBA championships' WHEN 'NBA 总冠军 / 总决赛 MVP' THEN 'NBA championship / Finals MVP'
        WHEN 'NBA 总决赛' THEN 'NBA Finals'
        WHEN '常规赛 MVP' THEN 'Regular-season MVP' WHEN '全明星入选' THEN 'All-Star selections'
        WHEN 'NBA 全明星' THEN 'NBA All-Star' WHEN '全明星赛 MVP' THEN 'All-Star Game MVP'
        WHEN '奥运会金牌' THEN 'Olympic gold medals' WHEN '年度最佳新秀' THEN 'Rookie of the Year'
        WHEN '总冠军 / 总决赛 MVP' THEN 'Championship / Finals MVP' WHEN '总决赛 MVP' THEN 'Finals MVP'
        WHEN '最佳防守球员' THEN 'Defensive Player of the Year' WHEN '最佳防守阵容第一队' THEN 'All-Defensive First Team'
        WHEN '最佳阵容第一队' THEN 'All-NBA First Team' WHEN '最佳新秀阵容第一队' THEN 'All-Rookie First Team'
        WHEN '生涯场均得分' THEN 'Career points per game' WHEN '场均三双赛季' THEN 'Triple-double seasons'
        WHEN '进步最快球员' THEN 'Most Improved Player' ELSE highlight->>'label' END))
      FROM jsonb_array_elements(athlete."career_highlights") AS highlight
    ))
FROM translations
WHERE athlete."slug" = translations.slug;
