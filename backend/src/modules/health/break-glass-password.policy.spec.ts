import { assertBreakGlassPasswordPolicy } from './break-glass-password.policy';

describe('assertBreakGlassPasswordPolicy', () => {
  it('refuses production boot while the seed password is the development fallback', () => {
    expect(() =>
      assertBreakGlassPasswordPolicy({
        NODE_ENV: 'production',
      }),
    ).toThrow(/break-glass password/);
  });

  it('allows production boot when the break-glass password was replaced', () => {
    expect(() =>
      assertBreakGlassPasswordPolicy({
        NODE_ENV: 'production',
        SEED_SUPER_ADMIN_PASSWORD: 'not-the-fallback',
      }),
    ).not.toThrow();
  });

  it('allows the fallback when local compose explicitly opts in', () => {
    expect(() =>
      assertBreakGlassPasswordPolicy({
        NODE_ENV: 'production',
        PM_ALLOW_INSECURE_BOOTSTRAP: 'true',
      }),
    ).not.toThrow();
  });

  it('allows the fallback outside production', () => {
    expect(() =>
      assertBreakGlassPasswordPolicy({
        NODE_ENV: 'test',
      }),
    ).not.toThrow();
  });
});
