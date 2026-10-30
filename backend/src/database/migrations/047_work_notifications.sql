ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES tasks (id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS reason varchar(32);

ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_reason_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_reason_check
  CHECK (reason IS NULL OR reason IN ('assigned', 'blocked', 'overdue'));

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications (user_id, created_at DESC);

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS overdue_alerted_on date;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS slack_webhook_url text,
  ADD COLUMN IF NOT EXISTS slack_channel_id varchar(80);

INSERT INTO role_permissions (role_id, permission_id)
SELECT DISTINCT work_grant.role_id, notification_permission.id
FROM role_permissions work_grant
JOIN permissions work_permission
  ON work_permission.id = work_grant.permission_id
 AND work_permission.key IN ('work.update', 'task.update')
JOIN permissions notification_permission
  ON notification_permission.key = 'notification.read'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
JOIN permissions ON permissions.key = 'notification.read'
WHERE roles.name IN (
  'TEAM_MEMBER',
  'PROJECT_MANAGER',
  'PROGRAM_MANAGER',
  'PORTFOLIO_MANAGER'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;
