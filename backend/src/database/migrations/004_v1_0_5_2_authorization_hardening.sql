-- v1.0.5.2 Authorization Hardening
-- Keep /users administrative while removing the temporary delivery-role
-- escalation that was used to unblock project assignment screens during testing.

DELETE FROM role_permissions
USING roles, permissions
WHERE role_permissions.role_id = roles.id
  AND role_permissions.permission_id = permissions.id
  AND permissions.key = 'user.manage'
  AND roles.name IN (
    'Program Manager',
    'Project Manager',
    'Delivery Lead',
    'Team Member',
    'Executive',
    'Customer',
    'Partner'
  );
