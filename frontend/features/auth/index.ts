"use client";

import { useEffect, useMemo, useState } from "react";
import {
  clearSession,
  getAuthProfile,
  getStoredAccessToken,
  login,
  register,
  storeSession,
  type ApiAuthProfile,
} from "@/lib/api/client";

export {
  clearSession,
  getAuthProfile,
  getStoredAccessToken,
  login,
  register,
  storeSession,
};
export type { ApiAuthProfile };

export function useAuthorization(requiredPermissions: string[] = []) {
  const [profile, setProfile] = useState<ApiAuthProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      if (!getStoredAccessToken()) {
        setProfile(null);
        setIsLoading(false);
        return;
      }

      setError(null);
      setIsLoading(true);
      try {
        setProfile(await getAuthProfile());
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load authorization profile",
        );
        setProfile(null);
      } finally {
        setIsLoading(false);
      }
    }

    void loadProfile();
  }, []);

  const permissions = useMemo(
    () => new Set(profile?.permissions ?? []),
    [profile?.permissions],
  );
  const hasPermission = (permission: string) => permissions.has(permission);
  const hasAnyPermission = (required: string[]) =>
    required.some((permission) => permissions.has(permission));
  const isAuthorized =
    requiredPermissions.length === 0 || hasAnyPermission(requiredPermissions);

  return {
    error,
    hasAnyPermission,
    hasPermission,
    isAuthorized,
    isLoading,
    profile,
  };
}
