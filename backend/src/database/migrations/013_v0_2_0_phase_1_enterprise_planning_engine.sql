CREATE TABLE IF NOT EXISTS planning_schedule_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  schedule_version INTEGER NOT NULL,
  calculation_status VARCHAR(30) NOT NULL DEFAULT 'pending',
  calculated_at TIMESTAMPTZ,
  project_start_date DATE,
  project_finish_date DATE,
  project_completion_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  critical_path_task_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by_id UUID REFERENCES users(id),
  updated_by_id UUID REFERENCES users(id),
  deleted_by_id UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS planning_task_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES planning_schedule_snapshots(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  parent_task_id UUID,
  task_kind VARCHAR(20) NOT NULL DEFAULT 'standard',
  planned_start_date DATE,
  planned_end_date DATE,
  scheduled_start_date DATE,
  scheduled_end_date DATE,
  duration_days INTEGER,
  total_float_days INTEGER,
  free_float_days INTEGER,
  is_critical BOOLEAN NOT NULL DEFAULT false,
  percent_complete NUMERIC(5,2) NOT NULL DEFAULT 0,
  sequence_number INTEGER,
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
  resource_unit VARCHAR(20) NOT NULL,
  user_id UUID REFERENCES users(id),
  team_name VARCHAR(255),
  capacity_date DATE NOT NULL,
  capacity_minutes INTEGER NOT NULL DEFAULT 480,
  timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
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
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  resource_unit VARCHAR(20) NOT NULL,
  user_id UUID REFERENCES users(id),
  team_name VARCHAR(255),
  allocation_percent NUMERIC(5,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  planned_minutes_per_day INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by_id UUID REFERENCES users(id),
  updated_by_id UUID REFERENCES users(id),
  deleted_by_id UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS resource_workload_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  resource_unit VARCHAR(20) NOT NULL,
  user_id UUID REFERENCES users(id),
  team_name VARCHAR(255),
  workload_date DATE NOT NULL,
  capacity_minutes INTEGER NOT NULL DEFAULT 0,
  allocated_minutes INTEGER NOT NULL DEFAULT 0,
  is_overallocated BOOLEAN NOT NULL DEFAULT false,
  generated_at TIMESTAMPTZ NOT NULL,
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
  predecessor_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  successor_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  dependency_type VARCHAR(2) NOT NULL,
  lag_days INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
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
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_planning_schedule_status'
  ) THEN
    ALTER TABLE planning_schedule_snapshots
      ADD CONSTRAINT chk_planning_schedule_status
      CHECK (calculation_status IN ('pending', 'calculated', 'failed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_planning_task_schedules_task_kind'
  ) THEN
    ALTER TABLE planning_task_schedules
      ADD CONSTRAINT chk_planning_task_schedules_task_kind
      CHECK (task_kind IN ('standard', 'summary', 'milestone'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_resource_capacities_unit'
  ) THEN
    ALTER TABLE resource_capacities
      ADD CONSTRAINT chk_resource_capacities_unit
      CHECK (resource_unit IN ('user', 'team'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_resource_capacities_target'
  ) THEN
    ALTER TABLE resource_capacities
      ADD CONSTRAINT chk_resource_capacities_target
      CHECK (
        (resource_unit = 'user' AND user_id IS NOT NULL AND team_name IS NULL)
        OR (resource_unit = 'team' AND user_id IS NULL AND team_name IS NOT NULL)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_resource_allocations_unit'
  ) THEN
    ALTER TABLE resource_allocations
      ADD CONSTRAINT chk_resource_allocations_unit
      CHECK (resource_unit IN ('user', 'team'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_resource_allocations_target'
  ) THEN
    ALTER TABLE resource_allocations
      ADD CONSTRAINT chk_resource_allocations_target
      CHECK (
        (resource_unit = 'user' AND user_id IS NOT NULL AND team_name IS NULL)
        OR (resource_unit = 'team' AND user_id IS NULL AND team_name IS NOT NULL)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_resource_allocations_dates'
  ) THEN
    ALTER TABLE resource_allocations
      ADD CONSTRAINT chk_resource_allocations_dates
      CHECK (end_date >= start_date);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_workload_snapshots_unit'
  ) THEN
    ALTER TABLE resource_workload_snapshots
      ADD CONSTRAINT chk_workload_snapshots_unit
      CHECK (resource_unit IN ('user', 'team'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_workload_snapshots_target'
  ) THEN
    ALTER TABLE resource_workload_snapshots
      ADD CONSTRAINT chk_workload_snapshots_target
      CHECK (
        (resource_unit = 'user' AND user_id IS NOT NULL AND team_name IS NULL)
        OR (resource_unit = 'team' AND user_id IS NULL AND team_name IS NOT NULL)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_portfolio_dependencies_type'
  ) THEN
    ALTER TABLE portfolio_dependencies
      ADD CONSTRAINT chk_portfolio_dependencies_type
      CHECK (dependency_type IN ('FS', 'SS', 'FF', 'SF'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_planning_schedule_project_version
  ON planning_schedule_snapshots(project_id, schedule_version)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_planning_schedule_project_status
  ON planning_schedule_snapshots(project_id, calculation_status)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_planning_task_schedules_snapshot_task
  ON planning_task_schedules(snapshot_id, task_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_planning_task_schedules_project_task
  ON planning_task_schedules(project_id, task_id)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_resource_capacities_user_date
  ON resource_capacities(project_id, user_id, capacity_date)
  WHERE deleted_at IS NULL AND resource_unit = 'user';

CREATE UNIQUE INDEX IF NOT EXISTS idx_resource_capacities_team_date
  ON resource_capacities(project_id, team_name, capacity_date)
  WHERE deleted_at IS NULL AND resource_unit = 'team';

CREATE INDEX IF NOT EXISTS idx_resource_allocations_project_dates
  ON resource_allocations(project_id, start_date, end_date)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_resource_allocations_task
  ON resource_allocations(task_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_workload_snapshots_project_date
  ON resource_workload_snapshots(project_id, workload_date)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolio_dependencies_active_unique
  ON portfolio_dependencies(
    predecessor_project_id,
    successor_project_id,
    COALESCE(predecessor_task_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(successor_task_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_portfolio_dependencies_predecessor_project
  ON portfolio_dependencies(predecessor_project_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_portfolio_dependencies_successor_project
  ON portfolio_dependencies(successor_project_id)
  WHERE deleted_at IS NULL;
