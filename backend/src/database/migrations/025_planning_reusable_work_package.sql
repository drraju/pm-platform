ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS duration_days INTEGER;

UPDATE tasks
SET duration_days = GREATEST(
  0,
  COALESCE(planned_end_date, due_date) -
    COALESCE(planned_start_date, start_date)
)
WHERE duration_days IS NULL
  AND COALESCE(planned_start_date, start_date) IS NOT NULL
  AND COALESCE(planned_end_date, due_date) IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_tasks_duration_days_non_negative'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT chk_tasks_duration_days_non_negative
      CHECK (duration_days IS NULL OR duration_days >= 0);
  END IF;
END $$;
