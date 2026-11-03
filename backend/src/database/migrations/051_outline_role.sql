ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS outline_role varchar NOT NULL DEFAULT 'work';

UPDATE tasks
SET outline_role = CASE
  WHEN task_kind = 'milestone' THEN 'gate'
  WHEN task_kind = 'summary' THEN 'summary'
  ELSE 'work'
END
WHERE outline_role = 'work';

ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_outline_role_check;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_outline_role_check
  CHECK (outline_role IN ('phase', 'milestone', 'summary', 'work', 'gate'));
