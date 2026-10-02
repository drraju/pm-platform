import { describe, expect, it } from "vitest";
import { resolveTaskUiCapabilities } from "@/features/auth/capabilities";

const base = {
  currentUserId: "me",
  project: { status: "active" },
  task: { assigneeId: "me", taskKind: "standard" as const },
  members: [{ id: "membership", userId: "me", role: "manager" }],
};

describe("canonical task UI projection", () => {
  it.each(["manager", "owner"])("grants %s all task actions", (role) => {
    expect(
      Object.values(
        resolveTaskUiCapabilities({
          ...base,
          members: [{ ...base.members[0], role }],
        }),
      ).every(Boolean),
    ).toBe(true);
  });
  it("separates assigned contributor execution/reassignment from creation, initial assignment and planned dates", () => {
    const input = {
      ...base,
      members: [{ ...base.members[0], role: "contributor" }],
    };
    expect(resolveTaskUiCapabilities(input)).toEqual({
      canManageTasks: false,
      canCreate: false,
      canRecordUpdate: true,
      canAssign: false,
      canReassign: true,
      canEditDueDate: true,
      canEditPlannedDates: false,
      canComplete: true,
    });
    expect(
      Object.values(
        resolveTaskUiCapabilities({
          ...input,
          task: { ...input.task, assigneeId: "other" },
        }),
      ).every((value) => !value),
    ).toBe(true);
  });
  it.each([
    "viewer",
    "executive",
    "customer",
    "service",
    "archived",
    "deleted",
    "no actor",
    "governance owner",
  ])("denies mutation for %s even on assigned work", (restriction) => {
    const result = resolveTaskUiCapabilities({
      ...base,
      currentUserId: restriction === "no actor" ? null : base.currentUserId,
      members: ["viewer", "governance owner"].includes(restriction)
        ? [{ ...base.members[0], role: "viewer" }]
        : base.members,
      roleNames:
        restriction === "customer"
          ? ["CUSTOMER"]
          : restriction === "executive"
            ? ["EXECUTIVE"]
            : [],
      identityType: restriction === "service" ? "SERVICE" : "HUMAN",
      project: { status: restriction === "archived" ? "archived" : "active" },
      task: {
        ...base.task,
        deletedAt: restriction === "deleted" ? "2026-10-02" : null,
      },
    });
    expect(Object.values(result).every((value) => !value)).toBe(true);
  });
  it("preserves only the canonical platform administrator override", () => {
    expect(
      resolveTaskUiCapabilities({
        ...base,
        members: [],
        roleNames: ["PLATFORM_ADMIN"],
      }).canManageTasks,
    ).toBe(true);
    expect(
      resolveTaskUiCapabilities({
        ...base,
        members: [],
        roleNames: ["SUPER_ADMIN"],
      }).canManageTasks,
    ).toBe(false);
    expect(
      resolveTaskUiCapabilities({
        ...base,
        members: [],
        roleNames: ["PROJECT_MANAGER"],
      }).canManageTasks,
    ).toBe(false);
  });
  it("denies external managers but preserves assigned external contributor execution", () => {
    expect(
      resolveTaskUiCapabilities({ ...base, roleNames: ["PARTNER"] })
        .canRecordUpdate,
    ).toBe(false);
    expect(
      resolveTaskUiCapabilities({
        ...base,
        roleNames: ["PARTNER"],
        members: [{ ...base.members[0], role: "contributor" }],
      }).canRecordUpdate,
    ).toBe(true);
  });
  it("keeps summary execution, assignment and completion read-only", () => {
    const result = resolveTaskUiCapabilities({
      ...base,
      task: { ...base.task, taskKind: "summary" },
    });
    expect(result.canRecordUpdate).toBe(false);
    expect(result.canComplete).toBe(false);
    expect(result.canAssign).toBe(false);
    expect(result.canReassign).toBe(false);
  });
});

it.each(["manager", "contributor", "viewer", "CUSTOMER"])(
  "preserves %s authorization on completed work",
  (role) => {
    const task = { ...base.task, status: "done", percentComplete: 100 };
    const result = resolveTaskUiCapabilities({
      ...base,
      task,
      members: [
        {
          ...base.members[0],
          role: role === "CUSTOMER" ? "contributor" : role,
        },
      ],
      roleNames: role === "CUSTOMER" ? ["CUSTOMER"] : [],
    });
    expect(result.canRecordUpdate).toBe(
      ["manager", "contributor"].includes(role),
    );
  },
);
