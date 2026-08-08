import { describe, expect, it } from "vitest";
import { resolveProjectUiCapabilities } from "@/features/auth/capabilities";

describe("resolveProjectUiCapabilities standup access", () => {
  const leadershipPermissions = ["project.read", "task.update"];

  it.each([
    "PLATFORM_ADMIN",
    "PORTFOLIO_MANAGER",
    "PROGRAM_MANAGER",
    "PROJECT_MANAGER",
    "SUPER_ADMIN",
    "Project Manager",
  ])("grants Today and Daily Review to %s", (roleName) => {
    const capabilities = resolveProjectUiCapabilities({
      permissionKeys: leadershipPermissions,
      roleNames: [roleName],
    });

    expect(capabilities.canAccessToday).toBe(true);
    expect(capabilities.canAccessDailyReview).toBe(true);
    expect(capabilities.canAccessDelivery).toBe(true);
  });

  it("grants Today and Delivery to team members with task update", () => {
    const capabilities = resolveProjectUiCapabilities({
      permissionKeys: leadershipPermissions,
      roleNames: ["TEAM_MEMBER"],
    });

    expect(capabilities.canAccessToday).toBe(true);
    expect(capabilities.canAccessDelivery).toBe(true);
    expect(capabilities.canAccessDailyReview).toBe(false);
    expect(capabilities.canAccessPlanning).toBe(false);
    expect(capabilities.canAccessGovern).toBe(false);
  });

  it("requires task.update in addition to leadership role", () => {
    const capabilities = resolveProjectUiCapabilities({
      permissionKeys: ["project.read"],
      roleNames: ["PROJECT_MANAGER"],
    });

    expect(capabilities.canAccessToday).toBe(false);
    expect(capabilities.canAccessDelivery).toBe(false);
  });

  it("elevates assigned-task execution without granting planning", () => {
    const capabilities = resolveProjectUiCapabilities({
      currentUserId: "user-1",
      permissionKeys: ["project.read", "task.update", "task.reassign"],
      roleNames: ["TEAM_MEMBER"],
      task: { assigneeId: "user-1" },
    });

    expect(capabilities.canExecuteAssignedTask).toBe(true);
    expect(capabilities.canUpdateTask).toBe(true);
    expect(capabilities.canEditPlanning).toBe(false);
    expect(capabilities.canManageProjectTasks).toBe(false);
  });

  it("allows document contribution and own-document edit", () => {
    const capabilities = resolveProjectUiCapabilities({
      currentUserId: "user-1",
      document: { createdById: "user-1", ownerId: "user-1" },
      permissionKeys: ["project.read", "task.update"],
      roleNames: ["TEAM_MEMBER"],
    });

    expect(capabilities.canUploadDocuments).toBe(true);
    expect(capabilities.canContributeDocuments).toBe(true);
    expect(capabilities.canEditDocument).toBe(true);
    expect(capabilities.canApproveDocuments).toBe(false);
    expect(capabilities.canManageDocuments).toBe(false);
  });

  it("denies editing another user's document for contributors", () => {
    const capabilities = resolveProjectUiCapabilities({
      currentUserId: "user-1",
      document: { createdById: "user-2", ownerId: "user-2" },
      permissionKeys: ["project.read", "task.update"],
      roleNames: ["TEAM_MEMBER"],
    });

    expect(capabilities.canEditDocument).toBe(false);
  });
});
