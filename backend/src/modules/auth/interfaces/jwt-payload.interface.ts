import { UserIdentityType } from '../../../common/enums/user-identity-type.enum';

export interface JwtPayload {
  email: string;
  identityType: UserIdentityType;
  iat?: number;
  passwordChangedAt?: string | null;
  roleId: string;
  sub: string;
  tokenType: 'access' | 'refresh';
}
