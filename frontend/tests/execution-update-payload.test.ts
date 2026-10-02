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

    expect(buildExecutionUpdatePayload(task, { status: "done" })).toMatchObject(
      {
        percentComplete: 100,
        status: "done",
      },
    );
  });
});

const work: ApiTask = {
  id: "task",
  projectId: "project",
  title: "Work",
  status: "todo",
  priority: "medium",
  percentComplete: 0,
};

describe("execution text semantics", () => {
  it.each(["backlog", "todo", "in_progress", "blocked", "done"] as const)(
    "%s never generates Next Step or commentary",
    (status) => {
      expect(buildExecutionUpdatePayload(work, { status })).toMatchObject({
        nextStep: null,
        updateNotes: null,
      });
    },
  );
  it.each([
    [null, null],
    ["", null],
    ["   ", null],
    ["Complete API authentication", "Complete API authentication"],
  ] as const)("normalizes explicit input %s", (text, expected) => {
    expect(
      buildExecutionUpdatePayload(work, { nextStep: text, updateNotes: text }),
    ).toMatchObject({ nextStep: expected, updateNotes: expected });
  });
  it("retains previous Next Step as context without copying it into commentary or a blocker", () => {
    const task = {
      ...work,
      latestExecutionUpdate: {
        id: "update",
        taskId: "task",
        projectId: "project",
        priority: "medium",
        percentComplete: 0,
        status: "todo" as const,
        nextStep: "Complete interface testing",
      },
    };
    expect(
      buildExecutionUpdatePayload(task, { status: "in_progress" }),
    ).toMatchObject({
      nextStep: "Complete interface testing",
      updateNotes: null,
    });
    expect(buildExecutionUpdatePayload(task, { nextStep: "" })).toMatchObject({
      nextStep: null,
    });
    expect(
      buildExecutionUpdatePayload(task, { isBlocked: true }),
    ).toMatchObject({ updateNotes: null });
  });
  it("permits progress and completion with no Next Step", () => {
    expect(
      buildExecutionUpdatePayload(work, {
        percentComplete: 50,
        status: "in_progress",
      }),
    ).toMatchObject({ nextStep: null, updateNotes: null, percentComplete: 50 });
    expect(buildExecutionUpdatePayload(work, { status: "done" })).toMatchObject(
      { nextStep: null, updateNotes: null, percentComplete: 100 },
    );
  });
});

describe("completed task execution payloads", () => {
  const completed: ApiTask = { ...work, status: "done", percentComplete: 100 };
  it("normalizes a status-only reopening to valid In Progress progress", () => {
    expect(
      buildExecutionUpdatePayload(completed, { status: "in_progress" }),
    ).toMatchObject({
      status: "in_progress",
      percentComplete: 99,
      nextStep: null,
      updateNotes: null,
    });
  });
  it.each([
    [75, "in_progress"],
    [0, "todo"],
  ] as const)(
    "reopens a progress-only edit to %s",
    (percentComplete, status) => {
      expect(
        buildExecutionUpdatePayload(completed, { percentComplete }),
      ).toMatchObject({ status, percentComplete });
    },
  );
  it("preserves explicit completion precedence and repeat completion", () => {
    expect(
      buildExecutionUpdatePayload(completed, { status: "done" }),
    ).toMatchObject({ status: "done", percentComplete: 100 });
    expect(
      buildExecutionUpdatePayload(completed, {
        status: "done",
        percentComplete: 75,
      }),
    ).toMatchObject({ status: "done", percentComplete: 75 });
    // The backend's existing 100% completion transition remains authoritative.
    expect(
      buildExecutionUpdatePayload(completed, {
        status: "in_progress",
        percentComplete: 100,
      }),
    ).toMatchObject({ status: "in_progress", percentComplete: 100 });
  });
});
