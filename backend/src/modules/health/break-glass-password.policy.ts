const developmentFallbackPassword = 'admin';

export function assertBreakGlassPasswordPolicy(
  environment: NodeJS.ProcessEnv = process.env,
): void {
  const password = environment.SEED_SUPER_ADMIN_PASSWORD ?? developmentFallbackPassword;
  if (password !== developmentFallbackPassword) {
    return;
  }
  if (environment.PM_ALLOW_INSECURE_BOOTSTRAP === 'true') {
    return;
  }
  if (environment.NODE_ENV !== 'production') {
    return;
  }

  throw new Error(
    'Refusing to boot while the break-glass password is the development fallback. Set SEED_SUPER_ADMIN_PASSWORD, or PM_ALLOW_INSECURE_BOOTSTRAP=true for local development only.',
  );
}
