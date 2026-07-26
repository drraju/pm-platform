export enum UserRole {
  PlatformAdmin = 'PLATFORM_ADMIN',
  PortfolioManager = 'PORTFOLIO_MANAGER',
  ProjectManager = 'PROJECT_MANAGER',
  TeamMember = 'TEAM_MEMBER',
  Executive = 'EXECUTIVE',
  Customer = 'CUSTOMER',
  Partner = 'PARTNER',
}

export const canonicalUserRoles = Object.freeze(Object.values(UserRole));

export const userRoleDescriptions = Object.freeze({
  [UserRole.PlatformAdmin]: 'Complete platform administration',
  [UserRole.PortfolioManager]:
    'Portfolio management and cross-project visibility',
  [UserRole.ProjectManager]: 'Full management of assigned projects',
  [UserRole.TeamMember]: 'Assigned project delivery team member',
  [UserRole.Executive]: 'Read-only dashboards and portfolio reporting',
  [UserRole.Customer]: 'Read-only assigned project visibility',
  [UserRole.Partner]: 'Restricted assigned project collaboration',
} satisfies Record<UserRole, string>);
