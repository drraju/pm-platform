import { describe, expect, it } from "vitest";
import { holdingLines, waitingLines } from "@/features/work/waiting-on";

describe("waiting lines", () => {
  it("uses the predecessor on the dependency when that task is not in the list", () => {
    const lines = waitingLines(
      "mine",
      [
        {
          id: "dep-1",
          predecessorTask: {
            assigneeId: "user-9",
            dueDate: "2026-10-01",
            id: "theirs",
            status: "todo",
            title: "testing",
          },
          predecessorTaskId: "theirs",
          successorTaskId: "mine",
        },
      ],
      [{ id: "mine", status: "todo", title: "Read API" }],
      "2026-10-30",
    );

    expect(lines).toEqual([
      {
        id: "dep-1",
        owner: null,
        state: "overdue",
        text: "Waiting on testing · Overdue",
        title: "testing",
      },
    ]);
  });

  it("keeps a late blocked predecessor as blocked", () => {
    const lines = waitingLines(
      "mine",
      [{ id: "dep-1", predecessorTaskId: "theirs", successorTaskId: "mine" }],
      [
        { id: "mine", status: "todo", title: "Read API" },
        { dueDate: "2026-10-01", id: "theirs", status: "blocked", title: "testing" },
      ],
      "2026-10-30",
    );

    expect(lines[0]?.state).toBe("blocked");
    expect(lines[0]?.text).toBe("Waiting on testing · Blocked · Unassigned");
  });

  it("names the successor and its owner when this task is holding work up", () => {
    const lines = holdingLines(
      "theirs",
      [
        {
          id: "dep-1",
          predecessorTaskId: "theirs",
          successorTask: {
            assignee: { firstName: "Ava", lastName: "Patel" },
            assigneeId: "user-1",
            id: "mine",
            title: "Read API",
          },
          successorTaskId: "mine",
        },
      ],
      [{ id: "theirs", status: "blocked", title: "testing" }],
    );

    expect(lines).toEqual([
      {
        id: "dep-1",
        owner: "Ava Patel",
        text: "Holding up Read API · Ava Patel",
        title: "Read API",
      },
    ]);
  });
});
