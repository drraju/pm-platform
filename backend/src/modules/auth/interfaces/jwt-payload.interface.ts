import { UserIdentityType } from '../../../common/enums/user-identity-type.enum';
import { AuthenticationMethod } from '../authentication-method';

export interface JwtPayload {
  authenticatedAt: number;
  authenticationMethod: AuthenticationMethod;
  email: string;
  identityType: UserIdentityType;
  iat?: number;
  passwordChangedAt?: string | null;
  roleId: string;
  sub: string;
  tokenType: 'access' | 'refresh';
}

export type LegacyJwtPayload = Omit<
  JwtPayload,
  'authenticatedAt' | 'authenticationMethod'
> & {
  authenticatedAt?: undefined;
  authenticationMethod?: undefined;
};

export type CompatibleJwtPayload = JwtPayload | LegacyJwtPayload;
