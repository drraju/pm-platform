CREATE TABLE IF NOT EXISTS task_execution_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL CHECK (status IN ('backlog', 'todo', 'in_progress', 'blocked', 'done')),
  priority VARCHAR(20) NOT NULL,
  percent_complete INTEGER NOT NULL CHECK (percent_complete >= 0 AND percent_complete <= 100),
  assignee_id UUID REFERENCES users(id),
  next_step TEXT,
  next_action_owner_id UUID REFERENCES users(id),
  target_completion_date DATE,
  update_notes TEXT,
  changes JSONB,
  updated_by_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by_id UUID REFERENCES users(id),
  deleted_by_id UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_task_execution_updates_task
  ON task_execution_updates(task_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_execution_updates_project
  ON task_execution_updates(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_execution_updates_owner_date
  ON task_execution_updates(next_action_owner_id, target_completion_date);
