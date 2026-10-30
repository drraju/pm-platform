export function resolveCorsOrigins(
  configuredOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000',
): string[] {
  const origins = new Set<string>([configuredOrigin]);
  try {
    const url = new URL(configuredOrigin);
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      const alternateHost =
        url.hostname === 'localhost' ? '127.0.0.1' : 'localhost';
      origins.add(
        `${url.protocol}//${alternateHost}${url.port ? `:${url.port}` : ''}`,
      );
    }
  } catch {
    return [configuredOrigin];
  }
  return [...origins];
}
