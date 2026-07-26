import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RisksPage from "@/app/(app)/risks/page";

const raidMocks = vi.hoisted(() => ({
  getRaidItems: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

vi.mock("@/features/auth", () => ({
  getAuthMe: vi.fn(async () => ({
    permissions: [{ id: "permission-raid-read", key: "raid.read" }],
    roles: [{ id: "role-1", name: "EXECUTIVE", permissions: [] }],
    user: {
      email: "executive@example.com",
      firstName: "Executive",
      id: "user-1",
      lastName: "User",
      role: { id: "role-1", name: "EXECUTIVE", permissions: [] },
      status: "active",
    },
  })),
  hasPermission: (permissionKeys: string[], requiredPermission: string) =>
    permissionKeys.includes(requiredPermission),
  getStoredPermissionKeys: () => ["raid.read"],
  getStoredSessionUser: () => ({
    email: "executive@example.com",
    roleId: "role-1",
    userId: "user-1",
  }),
  storeAuthMe: vi.fn(),
}));

vi.mock("@/features/projects", () => ({
  getProjects: vi.fn(async () => [
    { id: "project-1", name: "Core Platform", status: "active" },
  ]),
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

describe("Risks page", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/risks?status=open");
    raidMocks.getRaidItems.mockReset();
  });

  it("keeps executive open-risk drilldowns aligned with visible results", async () => {
    raidMocks.getRaidItems.mockResolvedValue([
      {
        id: "risk-open-1",
        owner: null,
        ownerId: null,
        project: { id: "project-1", name: "Core Platform", status: "active" },
        projectId: "project-1",
        severity: "critical",
        status: "open",
        title: "Budget runway reduction",
        type: "risk",
      },
      {
        id: "risk-open-2",
        owner: null,
        ownerId: null,
        project: { id: "project-1", name: "Core Platform", status: "active" },
        projectId: "project-1",
        severity: "high",
        status: "monitoring",
        title: "Vendor readiness",
        type: "risk",
      },
      {
        id: "risk-closed",
        owner: null,
        ownerId: null,
        project: { id: "project-1", name: "Core Platform", status: "active" },
        projectId: "project-1",
        severity: "critical",
        status: "closed",
        title: "Resolved migration blocker",
        type: "risk",
      },
    ]);

    render(<RisksPage />);

    await waitFor(() => {
      expect(raidMocks.getRaidItems).toHaveBeenCalled();
    });

    expect(screen.getByText("Budget runway reduction")).toBeInTheDocument();
    expect(screen.getByText("Vendor readiness")).toBeInTheDocument();
    expect(
      screen.queryByText("Resolved migration blocker"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("reacts to client-side risk filter navigation without reload", async () => {
    raidMocks.getRaidItems.mockResolvedValue([
      {
        id: "risk-open-1",
        owner: null,
        ownerId: null,
        project: { id: "project-1", name: "Core Platform", status: "active" },
        projectId: "project-1",
        severity: "critical",
        status: "open",
        title: "Budget runway reduction",
        type: "risk",
      },
      {
        id: "risk-closed",
        owner: null,
        ownerId: null,
        project: { id: "project-1", name: "Core Platform", status: "active" },
        projectId: "project-1",
        severity: "critical",
        status: "closed",
        title: "Resolved migration blocker",
        type: "risk",
      },
    ]);

    const { rerender } = render(<RisksPage />);

    await waitFor(() => {
      expect(raidMocks.getRaidItems).toHaveBeenCalled();
    });

    window.history.pushState({}, "", "/risks?status=open");
    rerender(<RisksPage />);

    expect(screen.getByText("Budget runway reduction")).toBeInTheDocument();
    expect(
      screen.queryByText("Resolved migration blocker"),
    ).not.toBeInTheDocument();
  });
});
