CREATE TABLE IF NOT EXISTS enterprise_resource_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES enterprise_resources(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  allocation_percent NUMERIC(5, 2),
  planned_minutes_per_day INT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
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
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_enterprise_resource_assignments_status'
  ) THEN
    ALTER TABLE enterprise_resource_assignments
      ADD CONSTRAINT chk_enterprise_resource_assignments_status
      CHECK (status IN ('draft', 'active', 'archived'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_enterprise_resource_assignments_dates'
  ) THEN
    ALTER TABLE enterprise_resource_assignments
      ADD CONSTRAINT chk_enterprise_resource_assignments_dates
      CHECK (start_date <= end_date);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_enterprise_resource_assignments_commitment'
  ) THEN
    ALTER TABLE enterprise_resource_assignments
      ADD CONSTRAINT chk_enterprise_resource_assignments_commitment
      CHECK (
        allocation_percent IS NOT NULL
        OR planned_minutes_per_day IS NOT NULL
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_enterprise_resource_assignments_resource
  ON enterprise_resource_assignments(resource_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_enterprise_resource_assignments_project
  ON enterprise_resource_assignments(project_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_enterprise_resource_assignments_task
  ON enterprise_resource_assignments(task_id)
  WHERE deleted_at IS NULL AND task_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_enterprise_resource_assignments_status
  ON enterprise_resource_assignments(status)
  WHERE deleted_at IS NULL;
