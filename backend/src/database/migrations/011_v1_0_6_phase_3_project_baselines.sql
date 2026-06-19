CREATE TABLE IF NOT EXISTS project_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  version_number INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'approved',
  captured_at TIMESTAMPTZ NOT NULL,
  captured_by_id UUID NOT NULL REFERENCES users(id),
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by_id UUID REFERENCES users(id),
  updated_by_id UUID REFERENCES users(id),
  deleted_by_id UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS project_baseline_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_baseline_id UUID NOT NULL REFERENCES project_baselines(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  parent_task_id UUID,
  task_title VARCHAR(255) NOT NULL,
  task_kind VARCHAR(20) NOT NULL,
  sequence_number INTEGER,
  planned_start_date DATE,
  planned_end_date DATE,
  estimated_hours NUMERIC(10,2),
  percent_complete INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by_id UUID REFERENCES users(id),
  updated_by_id UUID REFERENCES users(id),
  deleted_by_id UUID REFERENCES users(id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_project_baseline_tasks_task_kind'
  ) THEN
    ALTER TABLE project_baseline_tasks
      ADD CONSTRAINT chk_project_baseline_tasks_task_kind
      CHECK (task_kind IN ('standard', 'summary', 'milestone'));
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

  IF NEW.project_id IS DISTINCT FROM OLD.project_id
    OR NEW.name IS DISTINCT FROM OLD.name
    OR NEW.version_number IS DISTINCT FROM OLD.version_number
    OR NEW.status IS DISTINCT FROM OLD.status
    OR NEW.captured_at IS DISTINCT FROM OLD.captured_at
    OR NEW.captured_by_id IS DISTINCT FROM OLD.captured_by_id
  THEN
    RAISE EXCEPTION 'Project baselines are immutable';
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

CREATE INDEX IF NOT EXISTS idx_project_baselines_project_id
  ON project_baselines(project_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_baselines_project_version
  ON project_baselines(project_id, version_number);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_baselines_current
  ON project_baselines(project_id)
  WHERE is_current = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_project_baseline_tasks_project_baseline_id
  ON project_baseline_tasks(project_baseline_id);

CREATE INDEX IF NOT EXISTS idx_project_baseline_tasks_project_task
  ON project_baseline_tasks(project_id, task_id);
