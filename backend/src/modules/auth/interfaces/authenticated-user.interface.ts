import { UserIdentityType } from '../../../common/enums/user-identity-type.enum';

export interface AuthenticatedUser {
  email: string;
  identityType: UserIdentityType;
  roleId: string;
  userId: string;
}
