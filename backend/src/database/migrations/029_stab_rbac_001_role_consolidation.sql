CREATE EXTENSION IF NOT EXISTS "pgcrypto";

INSERT INTO roles (name, description)
VALUES
  ('PLATFORM_ADMIN', 'Complete platform administration'),
  ('PORTFOLIO_MANAGER', 'Portfolio management and cross-project visibility'),
  ('PROJECT_MANAGER', 'Full management of assigned projects'),
  ('TEAM_MEMBER', 'Assigned project delivery team member'),
  ('EXECUTIVE', 'Read-only dashboards and portfolio reporting'),
  ('CUSTOMER', 'Read-only assigned project visibility'),
  ('PARTNER', 'Restricted assigned project collaboration')
ON CONFLICT (name) DO UPDATE
SET description = EXCLUDED.description,
    updated_at = now();

WITH role_map(old_name, new_name) AS (
  VALUES
    ('SUPER_ADMIN', 'PLATFORM_ADMIN'),
    ('Admin', 'PLATFORM_ADMIN'),
    ('ADMIN', 'PLATFORM_ADMIN'),
    ('Program Manager', 'PORTFOLIO_MANAGER'),
    ('Portfolio Manager', 'PORTFOLIO_MANAGER'),
    ('Project Manager', 'PROJECT_MANAGER'),
    ('Delivery Lead', 'PROJECT_MANAGER'),
    ('Technical Lead', 'TEAM_MEMBER'),
    ('Engineer', 'TEAM_MEMBER'),
    ('QA Engineer', 'TEAM_MEMBER'),
    ('Team Member', 'TEAM_MEMBER'),
    ('Executive', 'EXECUTIVE'),
    ('Customer', 'CUSTOMER'),
    ('Partner', 'PARTNER')
),
resolved_roles AS (
  SELECT old_role.id AS old_role_id, new_role.id AS new_role_id
  FROM role_map
  JOIN roles old_role ON old_role.name = role_map.old_name
  JOIN roles new_role ON new_role.name = role_map.new_name
  WHERE old_role.id <> new_role.id
)
UPDATE users
SET role_id = resolved_roles.new_role_id,
    updated_at = now()
FROM resolved_roles
WHERE users.role_id = resolved_roles.old_role_id;

WITH role_map(old_name, new_name) AS (
  VALUES
    ('SUPER_ADMIN', 'PLATFORM_ADMIN'),
    ('Admin', 'PLATFORM_ADMIN'),
    ('ADMIN', 'PLATFORM_ADMIN'),
    ('Program Manager', 'PORTFOLIO_MANAGER'),
    ('Portfolio Manager', 'PORTFOLIO_MANAGER'),
    ('Project Manager', 'PROJECT_MANAGER'),
    ('Delivery Lead', 'PROJECT_MANAGER'),
    ('Technical Lead', 'TEAM_MEMBER'),
    ('Engineer', 'TEAM_MEMBER'),
    ('QA Engineer', 'TEAM_MEMBER'),
    ('Team Member', 'TEAM_MEMBER'),
    ('Executive', 'EXECUTIVE'),
    ('Customer', 'CUSTOMER'),
    ('Partner', 'PARTNER')
),
resolved_roles AS (
  SELECT old_role.id AS old_role_id, new_role.id AS new_role_id
  FROM role_map
  JOIN roles old_role ON old_role.name = role_map.old_name
  JOIN roles new_role ON new_role.name = role_map.new_name
  WHERE old_role.id <> new_role.id
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT DISTINCT resolved_roles.new_role_id, role_permissions.permission_id
FROM role_permissions
JOIN resolved_roles ON resolved_roles.old_role_id = role_permissions.role_id
ON CONFLICT (role_id, permission_id) DO NOTHING;

DELETE FROM role_permissions
WHERE role_id IN (
  SELECT id
  FROM roles
  WHERE name IN (
    'SUPER_ADMIN',
    'Admin',
    'ADMIN',
    'Program Manager',
    'Portfolio Manager',
    'Project Manager',
    'Delivery Lead',
    'Technical Lead',
    'Engineer',
    'QA Engineer',
    'Team Member',
    'Executive',
    'Customer',
    'Partner'
  )
);

DELETE FROM roles
WHERE name IN (
  'SUPER_ADMIN',
  'Admin',
  'ADMIN',
  'Program Manager',
  'Portfolio Manager',
  'Project Manager',
  'Delivery Lead',
  'Technical Lead',
  'Engineer',
  'QA Engineer',
  'Team Member',
  'Executive',
  'Customer',
  'Partner'
);
