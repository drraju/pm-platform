import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addProjectMember,
  createProjectTask,
  createProject,
  deleteProject,
  getMyTasks,
  getPortfolioSummary,
  getProject,
  getProjectAssumptions,
  getProjectDependencies,
  getProjectIssues,
  getProjectRisks,
  getProjects,
  removeProjectMember,
  updateProject,
  updateProjectTask,
} from "@/lib/api/client";

function mockFetch(response: unknown, init: { status?: number; ok?: boolean } = {}) {
  const status = init.status ?? 200;
  const ok = init.ok ?? status < 400;

  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: vi.fn().mockResolvedValue(response),
  });
}

describe("project API client", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
      removeItem: vi.fn(),
      setItem: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists projects", async () => {
    const fetchMock = mockFetch([{ id: "project-1", name: "ERP" }]);
    vi.stubGlobal("fetch", fetchMock);

    await expect(getProjects()).resolves.toEqual([
      { id: "project-1", name: "ERP" },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/projects",
      expect.objectContaining({
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("loads portfolio summary", async () => {
    const fetchMock = mockFetch({
      totalProjects: 4,
      greenProjects: 2,
      amberProjects: 1,
      redProjects: 1,
      projectsRequiringAttention: [
        {
          id: "project-1",
          name: "Customer Experience Platform Upgrade",
          healthStatus: "AMBER",
          reasons: ["1 high risk open"],
        },
      ],
      openRisksBySeverity: {
        critical: 1,
        high: 2,
        medium: 3,
        low: 4,
      },
      openIssuesByPriority: {
        critical: 2,
        high: 3,
        medium: 4,
        low: 5,
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getPortfolioSummary()).resolves.toEqual({
      totalProjects: 4,
      greenProjects: 2,
      amberProjects: 1,
      redProjects: 1,
      projectsRequiringAttention: [
        {
          id: "project-1",
          name: "Customer Experience Platform Upgrade",
          healthStatus: "AMBER",
          reasons: ["1 high risk open"],
        },
      ],
      openRisksBySeverity: {
        critical: 1,
        high: 2,
        medium: 3,
        low: 4,
      },
      openIssuesByPriority: {
        critical: 2,
        high: 3,
        medium: 4,
        low: 5,
      },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/portfolio/summary",
      expect.objectContaining({
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("loads project details", async () => {
    const fetchMock = mockFetch({ id: "project-1", name: "ERP", tasks: [] });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getProject("project-1")).resolves.toEqual({
      id: "project-1",
      name: "ERP",
      tasks: [],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/projects/project-1",
      expect.any(Object),
    );
  });

  it("loads project register sections", async () => {
    const fetchMock = mockFetch([{ id: "risk-1", title: "Delivery risk" }]);
    vi.stubGlobal("fetch", fetchMock);

    await getProjectRisks("project-1");
    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://localhost:3001/projects/project-1/risks",
      expect.any(Object),
    );

    await getProjectIssues("project-1");
    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://localhost:3001/projects/project-1/issues",
      expect.any(Object),
    );

    await getProjectAssumptions("project-1");
    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://localhost:3001/projects/project-1/assumptions",
      expect.any(Object),
    );

    await getProjectDependencies("project-1");
    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://localhost:3001/projects/project-1/dependencies",
      expect.any(Object),
    );
  });

  it("creates projects with the existing DTO shape", async () => {
    const fetchMock = mockFetch({ id: "project-1", name: "ERP" });
    vi.stubGlobal("fetch", fetchMock);

    await createProject({
      name: "ERP",
      description: "Finance delivery",
      status: "active",
      startDate: "2026-01-01",
      targetEndDate: "2026-09-30",
      ownerId: "user-1",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/projects",
      expect.objectContaining({
        body: JSON.stringify({
          name: "ERP",
          description: "Finance delivery",
          status: "active",
          startDate: "2026-01-01",
          targetEndDate: "2026-09-30",
          ownerId: "user-1",
        }),
        method: "POST",
      }),
    );
  });

  it("updates projects", async () => {
    const fetchMock = mockFetch({ id: "project-1", name: "Updated ERP" });
    vi.stubGlobal("fetch", fetchMock);

    await updateProject("project-1", {
      name: "Updated ERP",
      status: "at_risk",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/projects/project-1",
      expect.objectContaining({
        body: JSON.stringify({ name: "Updated ERP", status: "at_risk" }),
        method: "PATCH",
      }),
    );
  });

  it("deletes projects", async () => {
    const fetchMock = mockFetch(null, { status: 204 });
    vi.stubGlobal("fetch", fetchMock);

    await expect(deleteProject("project-1")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/projects/project-1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("adds and removes project members", async () => {
    const fetchMock = mockFetch({ id: "member-1", userId: "user-1" });
    vi.stubGlobal("fetch", fetchMock);

    await addProjectMember("project-1", {
      userId: "user-1",
      role: "manager",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/projects/project-1/members",
      expect.objectContaining({
        body: JSON.stringify({ userId: "user-1", role: "manager" }),
        method: "POST",
      }),
    );

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: vi.fn(),
    });

    await expect(
      removeProjectMember("project-1", "user-1"),
    ).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://localhost:3001/projects/project-1/members/user-1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("creates and updates project tasks", async () => {
    const fetchMock = mockFetch({ id: "task-1", title: "Mobilise team" });
    vi.stubGlobal("fetch", fetchMock);

    await createProjectTask("project-1", {
      title: "Mobilise team",
      assigneeId: "user-1",
      status: "todo",
      priority: "high",
      dueDate: "2026-06-30",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/projects/project-1/tasks",
      expect.objectContaining({
        body: JSON.stringify({
          title: "Mobilise team",
          assigneeId: "user-1",
          status: "todo",
          priority: "high",
          dueDate: "2026-06-30",
        }),
        method: "POST",
      }),
    );

    await updateProjectTask("project-1", "task-1", {
      status: "in_progress",
    });

    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://localhost:3001/projects/project-1/tasks/task-1",
      expect.objectContaining({
        body: JSON.stringify({ status: "in_progress" }),
        method: "PATCH",
      }),
    );
  });

  it("loads authenticated user tasks with query filters", async () => {
    const fetchMock = mockFetch([{ id: "task-1", title: "Prepare cutover" }]);
    vi.stubGlobal("fetch", fetchMock);

    await getMyTasks({
      priority: "high",
      projectId: "project-1",
      status: "blocked",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/tasks/my?priority=high&projectId=project-1&status=blocked",
      expect.any(Object),
    );
  });
});
