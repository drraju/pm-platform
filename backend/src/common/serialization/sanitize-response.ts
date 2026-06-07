const blockedResponseKeys = new Set(['password', 'passwordHash']);

export function sanitizeResponse<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeResponse(item)) as T;
  }

  if (!value || typeof value !== 'object' || value instanceof Date) {
    return value;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, childValue] of Object.entries(value)) {
    if (blockedResponseKeys.has(key)) {
      continue;
    }

    sanitized[key] = sanitizeResponse(childValue);
  }

  return sanitized as T;
}
