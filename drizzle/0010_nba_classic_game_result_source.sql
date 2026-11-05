INSERT INTO "nba_classic_game_sources" ("game_id", "url", "publisher", "source_title", "evidence_note", "verification_status")
SELECT
	game."id",
	'https://www.nba.com/game/sas-vs-mia-0041200406',
	'NBA.com',
	'San Antonio Spurs vs Miami Heat · 2013 年 6 月 18 日比赛记录',
	'NBA 官方比赛记录确认马刺 100 分、热火 103 分及比赛进入加时。',
	'verified'
FROM "nba_classic_games" AS game
WHERE game."event_key" = '2013-finals-game-6'
ON CONFLICT ("game_id", "url") DO UPDATE SET
	"publisher" = EXCLUDED."publisher",
	"source_title" = EXCLUDED."source_title",
	"evidence_note" = EXCLUDED."evidence_note",
	"verification_status" = 'verified',
	"checked_at" = now();
