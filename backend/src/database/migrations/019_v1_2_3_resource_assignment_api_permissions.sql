INSERT INTO permissions (key, description)
VALUES
  ('resource.assignment.create', 'Create resource assignments'),
  ('resource.assignment.read', 'Read resource assignments'),
  ('resource.assignment.update', 'Update resource assignments'),
  ('resource.assignment.archive', 'Archive resource assignments')
ON CONFLICT (key) DO UPDATE
SET description = EXCLUDED.description,
    updated_at = now();

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
JOIN permissions ON permissions.key IN (
  'resource.assignment.create',
  'resource.assignment.read',
  'resource.assignment.update',
  'resource.assignment.archive'
)
WHERE roles.name IN ('SUPER_ADMIN', 'Admin')
ON CONFLICT (role_id, permission_id) DO NOTHING;
