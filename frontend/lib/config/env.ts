function getLocalApiBaseUrl() {
  if (typeof window !== "undefined" && window.location.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:3001`;
  }

  return "http://localhost:3001";
}

export const DEFAULT_API_TIMEOUT_MS = 60_000;
export const DEFAULT_API_EXPORT_TIMEOUT_MS = 120_000;

function getPositiveTimeout(value: string | undefined, fallback: number) {
  const timeout = Number(value);

  return Number.isFinite(timeout) && timeout > 0 ? timeout : fallback;
}

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL || getLocalApiBaseUrl();

export const apiTimeoutMs = getPositiveTimeout(
  process.env.NEXT_PUBLIC_API_TIMEOUT_MS,
  DEFAULT_API_TIMEOUT_MS,
);

export const apiExportTimeoutMs = getPositiveTimeout(
  process.env.NEXT_PUBLIC_API_EXPORT_TIMEOUT_MS,
  DEFAULT_API_EXPORT_TIMEOUT_MS,
);
