ALTER TABLE "athlete_evaluation_models" ADD COLUMN "change_note" text;--> statement-breakpoint
UPDATE "athlete_evaluation_models"
SET "change_note" = '首次发布 SES v1 NBA 球星评估模型，包含六维评分、三种权重情景、覆盖率门槛与资格门槛。 / Initial release of NBA athlete-selection model SES v1 with six dimensions, three weighting scenarios, coverage thresholds, and eligibility gates.'
WHERE "version" = 'ses-v1';--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_athlete_evaluation_model_mutation() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Published athlete evaluation model versions cannot be deleted';
  END IF;
  IF OLD.version IS DISTINCT FROM NEW.version
    OR OLD.configuration IS DISTINCT FROM NEW.configuration
    OR OLD.change_note IS DISTINCT FROM NEW.change_note
    OR OLD.published_at IS DISTINCT FROM NEW.published_at
    OR OLD.published_by IS DISTINCT FROM NEW.published_by
    OR OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'Published athlete evaluation model configuration is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
