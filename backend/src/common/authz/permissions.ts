export const PERMISSIONS_KEY = 'permissions';

export const PermissionKey = {
  ProjectTeamManage: 'project.team.manage',
  TaskCreate: 'task.create',
  TaskUpdate: 'task.update',
  TaskDelete: 'task.delete',
  TaskReassign: 'task.reassign',
  TaskComment: 'task.comment',
} as const;

export type PermissionKey = (typeof PermissionKey)[keyof typeof PermissionKey];
