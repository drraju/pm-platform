"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";

/**
 * Today uses an expanded-set model so the default (empty set) is fully collapsed —
 * matching the standup workflow. Planning uses a collapsed-set (default expanded).
 */
const storagePrefix = "pm-platform.todayWorkspace.expandedSummaryIds";

type ExpansionStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">;

export type TodayExpansionSnapshot = {
  expandedTaskIds: readonly string[];
  version: number;
};

export class TodayExpansionStateManager {
  private readonly expandedTaskIds: Set<string>;
  private readonly listeners = new Set<() => void>();
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private snapshot: TodayExpansionSnapshot;

  constructor(
    private readonly workspaceId: string,
    private readonly storage: ExpansionStorage | null = browserStorage(),
  ) {
    this.expandedTaskIds = new Set(this.readPersistedIds());
    this.snapshot = {
      expandedTaskIds: [...this.expandedTaskIds],
      version: 0,
    };
  }

  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = () => this.snapshot;

  isExpanded(taskId: string) {
    return this.expandedTaskIds.has(taskId);
  }

  expand(taskId: string) {
    if (this.expandedTaskIds.has(taskId)) {
      return false;
    }
    this.expandedTaskIds.add(taskId);
    this.changed();
    return true;
  }

  expandMany(taskIds: Iterable<string>) {
    let changed = false;
    for (const taskId of taskIds) {
      if (!this.expandedTaskIds.has(taskId)) {
        this.expandedTaskIds.add(taskId);
        changed = true;
      }
    }
    if (changed) {
      this.changed();
    }
    return changed;
  }

  collapse(taskId: string) {
    if (!this.expandedTaskIds.delete(taskId)) {
      return false;
    }
    this.changed();
    return true;
  }

  collapseAll() {
    if (this.expandedTaskIds.size === 0) {
      return false;
    }
    this.expandedTaskIds.clear();
    this.changed();
    return true;
  }

  toggle(taskId: string) {
    return this.isExpanded(taskId)
      ? this.collapse(taskId)
      : this.expand(taskId);
  }

  getExpandedTaskIds() {
    return [...this.expandedTaskIds];
  }

  flushPersistence() {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    if (!this.storage) {
      return;
    }
    try {
      if (this.expandedTaskIds.size === 0) {
        this.storage.removeItem(this.storageKey());
      } else {
        this.storage.setItem(
          this.storageKey(),
          JSON.stringify([...this.expandedTaskIds]),
        );
      }
    } catch {
      // Best-effort view persistence.
    }
  }

  private changed() {
    this.snapshot = {
      expandedTaskIds: [...this.expandedTaskIds],
      version: this.snapshot.version + 1,
    };
    for (const listener of this.listeners) {
      listener();
    }
    this.schedulePersistence();
  }

  private schedulePersistence() {
    if (!this.storage || this.persistTimer) {
      return;
    }
    this.persistTimer = setTimeout(() => this.flushPersistence(), 50);
  }

  private readPersistedIds(): string[] {
    if (!this.storage) {
      return [];
    }
    try {
      const value = this.storage.getItem(this.storageKey());
      if (!value) {
        return [];
      }
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter(
            (taskId): taskId is string => typeof taskId === "string",
          )
        : [];
    } catch {
      return [];
    }
  }

  private storageKey() {
    return `${storagePrefix}.${this.workspaceId}`;
  }
}

export function useTodayExpansionState(workspaceId: string) {
  const manager = useMemo(
    () => new TodayExpansionStateManager(workspaceId),
    [workspaceId],
  );
  useSyncExternalStore(
    manager.subscribe,
    manager.getSnapshot,
    manager.getSnapshot,
  );
  useEffect(() => {
    const flush = () => manager.flushPersistence();
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      manager.flushPersistence();
    };
  }, [manager]);
  return manager;
}

function browserStorage(): ExpansionStorage | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
