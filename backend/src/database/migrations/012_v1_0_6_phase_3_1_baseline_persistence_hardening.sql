DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'project_baseline_tasks_task_id_fkey'
  ) THEN
    ALTER TABLE project_baseline_tasks
      DROP CONSTRAINT project_baseline_tasks_task_id_fkey;
  END IF;
END $$;

ALTER TABLE project_baseline_tasks
  ALTER COLUMN task_id DROP NOT NULL;

ALTER TABLE project_baseline_tasks
  ADD CONSTRAINT project_baseline_tasks_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_project_baselines_status_lifecycle'
  ) THEN
    ALTER TABLE project_baselines
      ADD CONSTRAINT chk_project_baselines_status_lifecycle
      CHECK (status IN ('draft', 'approved', 'superseded'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION prevent_project_baseline_task_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Project baseline tasks are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_project_baseline_mutation()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Project baselines are immutable';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.project_id IS DISTINCT FROM OLD.project_id
    OR NEW.name IS DISTINCT FROM OLD.name
    OR NEW.version_number IS DISTINCT FROM OLD.version_number
    OR NEW.captured_at IS DISTINCT FROM OLD.captured_at
    OR NEW.captured_by_id IS DISTINCT FROM OLD.captured_by_id
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
    OR NEW.created_by_id IS DISTINCT FROM OLD.created_by_id
    OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
    OR NEW.deleted_by_id IS DISTINCT FROM OLD.deleted_by_id
  THEN
    RAISE EXCEPTION 'Project baselines are immutable';
  END IF;

  IF NEW.status NOT IN ('draft', 'approved', 'superseded') THEN
    RAISE EXCEPTION 'Project baseline status must be a lifecycle status';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_project_baseline_tasks_immutable ON project_baseline_tasks;
CREATE TRIGGER trg_project_baseline_tasks_immutable
  BEFORE UPDATE OR DELETE ON project_baseline_tasks
  FOR EACH ROW
  EXECUTE FUNCTION prevent_project_baseline_task_mutation();

DROP TRIGGER IF EXISTS trg_project_baselines_immutable ON project_baselines;
CREATE TRIGGER trg_project_baselines_immutable
  BEFORE UPDATE OR DELETE ON project_baselines
  FOR EACH ROW
  EXECUTE FUNCTION prevent_project_baseline_mutation();
