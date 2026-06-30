ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS milestone_category VARCHAR(30);

ALTER TABLE planning_task_schedules
  ADD COLUMN IF NOT EXISTS milestone_category VARCHAR(30);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_tasks_milestone_category'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT chk_tasks_milestone_category
      CHECK (
        (
          task_kind = 'milestone'
          AND milestone_category IN ('standard', 'release', 'drop', 'go_live', 'decision')
        )
        OR milestone_category IS NULL
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_planning_task_schedules_milestone_category'
  ) THEN
    ALTER TABLE planning_task_schedules
      ADD CONSTRAINT chk_planning_task_schedules_milestone_category
      CHECK (
        (
          task_kind = 'milestone'
          AND milestone_category IN ('standard', 'release', 'drop', 'go_live', 'decision')
        )
        OR milestone_category IS NULL
      );
  END IF;
END $$;
