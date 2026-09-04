export enum AuthenticationMethod {
  Local = 'LOCAL',
  Google = 'GOOGLE',
}

export const authenticationMethods = Object.freeze(
  Object.values(AuthenticationMethod),
);

export type SessionAuthenticationContext = {
  authenticatedAt: number;
  authenticationMethod: AuthenticationMethod;
};
