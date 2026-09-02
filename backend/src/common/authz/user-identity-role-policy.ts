import { UserIdentityType } from '../enums/user-identity-type.enum';
import { UserRole } from '../enums/user-role.enum';

export function isUserIdentityRoleAssignmentAllowed(
  identityType: UserIdentityType,
  roleName: UserRole,
): boolean {
  if (identityType === UserIdentityType.Service) {
    return roleName === UserRole.ServiceUser;
  }

  return roleName !== UserRole.ServiceUser;
}
