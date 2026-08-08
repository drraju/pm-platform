"use client";

import { useSyncExternalStore } from "react";
import {
  getStoredPermissionKeys,
  getStoredRoleNames,
  subscribeAuthSessionChange,
} from "@/lib/api/client";

export type StoredAuthSession = {
  permissionKeys: string[];
  roleNames: string[];
};

let cachedSession: StoredAuthSession = readSession();

function readSession(): StoredAuthSession {
  return {
    permissionKeys: getStoredPermissionKeys(),
    roleNames: getStoredRoleNames(),
  };
}

function getSnapshot(): StoredAuthSession {
  return cachedSession;
}

function getServerSnapshot(): StoredAuthSession {
  return {
    permissionKeys: [],
    roleNames: [],
  };
}

function subscribe(listener: () => void) {
  cachedSession = readSession();
  return subscribeAuthSessionChange(() => {
    cachedSession = readSession();
    listener();
  });
}

export function useStoredAuthSession(): StoredAuthSession {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
