INSERT INTO permissions (key, description)
VALUES
  ('skill.create', 'Create enterprise skills'),
  ('skill.read', 'Read enterprise skills'),
  ('skill.update', 'Update enterprise skills'),
  ('skill.archive', 'Archive enterprise skills'),
  ('resource.skill.create', 'Create resource skill associations'),
  ('resource.skill.read', 'Read resource skill associations'),
  ('resource.skill.update', 'Update resource skill associations'),
  ('resource.skill.archive', 'Archive resource skill associations')
ON CONFLICT (key) DO UPDATE
SET description = EXCLUDED.description,
    updated_at = now();

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
JOIN permissions ON permissions.key IN (
  'skill.create',
  'skill.read',
  'skill.update',
  'skill.archive',
  'resource.skill.create',
  'resource.skill.read',
  'resource.skill.update',
  'resource.skill.archive'
)
WHERE roles.name IN ('SUPER_ADMIN', 'Admin')
ON CONFLICT (role_id, permission_id) DO NOTHING;
