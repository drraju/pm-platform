CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE project_role AS ENUM ('owner', 'manager', 'contributor', 'viewer');
CREATE TYPE task_status AS ENUM ('backlog', 'todo', 'in_progress', 'blocked', 'done');
CREATE TYPE raid_type AS ENUM ('risk', 'assumption', 'issue', 'dependency');

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by_id UUID,
  updated_by_id UUID,
  deleted_by_id UUID
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_id UUID NOT NULL REFERENCES roles(id),
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE roles
  ADD CONSTRAINT fk_roles_created_by FOREIGN KEY (created_by_id) REFERENCES users(id),
  ADD CONSTRAINT fk_roles_updated_by FOREIGN KEY (updated_by_id) REFERENCES users(id),
  ADD CONSTRAINT fk_roles_deleted_by FOREIGN KEY (deleted_by_id) REFERENCES users(id);

CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(150) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by_id UUID REFERENCES users(id),
  updated_by_id UUID REFERENCES users(id),
  deleted_by_id UUID REFERENCES users(id)
);

CREATE TABLE role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_id UUID REFERENCES users(id),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  start_date DATE,
  target_end_date DATE,
  owner_id UUID REFERENCES users(id),
  business_owner_id UUID REFERENCES users(id),
  executive_sponsor_id UUID REFERENCES users(id),
  delivery_lead_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by_id UUID REFERENCES users(id),
  updated_by_id UUID REFERENCES users(id),
  deleted_by_id UUID REFERENCES users(id)
);

CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role project_role NOT NULL DEFAULT 'contributor',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by_id UUID REFERENCES users(id),
  updated_by_id UUID REFERENCES users(id),
  deleted_by_id UUID REFERENCES users(id),
  UNIQUE (project_id, user_id)
);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_task_id UUID REFERENCES tasks(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assignee_id UUID REFERENCES users(id),
  status task_status NOT NULL DEFAULT 'backlog',
  priority VARCHAR(50) NOT NULL DEFAULT 'medium',
  remarks TEXT,
  task_kind VARCHAR(20) NOT NULL DEFAULT 'standard' CHECK (task_kind IN ('standard', 'summary', 'milestone')),
  percent_complete INTEGER NOT NULL DEFAULT 0 CHECK (percent_complete >= 0 AND percent_complete <= 100),
  sequence_number INTEGER,
  start_date DATE,
  due_date DATE,
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  estimated_hours NUMERIC(10,2) CHECK (estimated_hours IS NULL OR estimated_hours >= 0),
  remaining_hours NUMERIC(10,2) CHECK (remaining_hours IS NULL OR remaining_hours >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by_id UUID REFERENCES users(id),
  updated_by_id UUID REFERENCES users(id),
  deleted_by_id UUID REFERENCES users(id),
  CONSTRAINT chk_tasks_milestone_planned_dates CHECK (
    task_kind <> 'milestone'
    OR planned_start_date IS NULL
    OR planned_end_date IS NULL
    OR planned_start_date = planned_end_date
  ),
  CONSTRAINT chk_tasks_parent_not_self CHECK (parent_task_id IS NULL OR parent_task_id <> id)
);

CREATE TABLE task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  predecessor_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  successor_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  dependency_type VARCHAR(2) NOT NULL CHECK (dependency_type IN ('FS', 'SS', 'FF', 'SF')),
  lag_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by_id UUID REFERENCES users(id),
  updated_by_id UUID REFERENCES users(id),
  deleted_by_id UUID REFERENCES users(id),
  CONSTRAINT chk_task_dependencies_not_self CHECK (predecessor_task_id <> successor_task_id)
);

CREATE TABLE project_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  version_number INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'approved' CHECK (status IN ('draft', 'approved', 'superseded')),
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

CREATE TABLE project_baseline_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_baseline_id UUID NOT NULL REFERENCES project_baselines(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  parent_task_id UUID,
  task_title VARCHAR(255) NOT NULL,
  task_kind VARCHAR(20) NOT NULL CHECK (task_kind IN ('standard', 'summary', 'milestone')),
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

CREATE TRIGGER trg_project_baseline_tasks_immutable
  BEFORE UPDATE OR DELETE ON project_baseline_tasks
  FOR EACH ROW
  EXECUTE FUNCTION prevent_project_baseline_task_mutation();

CREATE TRIGGER trg_project_baselines_immutable
  BEFORE UPDATE OR DELETE ON project_baselines
  FOR EACH ROW
  EXECUTE FUNCTION prevent_project_baseline_mutation();

CREATE TABLE risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type raid_type NOT NULL DEFAULT 'risk',
  title VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES users(id),
  status VARCHAR(50) NOT NULL DEFAULT 'open',
  probability VARCHAR(50) NOT NULL DEFAULT 'medium',
  impact VARCHAR(50) NOT NULL DEFAULT 'medium',
  mitigation_plan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by_id UUID REFERENCES users(id),
  updated_by_id UUID REFERENCES users(id),
  deleted_by_id UUID REFERENCES users(id)
);

CREATE TABLE issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type raid_type NOT NULL DEFAULT 'issue',
  title VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES users(id),
  status VARCHAR(50) NOT NULL DEFAULT 'open',
  severity VARCHAR(50) NOT NULL DEFAULT 'medium',
  resolution_plan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by_id UUID REFERENCES users(id),
  updated_by_id UUID REFERENCES users(id),
  deleted_by_id UUID REFERENCES users(id)
);

CREATE TABLE assumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type raid_type NOT NULL DEFAULT 'assumption',
  title VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES users(id),
  status VARCHAR(50) NOT NULL DEFAULT 'open',
  validation_status VARCHAR(50) NOT NULL DEFAULT 'unvalidated',
  validation_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by_id UUID REFERENCES users(id),
  updated_by_id UUID REFERENCES users(id),
  deleted_by_id UUID REFERENCES users(id)
);

CREATE TABLE dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type raid_type NOT NULL DEFAULT 'dependency',
  title VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES users(id),
  status VARCHAR(50) NOT NULL DEFAULT 'open',
  depends_on TEXT,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by_id UUID REFERENCES users(id),
  updated_by_id UUID REFERENCES users(id),
  deleted_by_id UUID REFERENCES users(id)
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'info',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by_id UUID REFERENCES users(id),
  updated_by_id UUID REFERENCES users(id),
  deleted_by_id UUID REFERENCES users(id)
);

CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_projects_business_owner_id ON projects(business_owner_id);
CREATE INDEX idx_projects_executive_sponsor_id ON projects(executive_sponsor_id);
CREATE INDEX idx_projects_delivery_lead_id ON projects(delivery_lead_id);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_tasks_parent_task_id ON tasks(parent_task_id);
CREATE INDEX idx_tasks_project_parent_sequence ON tasks(project_id, parent_task_id, sequence_number);
CREATE INDEX idx_task_dependencies_predecessor_task_id ON task_dependencies(predecessor_task_id);
CREATE INDEX idx_task_dependencies_successor_task_id ON task_dependencies(successor_task_id);
CREATE UNIQUE INDEX idx_task_dependencies_active_unique_edge
  ON task_dependencies(predecessor_task_id, successor_task_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_project_baselines_project_id ON project_baselines(project_id);
CREATE UNIQUE INDEX idx_project_baselines_project_version
  ON project_baselines(project_id, version_number);
CREATE UNIQUE INDEX idx_project_baselines_current
  ON project_baselines(project_id)
  WHERE is_current = true AND deleted_at IS NULL;
CREATE INDEX idx_project_baseline_tasks_project_baseline_id
  ON project_baseline_tasks(project_baseline_id);
CREATE INDEX idx_project_baseline_tasks_project_task
  ON project_baseline_tasks(project_id, task_id);
CREATE INDEX idx_risks_project_id ON risks(project_id);
CREATE INDEX idx_issues_project_id ON issues(project_id);
CREATE INDEX idx_assumptions_project_id ON assumptions(project_id);
CREATE INDEX idx_dependencies_project_id ON dependencies(project_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
