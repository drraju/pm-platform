const STORAGE_PREFIX = "pm-platform.workspace.";

export function readPersistedWorkspaceState<T extends Record<string, unknown>>(
  key: string,
  fallback: T,
): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as Partial<T>;
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

export function writePersistedWorkspaceState<T extends Record<string, unknown>>(
  key: string,
  value: T,
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      `${STORAGE_PREFIX}${key}`,
      JSON.stringify(value),
    );
  } catch {
    // Ignore quota / private-mode failures; UI still works without persistence.
  }
}
