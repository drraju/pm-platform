CREATE TABLE IF NOT EXISTS schedule_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  project_start_date DATE,
  project_finish_date DATE,
  project_completion_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  critical_path_task_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  calculated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by_id UUID REFERENCES users(id),
  updated_by_id UUID REFERENCES users(id),
  deleted_by_id UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS planning_task_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES schedule_snapshots(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  parent_task_id UUID,
  task_title VARCHAR(255) NOT NULL,
  task_kind VARCHAR(20) NOT NULL DEFAULT 'standard',
  owner_id UUID REFERENCES users(id),
  planned_start_date DATE,
  planned_finish_date DATE,
  duration_days INTEGER NOT NULL DEFAULT 0,
  percent_complete NUMERIC(5,2) NOT NULL DEFAULT 0,
  sequence_number INTEGER,
  total_float_days INTEGER,
  is_critical BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by_id UUID REFERENCES users(id),
  updated_by_id UUID REFERENCES users(id),
  deleted_by_id UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS resource_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  allocation_percent NUMERIC(5,2) NOT NULL,
  start_date DATE,
  finish_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by_id UUID REFERENCES users(id),
  updated_by_id UUID REFERENCES users(id),
  deleted_by_id UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS resource_capacities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  capacity_date DATE NOT NULL,
  capacity_minutes INTEGER NOT NULL DEFAULT 480,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by_id UUID REFERENCES users(id),
  updated_by_id UUID REFERENCES users(id),
  deleted_by_id UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS portfolio_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  predecessor_project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  successor_project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  dependency_type VARCHAR(2) NOT NULL,
  lag_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by_id UUID REFERENCES users(id),
  updated_by_id UUID REFERENCES users(id),
  deleted_by_id UUID REFERENCES users(id),
  CONSTRAINT chk_portfolio_dependencies_not_self CHECK (
    predecessor_project_id <> successor_project_id
  )
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_planning_task_schedules_kind'
  ) THEN
    ALTER TABLE planning_task_schedules
      ADD CONSTRAINT chk_planning_task_schedules_kind
      CHECK (task_kind IN ('standard', 'summary', 'milestone'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_planning_task_schedules_duration'
  ) THEN
    ALTER TABLE planning_task_schedules
      ADD CONSTRAINT chk_planning_task_schedules_duration
      CHECK (duration_days >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_planning_task_schedules_milestone'
  ) THEN
    ALTER TABLE planning_task_schedules
      ADD CONSTRAINT chk_planning_task_schedules_milestone
      CHECK (task_kind <> 'milestone' OR duration_days = 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_resource_allocations_percent'
  ) THEN
    ALTER TABLE resource_allocations
      ADD CONSTRAINT chk_resource_allocations_percent
      CHECK (allocation_percent >= 0 AND allocation_percent <= 200);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_resource_allocations_dates'
  ) THEN
    ALTER TABLE resource_allocations
      ADD CONSTRAINT chk_resource_allocations_dates
      CHECK (finish_date IS NULL OR start_date IS NULL OR finish_date >= start_date);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_portfolio_dependencies_type'
  ) THEN
    ALTER TABLE portfolio_dependencies
      ADD CONSTRAINT chk_portfolio_dependencies_type
      CHECK (dependency_type IN ('FS', 'SS', 'FF', 'SF'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_snapshots_project_version
  ON schedule_snapshots(project_id, version_number)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_planning_task_schedules_snapshot_task
  ON planning_task_schedules(snapshot_id, task_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_planning_task_schedules_project_parent
  ON planning_task_schedules(project_id, parent_task_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_resource_allocations_project_task
  ON resource_allocations(project_id, task_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_resource_allocations_project_user
  ON resource_allocations(project_id, user_id)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_resource_capacities_project_user_date
  ON resource_capacities(project_id, user_id, capacity_date)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_portfolio_dependencies_projects
  ON portfolio_dependencies(predecessor_project_id, successor_project_id)
  WHERE deleted_at IS NULL;
