ALTER TABLE enterprise_resources
  ADD COLUMN IF NOT EXISTS calendar_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_enterprise_resources_calendar'
  ) THEN
    ALTER TABLE enterprise_resources
      ADD CONSTRAINT fk_enterprise_resources_calendar
      FOREIGN KEY (calendar_id)
      REFERENCES enterprise_calendars(id)
      ON UPDATE RESTRICT
      ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_enterprise_resources_calendar
  ON enterprise_resources(calendar_id)
  WHERE deleted_at IS NULL AND calendar_id IS NOT NULL;
