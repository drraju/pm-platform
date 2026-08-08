import { describe, expect, it } from "vitest";
import {
  findAdjacentColumn,
  findAdjacentEditableTaskId,
  findAdjacentWorkPackageId,
  findOwningWorkPackageId,
  getEditableTaskIds,
  getPreferredFocusColumn,
  getWorkPackageIds,
  resolveInheritedUpdateNotes,
} from "@/components/today/today-grid-navigation";

describe("today-grid-navigation", () => {
  const rows = [
    { hasChildren: true, task: { id: "pkg-1", taskKind: "summary" } },
    { hasChildren: false, task: { id: "task-1", taskKind: "standard" } },
    { hasChildren: false, task: { id: "task-2", taskKind: "standard" } },
    { hasChildren: true, task: { id: "pkg-2", taskKind: "summary" } },
    { hasChildren: false, task: { id: "task-3", taskKind: "standard" } },
  ];

  it("lists only editable child tasks", () => {
    expect(getEditableTaskIds(rows)).toEqual(["task-1", "task-2", "task-3"]);
  });

  it("moves vertically across editable tasks and skips summaries", () => {
    expect(findAdjacentEditableTaskId(["task-1", "task-2", "task-3"], "task-1", 1)).toBe(
      "task-2",
    );
    expect(findAdjacentEditableTaskId(["task-1", "task-2", "task-3"], "task-2", -1)).toBe(
      "task-1",
    );
  });

  it("moves horizontally across editable columns", () => {
    expect(findAdjacentColumn("updateNotes", 1)).toBe("nextStep");
    expect(findAdjacentColumn("status", -1)).toBeNull();
    expect(findAdjacentColumn("nextOwner", 1)).toBeNull();
    expect(findAdjacentColumn("blocked" as never, 1)).toBeNull();
  });

  it("navigates work packages and resolves ownership", () => {
    expect(getWorkPackageIds(rows)).toEqual(["pkg-1", "pkg-2"]);
    expect(findOwningWorkPackageId(rows, "task-2")).toBe("pkg-1");
    expect(findAdjacentWorkPackageId(["pkg-1", "pkg-2"], "pkg-1", 1)).toBe(
      "pkg-2",
    );
  });

  it("prefers Next Step focus when Today's Update already has text", () => {
    expect(
      getPreferredFocusColumn({
        latestExecutionUpdate: { updateNotes: "Done with vendor", nextStep: "Chase PO" },
      }),
    ).toBe("nextStep");
    expect(
      getPreferredFocusColumn({
        latestExecutionUpdate: { updateNotes: null, nextStep: "Chase PO" },
      }),
    ).toBe("updateNotes");
  });

  it("inherits previous Next Step into empty Today's Update without overwriting", () => {
    expect(
      resolveInheritedUpdateNotes({
        latestExecutionUpdate: {
          nextStep: "Prepare cutover checklist",
          updateNotes: null,
        },
      }),
    ).toEqual({
      displayValue: "Prepare cutover checklist",
      inheritedFromNextStep: "Prepare cutover checklist",
      isInherited: true,
    });

    expect(
      resolveInheritedUpdateNotes({
        latestExecutionUpdate: {
          nextStep: "Prepare cutover checklist",
          updateNotes: "Already typed today",
        },
      }),
    ).toEqual({
      displayValue: "Already typed today",
      inheritedFromNextStep: null,
      isInherited: false,
    });
  });
});
