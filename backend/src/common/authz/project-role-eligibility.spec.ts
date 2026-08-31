import { ProjectRole } from '../enums/project-role.enum';
import { UserRole } from '../enums/user-role.enum';
import { isProjectRoleEligible } from './project-role-eligibility';

describe('isProjectRoleEligible', () => {
  it.each([
    UserRole.PlatformAdmin,
    UserRole.PortfolioManager,
    UserRole.ProjectManager,
    UserRole.TeamMember,
  ])('preserves management-role eligibility for %s', (globalRole) => {
    expect(isProjectRoleEligible(globalRole, ProjectRole.Owner)).toBe(true);
    expect(isProjectRoleEligible(globalRole, ProjectRole.Manager)).toBe(true);
  });

  it.each([UserRole.Customer, UserRole.Partner])(
    'limits %s to non-management project roles',
    (globalRole) => {
      expect(isProjectRoleEligible(globalRole, ProjectRole.Owner)).toBe(false);
      expect(isProjectRoleEligible(globalRole, ProjectRole.Manager)).toBe(
        false,
      );
      expect(isProjectRoleEligible(globalRole, ProjectRole.Contributor)).toBe(
        true,
      );
      expect(isProjectRoleEligible(globalRole, ProjectRole.Viewer)).toBe(true);
    },
  );
});
