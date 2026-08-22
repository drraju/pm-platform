ALTER TABLE planning_task_schedules
  ADD COLUMN IF NOT EXISTS task_title VARCHAR(255);

UPDATE planning_task_schedules AS schedule
SET task_title = task.title
FROM tasks AS task
WHERE schedule.task_id = task.id
  AND schedule.task_title IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM planning_task_schedules
    WHERE task_title IS NULL
  ) THEN
    RAISE EXCEPTION
      'Cannot harden forecast history because a planning task schedule has no live task title to preserve';
  END IF;
END $$;

ALTER TABLE planning_task_schedules
  ALTER COLUMN task_title SET NOT NULL;

DO $$
DECLARE
  task_fk RECORD;
BEGIN
  FOR task_fk IN
    SELECT constraint_row.conname
    FROM pg_constraint AS constraint_row
    JOIN pg_attribute AS column_row
      ON column_row.attrelid = constraint_row.conrelid
     AND column_row.attnum = ANY (constraint_row.conkey)
    WHERE constraint_row.conrelid = 'planning_task_schedules'::regclass
      AND constraint_row.confrelid = 'tasks'::regclass
      AND constraint_row.contype = 'f'
      AND column_row.attname = 'task_id'
  LOOP
    EXECUTE format(
      'ALTER TABLE planning_task_schedules DROP CONSTRAINT %I',
      task_fk.conname
    );
  END LOOP;
END $$;

ALTER TABLE planning_task_schedules
  ALTER COLUMN task_id DROP NOT NULL;

ALTER TABLE planning_task_schedules
  ADD CONSTRAINT planning_task_schedules_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL;
