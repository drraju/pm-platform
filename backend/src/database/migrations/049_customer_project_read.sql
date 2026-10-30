INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
JOIN permissions ON permissions.key = 'project.read'
WHERE roles.name = 'CUSTOMER'
ON CONFLICT (role_id, permission_id) DO NOTHING;

DELETE FROM role_permissions
USING roles, permissions
WHERE role_permissions.role_id = roles.id
  AND role_permissions.permission_id = permissions.id
  AND roles.name = 'CUSTOMER'
  AND permissions.key <> 'project.read';
