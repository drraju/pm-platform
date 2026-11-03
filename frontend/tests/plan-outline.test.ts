import { describe, expect, it } from "vitest";
import { describePlanDrop, outlinePlan, reorderPlanSiblings } from "@/features/work/plan-outline";

const tasks = [
  { id: "child-b", parentTaskId: "container", sequenceNumber: 2, title: "Second" },
  { id: "container", sequenceNumber: 1, title: "Container" },
  { id: "child-a", parentTaskId: "container", sequenceNumber: 1, title: "First" },
  { id: "loose", title: "Loose" },
];

describe("plan outline", () => {
  it("indents children under their container in sibling order", () => {
    expect(outlinePlan(tasks).map((row) => [row.depth, row.task.title])).toEqual([
      [0, "Container"],
      [1, "First"],
      [1, "Second"],
      [0, "Loose"],
    ]);
  });

  it("reorders siblings and leaves another parent alone", () => {
    expect(reorderPlanSiblings(tasks, "child-b", "child-a")).toEqual([
      { id: "child-b", sequenceNumber: 1 },
      { id: "child-a", sequenceNumber: 2 },
    ]);
    expect(reorderPlanSiblings(tasks, "loose", "child-a")).toEqual([]);
  });

  it("moves a task under a different task and rejects a cycle or a milestone", () => {
    const rows = [
      ...tasks,
      { id: "mark", taskKind: "milestone", title: "Gate" },
      { id: "other", taskKind: "standard", title: "Other" },
    ];
    expect(describePlanDrop(rows, "child-a", "other")).toEqual({
      parentTaskId: "other",
      type: "reparent",
    });
    expect(describePlanDrop(rows, "container", "child-a").type).toBe("invalid");
    expect(describePlanDrop(rows, "child-a", "mark")).toEqual({
      message: "A gate cannot contain other rows.",
      type: "invalid",
    });
    expect(describePlanDrop(rows, "child-b", "child-a").type).toBe("reorder");
  });
});
