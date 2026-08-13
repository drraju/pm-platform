import { describe, expect, it } from "vitest";
import { includePersonalWorkContext } from "@/lib/tasks/personal-work-context";
import type { ApiTask } from "@/lib/api/client";

function task(partial: Partial<ApiTask> & Pick<ApiTask, "id" | "title">): ApiTask {
  return {
    priority: "medium",
    projectId: "project-1",
    status: "in_progress",
    taskKind: "standard",
    ...partial,
  } as ApiTask;
}

describe("includePersonalWorkContext", () => {
  it("includes direct children for a user assigned to a parent task", () => {
    const parent = task({
      assigneeId: "user-a",
      id: "task-a",
      title: "Task A",
    });
    const childOne = task({
      assigneeId: "user-b",
      id: "task-a-1",
      parentTaskId: parent.id,
      title: "Sub-task A1",
    });
    const childTwo = task({
      assigneeId: "user-c",
      id: "task-a-2",
      parentTaskId: parent.id,
      title: "Sub-task A2",
    });
    const unrelated = task({
      assigneeId: "user-d",
      id: "task-b",
      title: "Unrelated task",
    });

    expect(
      includePersonalWorkContext(
        [parent, childOne, childTwo, unrelated],
        [parent],
        "user-a",
      ).map((item) => item.id),
    ).toEqual(["task-a", "task-a-1", "task-a-2"]);
  });

  it("includes parent context but not sibling context for a subtask assignee", () => {
    const parent = task({
      assigneeId: "user-a",
      id: "task-a",
      title: "Task A",
    });
    const assignedChild = task({
      assigneeId: "user-b",
      id: "task-a-1",
      parentTaskId: parent.id,
      title: "Sub-task A1",
    });
    const sibling = task({
      assigneeId: "user-c",
      id: "task-a-2",
      parentTaskId: parent.id,
      title: "Sub-task A2",
    });

    expect(
      includePersonalWorkContext(
        [parent, assignedChild, sibling],
        [assignedChild],
        "user-b",
      ).map((item) => item.id),
    ).toEqual(["task-a", "task-a-1"]);
  });
});
