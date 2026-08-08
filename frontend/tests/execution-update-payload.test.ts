import { describe, expect, it } from "vitest";
import { buildExecutionUpdatePayload } from "@/components/projects/execution-update-payload";
import type { ApiTask } from "@/lib/api/client";

describe("buildExecutionUpdatePayload", () => {
  it("normalizes drag-to-Done with percentComplete 100", () => {
    const task = {
      id: "task-1",
      percentComplete: 40,
      priority: "high",
      projectId: "project-1",
      status: "in_progress",
      title: "Ship feature",
    } as ApiTask;

    expect(buildExecutionUpdatePayload(task, { status: "done" })).toMatchObject({
      percentComplete: 100,
      status: "done",
    });
  });
});
