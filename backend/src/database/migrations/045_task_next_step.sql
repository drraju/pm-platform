ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS next_step text;
