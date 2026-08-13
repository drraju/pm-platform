import { describe, expect, it } from "vitest";
import { includeTaskAncestors } from "@/lib/tasks/include-task-ancestors";
import type { ApiTask } from "@/lib/api/client";

function task(partial: Partial<ApiTask> & Pick<ApiTask, "id" | "title">): ApiTask {
  return {
    priority: "medium",
    projectId: "project-1",
    status: "in_progress",
    ...partial,
  } as ApiTask;
}

describe("includeTaskAncestors", () => {
  it("keeps summary ancestors so hierarchical lists can render nested matches", () => {
    const summary = task({
      id: "summary-1",
      taskKind: "summary",
      title: "Package",
    });
    const child = task({
      id: "child-1",
      parentTaskId: "summary-1",
      title: "Leaf work",
    });
    const sibling = task({
      id: "child-2",
      parentTaskId: "summary-1",
      title: "Other leaf",
    });

    expect(includeTaskAncestors([summary, child, sibling], [child])).toEqual([
      summary,
      child,
    ]);
  });

  it("walks multi-level ancestors without inventing missing parents", () => {
    const root = task({
      id: "root",
      taskKind: "summary",
      title: "Root",
    });
    const mid = task({
      id: "mid",
      parentTaskId: "root",
      taskKind: "summary",
      title: "Mid",
    });
    const leaf = task({
      id: "leaf",
      parentTaskId: "mid",
      title: "Leaf",
    });
    const orphan = task({
      id: "orphan",
      parentTaskId: "missing",
      title: "Orphan",
    });

    expect(includeTaskAncestors([root, mid, leaf, orphan], [leaf, orphan])).toEqual([
      root,
      mid,
      leaf,
      orphan,
    ]);
  });

  it("can preserve the caller's task order while inserting ancestors first", () => {
    const root = task({
      id: "root",
      taskKind: "summary",
      title: "Root",
    });
    const low = task({
      id: "low",
      parentTaskId: "root",
      title: "Low priority",
    });
    const high = task({
      id: "high",
      parentTaskId: "root",
      title: "High priority",
    });

    expect(
      includeTaskAncestors([root, low, high], [high, low], {
        preserveTaskOrder: true,
      }),
    ).toEqual([root, high, low]);
  });
});
