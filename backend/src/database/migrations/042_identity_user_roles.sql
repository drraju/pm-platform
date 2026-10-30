CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

INSERT INTO user_roles (user_id, role_id)
SELECT id, role_id
FROM users
WHERE role_id IS NOT NULL
ON CONFLICT (user_id, role_id) DO NOTHING;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS local_only boolean NOT NULL DEFAULT false;

UPDATE users
SET local_only = true
WHERE password_hash IS NOT NULL;

INSERT INTO roles (name, description)
VALUES
  ('ADMIN', 'Workspace administration without sign-in settings'),
  ('PROGRAM_MANAGER', 'Delivery responsibility across a set of projects'),
  ('CUSTOMER_SUCCESS_MANAGER', 'Post-sale owner of customers and linked project health'),
  ('SALES', 'Commercial owner of customers')
ON CONFLICT (name) DO UPDATE
SET description = EXCLUDED.description,
    updated_at = now();

INSERT INTO permissions (key, description)
VALUES
  ('customer.read', 'Read customers in scope'),
  ('customer.manage', 'Create and edit customers in scope'),
  ('customer_success.view', 'Open the customer success view'),
  ('program.view', 'Read programs'),
  ('auth.configure', 'Configure Google and local sign-in'),
  ('work.update', 'Update assigned delivery work'),
  ('project.lead', 'Lead a project plan and team')
ON CONFLICT (key) DO UPDATE
SET description = EXCLUDED.description,
    updated_at = now();

DELETE FROM role_permissions
USING roles, permissions
WHERE role_permissions.role_id = roles.id
  AND role_permissions.permission_id = permissions.id
  AND roles.name IN ('CUSTOMER', 'PARTNER', 'EXECUTIVE')
  AND permissions.key = 'raid.read';

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
JOIN permissions
  ON permissions.key NOT LIKE 'external.%'
WHERE roles.name = 'PLATFORM_ADMIN'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
JOIN permissions
  ON permissions.key NOT LIKE 'external.%'
 AND permissions.key <> 'auth.configure'
WHERE roles.name = 'ADMIN'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
JOIN permissions ON permissions.key IN (
  'customer.read',
  'dashboard.view',
  'executive.view',
  'notification.read',
  'portfolio.view',
  'program.view',
  'project.create',
  'project.lead',
  'project.read',
  'project.team.manage',
  'project.update',
  'raid.create',
  'raid.delete',
  'raid.read',
  'raid.update',
  'task.comment',
  'task.create',
  'task.delete',
  'task.reassign',
  'task.update',
  'work.update'
)
WHERE roles.name = 'PROGRAM_MANAGER'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
JOIN permissions ON permissions.key IN (
  'project.lead',
  'work.update'
)
WHERE roles.name = 'PROJECT_MANAGER'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
JOIN permissions ON permissions.key IN (
  'customer.manage',
  'customer.read',
  'customer_success.view',
  'dashboard.view',
  'executive.view',
  'notification.read',
  'project.read'
)
WHERE roles.name = 'CUSTOMER_SUCCESS_MANAGER'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
JOIN permissions ON permissions.key IN (
  'customer.manage',
  'customer.read',
  'dashboard.view',
  'notification.read',
  'project.read'
)
WHERE roles.name = 'SALES'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
JOIN permissions ON permissions.key IN (
  'customer.read',
  'program.view'
)
WHERE roles.name = 'EXECUTIVE'
ON CONFLICT (role_id, permission_id) DO NOTHING;
