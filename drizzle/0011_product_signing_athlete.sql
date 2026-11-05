INSERT INTO "model_fields" ("level", "key", "label", "type", "required", "is_unique", "options", "searchable", "show_in_list", "sort_order", "is_system")
VALUES ('spu', 'signing_athlete', '签约明星', 'short_text', false, false, '[]'::jsonb, true, false, 20, false)
ON CONFLICT ("level", "key") DO NOTHING;
