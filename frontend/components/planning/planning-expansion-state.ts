"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";

const storagePrefix = "pm-platform.planningWorkspace.collapsedSummaryIds";

type ExpansionStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">;

export class PlanningExpansionStateManager {
  private readonly collapsedTaskIds: Set<string>;
  private readonly listeners = new Set<() => void>();
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private version = 0;

  constructor(
    private readonly workspaceId: string,
    private readonly storage: ExpansionStorage | null = browserStorage(),
  ) {
    this.collapsedTaskIds = new Set(this.readPersistedIds());
  }

  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = () => this.version;

  isCollapsed(taskId: string) {
    return this.collapsedTaskIds.has(taskId);
  }

  collapse(taskId: string) {
    if (this.collapsedTaskIds.has(taskId)) {
      return false;
    }
    this.collapsedTaskIds.add(taskId);
    this.changed();
    return true;
  }

  collapseMany(taskIds: Iterable<string>) {
    let changed = false;
    for (const taskId of taskIds) {
      if (!this.collapsedTaskIds.has(taskId)) {
        this.collapsedTaskIds.add(taskId);
        changed = true;
      }
    }
    if (changed) {
      this.changed();
    }
    return changed;
  }

  expand(taskId: string) {
    if (!this.collapsedTaskIds.delete(taskId)) {
      return false;
    }
    this.changed();
    return true;
  }

  expandMany(taskIds: Iterable<string>) {
    let changed = false;
    for (const taskId of taskIds) {
      changed = this.collapsedTaskIds.delete(taskId) || changed;
    }
    if (changed) {
      this.changed();
    }
    return changed;
  }

  toggle(taskId: string) {
    return this.isCollapsed(taskId)
      ? this.expand(taskId)
      : this.collapse(taskId);
  }

  getCollapsedTaskIds() {
    return this.collapsedTaskIds;
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
      if (this.collapsedTaskIds.size === 0) {
        this.storage.removeItem(this.storageKey());
      } else {
        this.storage.setItem(
          this.storageKey(),
          JSON.stringify([...this.collapsedTaskIds]),
        );
      }
    } catch {
      // View persistence is best-effort; planning remains fully usable.
    }
  }

  private changed() {
    this.version += 1;
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

export function usePlanningExpansionState(workspaceId: string) {
  const manager = useMemo(
    () => new PlanningExpansionStateManager(workspaceId),
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
