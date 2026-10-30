export enum UserRole {
  PlatformAdmin = 'PLATFORM_ADMIN',
  Admin = 'ADMIN',
  PortfolioManager = 'PORTFOLIO_MANAGER',
  ProgramManager = 'PROGRAM_MANAGER',
  ProjectManager = 'PROJECT_MANAGER',
  CustomerSuccessManager = 'CUSTOMER_SUCCESS_MANAGER',
  Executive = 'EXECUTIVE',
  Sales = 'SALES',
  TeamMember = 'TEAM_MEMBER',
  Partner = 'PARTNER',
  Customer = 'CUSTOMER',
  ServiceUser = 'SERVICE_USER',
}

export const canonicalUserRoles = Object.freeze(Object.values(UserRole));

export const userRoleDescriptions = Object.freeze({
  [UserRole.PlatformAdmin]: 'Complete platform administration',
  [UserRole.Admin]: 'Workspace administration without sign-in settings',
  [UserRole.PortfolioManager]:
    'Portfolio management and cross-project visibility',
  [UserRole.ProgramManager]: 'Delivery responsibility across a set of projects',
  [UserRole.ProjectManager]: 'Full management of assigned projects',
  [UserRole.CustomerSuccessManager]:
    'Post-sale owner of customers and linked project health',
  [UserRole.Executive]: 'Read-only dashboards and portfolio reporting',
  [UserRole.Sales]: 'Commercial owner of customers',
  [UserRole.TeamMember]: 'Assigned project delivery team member',
  [UserRole.Customer]: 'Read-only assigned project visibility',
  [UserRole.Partner]: 'Restricted assigned project collaboration',
  [UserRole.ServiceUser]: 'External API service identity',
} satisfies Record<UserRole, string>);
