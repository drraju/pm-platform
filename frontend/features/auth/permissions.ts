const permissionAliases: Record<string, string[]> = {
  "dashboard.view": ["dashboard:read:self"],
  "executive.view": ["executive:summary:read"],
  "portfolio.view": ["portfolio:summary:read"],
  "project.create": ["projects:create"],
  "project.delete": ["projects:delete"],
  "project.read": ["projects:read:all", "projects:read:assigned"],
  "project.team.manage": ["project-members:manage"],
  "project.update": ["projects:update"],
  "raid.create": ["raid:create"],
  "raid.delete": ["raid:delete"],
  "raid.read": ["raid:read:all", "raid:read:assigned"],
  "raid.update": ["raid:update:any", "raid:update:own"],
  "role.manage": ["roles:manage"],
  "permission.manage": ["roles:manage"],
  "task.comment": ["project-tasks:update:any", "project-tasks:update:own"],
  "task.create": ["project-tasks:create"],
  "task.delete": ["project-tasks:delete"],
  "task.reassign": ["project-tasks:update:any", "project-tasks:update:own"],
  "task.update": ["project-tasks:update:any", "project-tasks:update:own"],
  "user.manage": ["users:manage"],
};

export function hasPermission(permissionKeys: string[], requiredPermission: string) {
  const grantedPermissions = new Set(permissionKeys);
  if (grantedPermissions.has(requiredPermission)) {
    return true;
  }

  return (permissionAliases[requiredPermission] ?? []).some((alias) =>
    grantedPermissions.has(alias),
  );
}

export function hasAnyPermission(
  permissionKeys: string[],
  requiredPermissions: string[],
) {
  return requiredPermissions.some((permission) =>
    hasPermission(permissionKeys, permission),
  );
}
