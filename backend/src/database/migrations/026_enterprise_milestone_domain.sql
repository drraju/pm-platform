ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS duration_days INTEGER;

ALTER TABLE project_baseline_tasks
  ADD COLUMN IF NOT EXISTS milestone_category VARCHAR(30);

UPDATE tasks
SET milestone_category = 'standard'
WHERE task_kind = 'milestone'
  AND milestone_category IS NULL;

UPDATE tasks
SET duration_days = 0,
    planned_end_date = COALESCE(planned_start_date, planned_end_date),
    planned_start_date = COALESCE(planned_start_date, planned_end_date)
WHERE task_kind = 'milestone';

UPDATE tasks
SET percent_complete = CASE WHEN status = 'done' THEN 100 ELSE 0 END,
    actual_start_date = CASE
      WHEN status = 'done' THEN COALESCE(actual_end_date, actual_start_date, planned_end_date)
      ELSE NULL
    END,
    actual_end_date = CASE
      WHEN status = 'done' THEN COALESCE(actual_end_date, actual_start_date, planned_end_date)
      ELSE NULL
    END
WHERE task_kind = 'milestone';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_tasks_milestone_duration'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT chk_tasks_milestone_duration
      CHECK (task_kind <> 'milestone' OR duration_days = 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_tasks_milestone_actual_dates'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT chk_tasks_milestone_actual_dates
      CHECK (
        task_kind <> 'milestone'
        OR actual_start_date IS NULL
        OR actual_end_date IS NULL
        OR actual_start_date = actual_end_date
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_tasks_milestone_progress'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT chk_tasks_milestone_progress
      CHECK (
        task_kind <> 'milestone'
        OR (status = 'done' AND percent_complete = 100)
        OR (status <> 'done' AND percent_complete = 0)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_project_baseline_tasks_milestone_category'
  ) THEN
    ALTER TABLE project_baseline_tasks
      ADD CONSTRAINT chk_project_baseline_tasks_milestone_category
      CHECK (
        (task_kind = 'milestone' AND milestone_category IN
          ('standard', 'release', 'drop', 'go_live', 'decision'))
        OR milestone_category IS NULL
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_project_milestone_planned_date
  ON tasks(project_id, planned_start_date)
  WHERE task_kind = 'milestone' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_project_milestone_category
  ON tasks(project_id, milestone_category)
  WHERE task_kind = 'milestone' AND deleted_at IS NULL;

