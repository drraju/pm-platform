export enum UserIdentityType {
  Human = 'HUMAN',
  Service = 'SERVICE',
}

export const userIdentityTypes = Object.freeze(Object.values(UserIdentityType));
