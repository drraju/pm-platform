export interface JwtPayload {
  email: string;
  iat?: number;
  roleId: string;
  sub: string;
}
