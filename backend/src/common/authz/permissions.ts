export const PERMISSIONS_KEY = 'permissions';
export const ANY_PERMISSIONS_KEY = 'anyPermissions';

export const PermissionKey = {
  DashboardView: 'dashboard.view',
  ExecutiveView: 'executive.view',
  IntegrationManage: 'integration.manage',
  NotificationManage: 'notification.manage',
  NotificationRead: 'notification.read',
  PermissionManage: 'permission.manage',
  PortfolioView: 'portfolio.view',
  ProjectCreate: 'project.create',
  ProjectDelete: 'project.delete',
  ProjectRead: 'project.read',
  ProjectTeamManage: 'project.team.manage',
  ProjectUpdate: 'project.update',
  RaidCreate: 'raid.create',
  RaidDelete: 'raid.delete',
  RaidRead: 'raid.read',
  RaidUpdate: 'raid.update',
  RoleManage: 'role.manage',
  TaskCreate: 'task.create',
  TaskUpdate: 'task.update',
  TaskDelete: 'task.delete',
  TaskReassign: 'task.reassign',
  TaskComment: 'task.comment',
  UserManage: 'user.manage',
} as const;

export type PermissionKey = (typeof PermissionKey)[keyof typeof PermissionKey];
