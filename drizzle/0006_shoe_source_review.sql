UPDATE "athlete_sources"
SET "source_url" = 'https://www.complex.com/sneakers/a/mike-destefano/russell-westbrook-debuts-jordan-why-not-zero-1-signature-shoe',
    "publisher" = 'Complex',
    "title" = 'Russell Westbrook debuts Jordan Brand signature model',
    "evidence_note" = 'Complex reports Why Not Zer0.1 as Westbrook’s first on-court signature model. The directory marks this as a historical shoe series based on the recorded product releases; it does not claim the source proves his current endorsement status.',
    "checked_at" = now(), "updated_at" = now()
WHERE "athlete_id" = (SELECT "id" FROM "star_athletes" WHERE "slug" = 'russell-westbrook')
  AND "claim_scope" = 'signature_line'
  AND "source_url" = 'https://www.sportsbusinessjournal.com/Daily/Issues/2015/07/13/Marketing-and-Sponsorship/Westbrook/';--> statement-breakpoint
INSERT INTO "athlete_sources" ("athlete_id", "shoe_line_id", "source_url", "publisher", "title", "claim_scope", "evidence_note", "verification_status")
SELECT athlete."id", line."id", 'https://www.si.com/fannation/sneakers/news/paul-georges-signature-nike-shoes-rumored-to-end',
       'Sports Illustrated', 'Paul George’s signature Nike shoes rumored to end', 'signature_line',
       'The report identifies PG 6 as George’s sixth and reportedly last signature model, while explicitly saying the end of the line was not confirmed by Nike or George. The directory labels the product series historical and does not claim a confirmed contract termination.',
       'verified'
FROM "star_athletes" AS athlete
JOIN "athlete_shoe_lines" AS line ON line."athlete_id" = athlete."id" AND line."line_name" = 'PG'
WHERE athlete."slug" = 'paul-george'
ON CONFLICT ("athlete_id", "source_url", "claim_scope") DO UPDATE SET
  "shoe_line_id" = EXCLUDED."shoe_line_id", "publisher" = EXCLUDED."publisher", "title" = EXCLUDED."title",
  "evidence_note" = EXCLUDED."evidence_note", "verification_status" = 'verified', "checked_at" = now(), "updated_at" = now();
