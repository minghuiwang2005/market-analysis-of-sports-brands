UPDATE "star_athletes"
SET "portrait_credit" = 'Joe Johnson2 (crop/edit); source photograph Sgt. Joseph A. Lee / Wikimedia Commons', "updated_at" = now()
WHERE "slug" = 'kobe-bryant';--> statement-breakpoint
UPDATE "athlete_sources"
SET "evidence_note" = 'Commons 文件页记录该图由 JoeJohnson2 裁切和编辑，底图作者为 Sgt. Joseph A. Lee；文件按 CC BY-SA 3.0 发布。', "updated_at" = now()
WHERE "athlete_id" = (SELECT "id" FROM "star_athletes" WHERE "slug" = 'kobe-bryant')
  AND "claim_scope" = 'portrait';
