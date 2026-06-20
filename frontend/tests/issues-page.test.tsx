import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import IssuesPage from "@/app/(app)/issues/page";

const raidMocks = vi.hoisted(() => ({
  getRaidItems: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

vi.mock("@/features/auth", () => ({
  getAuthMe: vi.fn(async () => ({
    permissions: [{ id: "permission-raid-read", key: "raid.read" }],
    roles: [{ id: "role-1", name: "Executive", permissions: [] }],
    user: {
      email: "executive@example.com",
      firstName: "Executive",
      id: "user-1",
      lastName: "User",
      role: { id: "role-1", name: "Executive", permissions: [] },
      status: "active",
    },
  })),
  hasPermission: (permissionKeys: string[], requiredPermission: string) =>
    permissionKeys.includes(requiredPermission),
  getStoredPermissionKeys: () => ["raid.read"],
  getStoredSessionUser: () => ({ email: "executive@example.com", roleId: "role-1", userId: "user-1" }),
  storeAuthMe: vi.fn(),
}));

vi.mock("@/features/projects", () => ({
  getProjects: vi.fn(async () => [{ id: "project-1", name: "Core Platform", status: "active" }]),
}));

vi.mock("@/features/raid", () => ({
  addRaidComment: vi.fn(),
  createRaidItem: vi.fn(),
  deleteRaidItem: vi.fn(),
  getRaidItems: raidMocks.getRaidItems,
  updateRaidItem: vi.fn(),
}));

vi.mock("@/features/users", () => ({
  getAssignableUsers: vi.fn(async () => []),
}));

describe("Issues page", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/issues?status=open");
    raidMocks.getRaidItems.mockReset();
  });

  it("keeps executive open-issue drilldowns aligned with visible results", async () => {
    raidMocks.getRaidItems.mockResolvedValue([
      {
        id: "issue-open-1",
        owner: null,
        ownerId: null,
        priority: "critical",
        project: { id: "project-1", name: "Core Platform", status: "active" },
        projectId: "project-1",
        status: "open",
        title: "Steering decision pending",
        type: "issue",
      },
      {
        id: "issue-open-2",
        owner: null,
        ownerId: null,
        priority: "high",
        project: { id: "project-1", name: "Core Platform", status: "active" },
        projectId: "project-1",
        status: "blocked",
        title: "Procurement hold",
        type: "issue",
      },
      {
        id: "issue-closed",
        owner: null,
        ownerId: null,
        priority: "critical",
        project: { id: "project-1", name: "Core Platform", status: "active" },
        projectId: "project-1",
        status: "resolved",
        title: "Closed escalation",
        type: "issue",
      },
    ]);

    render(<IssuesPage />);

    await waitFor(() => {
      expect(raidMocks.getRaidItems).toHaveBeenCalled();
    });

    expect(screen.getByText("Steering decision pending")).toBeInTheDocument();
    expect(screen.getByText("Procurement hold")).toBeInTheDocument();
    expect(screen.queryByText("Closed escalation")).not.toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("reacts to client-side issue filter navigation without reload", async () => {
    raidMocks.getRaidItems.mockResolvedValue([
      {
        id: "issue-open-1",
        owner: null,
        ownerId: null,
        priority: "critical",
        project: { id: "project-1", name: "Core Platform", status: "active" },
        projectId: "project-1",
        status: "open",
        title: "Steering decision pending",
        type: "issue",
      },
      {
        id: "issue-closed",
        owner: null,
        ownerId: null,
        priority: "critical",
        project: { id: "project-1", name: "Core Platform", status: "active" },
        projectId: "project-1",
        status: "resolved",
        title: "Closed escalation",
        type: "issue",
      },
    ]);

    const { rerender } = render(<IssuesPage />);

    await waitFor(() => {
      expect(raidMocks.getRaidItems).toHaveBeenCalled();
    });

    window.history.pushState({}, "", "/issues?status=open");
    rerender(<IssuesPage />);

    expect(screen.getByText("Steering decision pending")).toBeInTheDocument();
    expect(screen.queryByText("Closed escalation")).not.toBeInTheDocument();
  });
});
