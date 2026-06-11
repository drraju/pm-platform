INSERT INTO permissions (key, description)
VALUES
  ('project.team.manage', 'Manage project team membership'),
  ('task.create', 'Create project tasks'),
  ('task.update', 'Update project tasks'),
  ('task.delete', 'Delete project tasks'),
  ('task.reassign', 'Reassign project tasks'),
  ('task.comment', 'Update task remarks')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
JOIN permissions ON permissions.key IN (
  'project.team.manage',
  'task.create',
  'task.update',
  'task.delete',
  'task.reassign',
  'task.comment'
)
WHERE roles.name IN ('Program Manager', 'Project Manager', 'Delivery Lead')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
JOIN permissions ON permissions.key IN (
  'task.update',
  'task.reassign',
  'task.comment'
)
WHERE roles.name IN ('Technical Lead', 'Engineer', 'QA Engineer')
ON CONFLICT (role_id, permission_id) DO NOTHING;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS remarks TEXT,
  ADD COLUMN IF NOT EXISTS percent_complete INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS planned_start_date DATE,
  ADD COLUMN IF NOT EXISTS planned_end_date DATE,
  ADD COLUMN IF NOT EXISTS actual_start_date DATE,
  ADD COLUMN IF NOT EXISTS actual_end_date DATE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_tasks_percent_complete'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT chk_tasks_percent_complete
      CHECK (percent_complete >= 0 AND percent_complete <= 100);
  END IF;
END $$;
