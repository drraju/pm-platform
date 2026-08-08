import { beforeEach, describe, expect, it } from "vitest";
import { TodayExpansionStateManager } from "@/components/today/today-expansion-state";

describe("TodayExpansionStateManager", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("defaults to fully collapsed", () => {
    const manager = new TodayExpansionStateManager("project-1");
    expect(manager.isExpanded("summary-1")).toBe(false);
    expect(manager.getExpandedTaskIds()).toEqual([]);
  });

  it("persists expanded packages", () => {
    const manager = new TodayExpansionStateManager("project-1");
    manager.expand("summary-1");
    manager.flushPersistence();

    const restored = new TodayExpansionStateManager("project-1");
    expect(restored.isExpanded("summary-1")).toBe(true);

    restored.collapseAll();
    restored.flushPersistence();
    expect(
      window.localStorage.getItem(
        "pm-platform.todayWorkspace.expandedSummaryIds.project-1",
      ),
    ).toBeNull();
  });
});
