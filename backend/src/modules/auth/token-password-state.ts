export type TokenPasswordState = {
  iat?: number;
  passwordChangedAt?: string | null;
};

export function isTokenCurrentForPasswordState(
  token: TokenPasswordState,
  currentPasswordChangedAt?: Date | null,
  requireExactState = false,
): boolean {
  if (token.passwordChangedAt !== undefined) {
    return (
      token.passwordChangedAt ===
      (currentPasswordChangedAt?.toISOString() ?? null)
    );
  }

  if (requireExactState) {
    return false;
  }

  return (
    !currentPasswordChangedAt ||
    Boolean(token.iat && token.iat * 1000 >= currentPasswordChangedAt.getTime())
  );
}
