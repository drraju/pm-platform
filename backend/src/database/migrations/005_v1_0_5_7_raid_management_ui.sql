INSERT INTO permissions (key, description)
VALUES ('raid.delete', 'Delete RAID items')
ON CONFLICT (key) DO UPDATE
SET description = EXCLUDED.description;

WITH role_permission_seed(role_name, permission_key) AS (
  VALUES
    ('Program Manager', 'raid.delete'),
    ('Project Manager', 'raid.delete')
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM role_permission_seed
JOIN roles ON roles.name = role_permission_seed.role_name
JOIN permissions ON permissions.key = role_permission_seed.permission_key
ON CONFLICT (role_id, permission_id) DO NOTHING;
