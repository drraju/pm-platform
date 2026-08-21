ALTER TABLE planning_schedule_snapshots
  ADD COLUMN IF NOT EXISTS schedule_anchor_date DATE;

ALTER TABLE planning_task_schedules
  ADD COLUMN IF NOT EXISTS early_start INTEGER,
  ADD COLUMN IF NOT EXISTS early_finish INTEGER,
  ADD COLUMN IF NOT EXISTS late_start INTEGER,
  ADD COLUMN IF NOT EXISTS late_finish INTEGER;

CREATE INDEX IF NOT EXISTS idx_planning_snapshots_current_calculated
  ON planning_schedule_snapshots(project_id, schedule_version DESC)
  WHERE calculation_status = 'calculated' AND deleted_at IS NULL;
