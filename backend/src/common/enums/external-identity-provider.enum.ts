export enum ExternalIdentityProvider {
  Google = 'GOOGLE',
}

export const externalIdentityProviders = Object.freeze(
  Object.values(ExternalIdentityProvider),
);
