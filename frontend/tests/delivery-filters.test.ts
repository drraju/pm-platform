import { describe, expect, it } from "vitest";
import {
  createDefaultDeliveryFilterState,
  deliveryFilterToState,
  filterDeliveryTasks,
  filterDeliveryTasksByState,
  getActiveDeliveryFilterLabels,
  getDeliveryAttentionSummary,
  getDeliveryFilterCounts,
} from "@/components/delivery/delivery-filters";
import type { ApiTask } from "@/lib/api/client";
import { includeTaskAncestors } from "@/lib/tasks/include-task-ancestors";
import { includePersonalWorkContext } from "@/lib/tasks/personal-work-context";

function task(
  partial: Partial<ApiTask> & Pick<ApiTask, "id" | "title" | "status">,
): ApiTask {
  return {
    priority: "medium",
    projectId: "project-1",
    ...partial,
  } as ApiTask;
}

describe("delivery filters", () => {
  const tasks = [
    task({ id: "todo-1", status: "todo", title: "Todo work" }),
    task({
      assigneeId: "user-1",
      id: "progress-1",
      priority: "high",
      status: "in_progress",
      title: "Active work",
    }),
    task({ id: "done-1", status: "done", title: "Finished work" }),
    task({
      dueDate: "2020-01-01",
      id: "overdue-1",
      status: "todo",
      title: "Late work",
    }),
  ];

  it("keeps completed tasks in the default All filter used by Board", () => {
    const visible = filterDeliveryTasks(tasks, "all", "user-1");

    expect(visible.map((item) => item.id)).toEqual([
      "todo-1",
      "progress-1",
      "done-1",
      "overdue-1",
    ]);
    expect(getDeliveryFilterCounts(tasks, "user-1")).toMatchObject({
      all: 4,
      active: 3,
      completed: 1,
    });
  });

  it("still excludes Done when Active is selected deliberately", () => {
    expect(
      filterDeliveryTasks(tasks, "active", "user-1").map((item) => item.id),
    ).toEqual(["todo-1", "progress-1", "overdue-1"]);
    expect(
      filterDeliveryTasks(tasks, "completed", "user-1").map((item) => item.id),
    ).toEqual(["done-1"]);
  });

  it("maps legacy single filters into composable state", () => {
    expect(deliveryFilterToState("mine")).toEqual({
      ...createDefaultDeliveryFilterState(),
      owner: "mine",
    });
    expect(deliveryFilterToState("overdue")).toEqual({
      ...createDefaultDeliveryFilterState(),
      attention: "overdue",
    });
    expect(deliveryFilterToState("in_progress")).toEqual({
      ...createDefaultDeliveryFilterState(),
      status: "in_progress",
    });
  });

  it("composes status, owner, priority, and attention filters", () => {
    const visible = filterDeliveryTasksByState(
      tasks,
      {
        attention: "none",
        owner: "mine",
        priority: "high",
        status: "active",
      },
      "user-1",
    );

    expect(visible.map((item) => item.id)).toEqual(["progress-1"]);
  });

  it("preserves overdue attention semantics through More Filters state", () => {
    expect(
      filterDeliveryTasksByState(
        tasks,
        {
          ...createDefaultDeliveryFilterState(),
          attention: "overdue",
        },
        "user-1",
      ).map((item) => item.id),
    ).toEqual(["overdue-1"]);
  });

  it("exposes compact attention summary metrics", () => {
    expect(getDeliveryAttentionSummary(tasks, "user-1")).toEqual({
      active: 3,
      blocked: 0,
      overdue: 1,
      total: 4,
    });
  });

  it("lists active filter labels for chips", () => {
    expect(
      getActiveDeliveryFilterLabels({
        attention: "overdue",
        owner: "mine",
        priority: "high",
        status: "active",
      }),
    ).toEqual(["Active", "Mine", "High", "Overdue"]);
  });

  it("keeps Delivery Mine hierarchy-aware without changing direct-work counts", () => {
    const parent = task({
      assigneeId: "user-1",
      id: "task-a",
      status: "in_progress",
      title: "Task A",
    });
    const child = task({
      assigneeId: "user-2",
      id: "task-a-1",
      parentTaskId: parent.id,
      status: "todo",
      title: "Sub-task A1",
    });
    const sibling = task({
      assigneeId: "user-3",
      id: "task-a-2",
      parentTaskId: parent.id,
      status: "blocked",
      title: "Sub-task A2",
    });
    const unrelated = task({
      assigneeId: "user-4",
      id: "task-b",
      status: "todo",
      title: "Unrelated task",
    });
    const allTasks = [parent, child, sibling, unrelated];
    const matchedTasks = filterDeliveryTasksByState(
      allTasks,
      { ...createDefaultDeliveryFilterState(), owner: "mine" },
      "user-1",
    );
    const visibleTasks = includeTaskAncestors(
      allTasks,
      includePersonalWorkContext(allTasks, matchedTasks, "user-1"),
    );

    expect(matchedTasks.map((item) => item.id)).toEqual(["task-a"]);
    expect(visibleTasks.map((item) => item.id)).toEqual([
      "task-a",
      "task-a-1",
      "task-a-2",
    ]);
    expect(getDeliveryFilterCounts(allTasks, "user-1").mine).toBe(1);
  });
});
