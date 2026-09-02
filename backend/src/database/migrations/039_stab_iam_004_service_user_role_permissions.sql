INSERT INTO roles (name, description)
VALUES ('SERVICE_USER', 'External API service identity')
ON CONFLICT (name) DO UPDATE
SET description = EXCLUDED.description,
    updated_at = now();

INSERT INTO permissions (key, description)
VALUES
  ('external.api.access', 'Access the external API'),
  ('external.project.read', 'Read projects through the external API'),
  ('external.task.read', 'Read tasks through the external API'),
  ('external.raid.read', 'Read risks and issues through the external API')
ON CONFLICT (key) DO UPDATE
SET description = EXCLUDED.description,
    updated_at = now();

DELETE FROM role_permissions
USING roles
WHERE role_permissions.role_id = roles.id
  AND roles.name = 'SERVICE_USER';

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
JOIN permissions ON permissions.key IN (
  'external.api.access',
  'external.project.read',
  'external.task.read',
  'external.raid.read'
)
WHERE roles.name = 'SERVICE_USER'
ON CONFLICT (role_id, permission_id) DO NOTHING;
