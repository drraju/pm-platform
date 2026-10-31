import { describe, expect, it } from "vitest";
import { waitingLines } from "@/features/work/waiting-on";

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
});
