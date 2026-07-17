import { describe, expect, it, vi } from "vitest";
import { PlanningExpansionStateManager } from "@/components/planning/planning-expansion-state";

describe("PlanningExpansionStateManager", () => {
  it("persists view state by workspace and restores it independently", () => {
    const storage = memoryStorage();
    const first = new PlanningExpansionStateManager(
      "persistence-project",
      storage,
    );

    first.collapse("summary-1");
    first.collapse("summary-2");
    first.expand("summary-1");
    first.flushPersistence();

    const restored = new PlanningExpansionStateManager(
      "persistence-project",
      storage,
    );
    const otherProject = new PlanningExpansionStateManager(
      "project-2",
      storage,
    );
    expect(restored.isCollapsed("summary-1")).toBe(false);
    expect(restored.isCollapsed("summary-2")).toBe(true);
    expect(otherProject.isCollapsed("summary-2")).toBe(false);
  });

  it("updates one affected node without synchronously rewriting storage", () => {
    const storage = memoryStorage();
    const manager = new PlanningExpansionStateManager("scale-project", storage);
    manager.collapseMany(
      Array.from({ length: 10_000 }, (_, index) => `summary-${index}`),
    );
    manager.flushPersistence();
    storage.setItem.mockClear();

    const startedAt = performance.now();
    manager.toggle("summary-5000");
    const operationDuration = performance.now() - startedAt;

    expect(manager.isCollapsed("summary-4999")).toBe(true);
    expect(manager.isCollapsed("summary-5000")).toBe(false);
    expect(manager.isCollapsed("summary-5001")).toBe(true);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(operationDuration).toBeLessThan(50);
    manager.flushPersistence();
    expect(storage.setItem).toHaveBeenCalledTimes(1);
  });
});

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
  };
}
