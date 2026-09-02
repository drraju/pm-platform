import { UserIdentityType } from '../enums/user-identity-type.enum';
import { UserRole } from '../enums/user-role.enum';
import { isUserIdentityRoleAssignmentAllowed } from './user-identity-role-policy';

const humanRoles = [
  UserRole.PlatformAdmin,
  UserRole.PortfolioManager,
  UserRole.ProjectManager,
  UserRole.TeamMember,
  UserRole.Executive,
  UserRole.Customer,
  UserRole.Partner,
];

describe('user identity role policy', () => {
  it.each(humanRoles)('allows HUMAN identity with %s', (roleName) => {
    expect(
      isUserIdentityRoleAssignmentAllowed(UserIdentityType.Human, roleName),
    ).toBe(true);
  });

  it.each([
    UserRole.PlatformAdmin,
    UserRole.Executive,
    UserRole.PortfolioManager,
  ])('rejects SERVICE identity with %s', (roleName) => {
    expect(
      isUserIdentityRoleAssignmentAllowed(UserIdentityType.Service, roleName),
    ).toBe(false);
  });

  it('allows SERVICE identity only with SERVICE_USER', () => {
    expect(
      isUserIdentityRoleAssignmentAllowed(
        UserIdentityType.Service,
        UserRole.ServiceUser,
      ),
    ).toBe(true);
    expect(
      isUserIdentityRoleAssignmentAllowed(
        UserIdentityType.Human,
        UserRole.ServiceUser,
      ),
    ).toBe(false);
  });
});
