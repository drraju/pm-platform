import { UserIdentityType } from '../enums/user-identity-type.enum';
import { UserRole } from '../enums/user-role.enum';

export function isUserIdentityRoleAssignmentAllowed(
  identityType: UserIdentityType,
  roleName: UserRole | string | null | undefined,
): boolean {
  if (identityType === UserIdentityType.Service) {
    return (
      Boolean(roleName) && String(roleName) === String(UserRole.ServiceUser)
    );
  }

  return (
    identityType === UserIdentityType.Human &&
    String(roleName) !== String(UserRole.ServiceUser)
  );
}

export function isUserAuthenticationStatusAllowed(
  identityType: UserIdentityType,
  status: string,
): boolean {
  if (identityType === UserIdentityType.Service) {
    return status === 'active';
  }

  return (
    identityType === UserIdentityType.Human &&
    ['active', 'first_login_pending'].includes(status)
  );
}
