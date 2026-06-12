CREATE EXTENSION IF NOT EXISTS "pgcrypto";

INSERT INTO permissions (key, description)
VALUES
  ('dashboard.view', 'View personal dashboard'),
  ('executive.view', 'View executive dashboard and reports'),
  ('integration.manage', 'Manage external integrations'),
  ('notification.manage', 'Manage notifications'),
  ('notification.read', 'Read notifications'),
  ('permission.manage', 'Manage role permissions'),
  ('portfolio.view', 'View portfolio reporting'),
  ('project.create', 'Create projects'),
  ('project.delete', 'Delete projects'),
  ('project.read', 'Read projects'),
  ('project.team.manage', 'Manage project team membership'),
  ('project.update', 'Update projects'),
  ('raid.create', 'Create RAID items'),
  ('raid.delete', 'Delete RAID items'),
  ('raid.read', 'Read RAID items'),
  ('raid.update', 'Update RAID items'),
  ('role.manage', 'Manage roles'),
  ('task.comment', 'Update task remarks'),
  ('task.create', 'Create project tasks'),
  ('task.delete', 'Delete project tasks'),
  ('task.reassign', 'Reassign project tasks'),
  ('task.update', 'Update project tasks'),
  ('user.manage', 'Manage users')
ON CONFLICT (key) DO UPDATE
SET description = EXCLUDED.description,
    updated_at = now();

INSERT INTO roles (name, description)
VALUES
  ('SUPER_ADMIN', 'Unrestricted platform administrator'),
  ('Admin', 'Platform administration role'),
  ('Program Manager', 'Programme-level delivery management'),
  ('Project Manager', 'Project-level delivery management'),
  ('Delivery Lead', 'Delivery leadership across assigned projects'),
  ('Team Member', 'Assigned delivery team member'),
  ('Executive', 'Executive reporting and portfolio visibility'),
  ('Customer', 'Customer stakeholder access'),
  ('Partner', 'Partner contributor access')
ON CONFLICT (name) DO NOTHING;

WITH permission_map(legacy_key, new_key) AS (
  VALUES
    ('dashboard:read:self', 'dashboard.view'),
    ('executive:summary:read', 'executive.view'),
    ('portfolio:summary:read', 'portfolio.view'),
    ('project-members:manage', 'project.team.manage'),
    ('projects:create', 'project.create'),
    ('projects:delete', 'project.delete'),
    ('projects:read:all', 'project.read'),
    ('projects:read:assigned', 'project.read'),
    ('projects:update', 'project.update'),
    ('project-tasks:create', 'task.create'),
    ('project-tasks:delete', 'task.delete'),
    ('project-tasks:update:any', 'task.update'),
    ('project-tasks:update:own', 'task.update'),
    ('project-tasks:update:any', 'task.reassign'),
    ('project-tasks:update:own', 'task.reassign'),
    ('project-tasks:update:any', 'task.comment'),
    ('project-tasks:update:own', 'task.comment'),
    ('raid:create', 'raid.create'),
    ('raid:delete', 'raid.delete'),
    ('raid:read:all', 'raid.read'),
    ('raid:read:assigned', 'raid.read'),
    ('raid:update:any', 'raid.update'),
    ('raid:update:own', 'raid.update'),
    ('roles:manage', 'role.manage'),
    ('roles:manage', 'permission.manage'),
    ('users:manage', 'user.manage')
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT DISTINCT rp.role_id, new_permission.id
FROM role_permissions rp
JOIN permissions legacy_permission ON legacy_permission.id = rp.permission_id
JOIN permission_map ON permission_map.legacy_key = legacy_permission.key
JOIN permissions new_permission ON new_permission.key = permission_map.new_key
ON CONFLICT (role_id, permission_id) DO NOTHING;

WITH role_permission_seed(role_name, permission_key) AS (
  VALUES
    ('Program Manager', 'dashboard.view'),
    ('Program Manager', 'executive.view'),
    ('Program Manager', 'portfolio.view'),
    ('Program Manager', 'project.create'),
    ('Program Manager', 'project.read'),
    ('Program Manager', 'project.team.manage'),
    ('Program Manager', 'project.update'),
    ('Program Manager', 'raid.create'),
    ('Program Manager', 'raid.read'),
    ('Program Manager', 'raid.update'),
    ('Program Manager', 'task.comment'),
    ('Program Manager', 'task.create'),
    ('Program Manager', 'task.delete'),
    ('Program Manager', 'task.reassign'),
    ('Program Manager', 'task.update'),
    ('Program Manager', 'notification.read'),

    ('Project Manager', 'dashboard.view'),
    ('Project Manager', 'project.create'),
    ('Project Manager', 'project.delete'),
    ('Project Manager', 'project.read'),
    ('Project Manager', 'project.team.manage'),
    ('Project Manager', 'project.update'),
    ('Project Manager', 'raid.create'),
    ('Project Manager', 'raid.delete'),
    ('Project Manager', 'raid.read'),
    ('Project Manager', 'raid.update'),
    ('Project Manager', 'task.comment'),
    ('Project Manager', 'task.create'),
    ('Project Manager', 'task.delete'),
    ('Project Manager', 'task.reassign'),
    ('Project Manager', 'task.update'),
    ('Project Manager', 'notification.read'),

    ('Delivery Lead', 'dashboard.view'),
    ('Delivery Lead', 'project.read'),
    ('Delivery Lead', 'project.team.manage'),
    ('Delivery Lead', 'project.update'),
    ('Delivery Lead', 'raid.create'),
    ('Delivery Lead', 'raid.read'),
    ('Delivery Lead', 'raid.update'),
    ('Delivery Lead', 'task.comment'),
    ('Delivery Lead', 'task.create'),
    ('Delivery Lead', 'task.delete'),
    ('Delivery Lead', 'task.reassign'),
    ('Delivery Lead', 'task.update'),
    ('Delivery Lead', 'notification.read'),

    ('Team Member', 'dashboard.view'),
    ('Team Member', 'project.read'),
    ('Team Member', 'raid.create'),
    ('Team Member', 'raid.read'),
    ('Team Member', 'raid.update'),
    ('Team Member', 'task.comment'),
    ('Team Member', 'task.reassign'),
    ('Team Member', 'task.update'),
    ('Team Member', 'notification.read'),

    ('Executive', 'dashboard.view'),
    ('Executive', 'executive.view'),
    ('Executive', 'portfolio.view'),
    ('Executive', 'project.read'),
    ('Executive', 'raid.read'),
    ('Executive', 'notification.read'),

    ('Customer', 'dashboard.view'),
    ('Customer', 'project.read'),
    ('Customer', 'raid.read'),
    ('Customer', 'notification.read'),

    ('Partner', 'dashboard.view'),
    ('Partner', 'project.read'),
    ('Partner', 'raid.read'),
    ('Partner', 'task.comment'),
    ('Partner', 'task.reassign'),
    ('Partner', 'task.update'),
    ('Partner', 'notification.read')
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM role_permission_seed
JOIN roles ON roles.name = role_permission_seed.role_name
JOIN permissions ON permissions.key = role_permission_seed.permission_key
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
CROSS JOIN permissions
WHERE roles.name IN ('SUPER_ADMIN', 'Admin')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO users (
  email,
  first_name,
  last_name,
  password_hash,
  role_id,
  status
)
SELECT
  'admin@example.com',
  'Super',
  'Admin',
  '$2b$10$/BQx.Mv5F6ShmB3JqGxcxOOZkn1uk5bAWhW2yeQwVja2B/KUKfcty',
  roles.id,
  'active'
FROM roles
WHERE roles.name = 'SUPER_ADMIN'
ON CONFLICT (email) DO UPDATE
SET first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    password_hash = EXCLUDED.password_hash,
    role_id = EXCLUDED.role_id,
    status = 'active',
    updated_at = now();
