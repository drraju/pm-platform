ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id),
  ADD COLUMN IF NOT EXISTS task_kind VARCHAR(20) NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS sequence_number INTEGER,
  ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS remaining_hours NUMERIC(10,2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_tasks_task_kind'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT chk_tasks_task_kind
      CHECK (task_kind IN ('standard', 'summary', 'milestone'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_tasks_estimated_hours_non_negative'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT chk_tasks_estimated_hours_non_negative
      CHECK (estimated_hours IS NULL OR estimated_hours >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_tasks_remaining_hours_non_negative'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT chk_tasks_remaining_hours_non_negative
      CHECK (remaining_hours IS NULL OR remaining_hours >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_tasks_milestone_planned_dates'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT chk_tasks_milestone_planned_dates
      CHECK (
        task_kind <> 'milestone'
        OR planned_start_date IS NULL
        OR planned_end_date IS NULL
        OR planned_start_date = planned_end_date
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_tasks_parent_not_self'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT chk_tasks_parent_not_self
      CHECK (parent_task_id IS NULL OR parent_task_id <> id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id
  ON tasks(parent_task_id);

CREATE INDEX IF NOT EXISTS idx_tasks_project_parent_sequence
  ON tasks(project_id, parent_task_id, sequence_number);
