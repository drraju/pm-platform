import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addProjectMember,
  createProjectTask,
  createProject,
  getAssignableUsers,
  getAuthMe,
  getPermissions,
  createRaidItem,
  deleteProject,
  deleteProjectTask,
  deleteRaidItem,
  getMyTasks,
  getProject,
  getProjectAssumptions,
  getProjectDependencies,
  getProjectIssues,
  getProjectRisks,
  getProjects,
  removeProjectMember,
  updateRolePermissions,
  updateProject,
  updateProjectMember,
  updateProjectTask,
  updateRaidItem,
} from "@/lib/api/client";

function mockFetch(response: unknown, init: { status?: number; ok?: boolean } = {}) {
  const status = init.status ?? 200;
  const ok = init.ok ?? status < 400;
  const text =
    response === null || typeof response === "undefined"
      ? ""
      : JSON.stringify(response);

  return vi.fn().mockResolvedValue({
    ok,
    status,
    headers: {
      get: vi.fn((name: string) =>
        name.toLowerCase() === "content-length" ? String(text.length) : null,
      ),
    },
    json: vi.fn().mockResolvedValue(response),
    text: vi.fn().mockResolvedValue(text),
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
        cache: "no-store",
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
      businessOwnerId: "user-2",
      description: "Finance delivery",
      deliveryLeadId: "user-3",
      executiveSponsorId: "user-4",
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
          businessOwnerId: "user-2",
          description: "Finance delivery",
          deliveryLeadId: "user-3",
          executiveSponsorId: "user-4",
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
      businessOwnerId: "user-2",
      name: "Updated ERP",
      status: "at_risk",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/projects/project-1",
      expect.objectContaining({
        body: JSON.stringify({
          businessOwnerId: "user-2",
          name: "Updated ERP",
          status: "at_risk",
        }),
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

  it("adds, updates, and removes project members", async () => {
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

    await updateProjectMember("project-1", "member-1", {
      role: "manager",
    });

    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://localhost:3001/projects/project-1/members/member-1",
      expect.objectContaining({
        body: JSON.stringify({ role: "manager" }),
        method: "PATCH",
      }),
    );

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 204,
      headers: { get: vi.fn(() => null) },
      json: vi.fn(),
      text: vi.fn().mockResolvedValue(""),
    });

    await expect(
      removeProjectMember("project-1", "user-1"),
    ).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://localhost:3001/projects/project-1/members/user-1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("loads assignable users without calling the admin users endpoint", async () => {
    const fetchMock = mockFetch([
      {
        displayName: "Ava Patel",
        email: "ava@example.com",
        firstName: "Ava",
        id: "user-1",
        lastName: "Patel",
        role: "Project Manager",
      },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    await expect(getAssignableUsers()).resolves.toEqual([
      {
        displayName: "Ava Patel",
        email: "ava@example.com",
        firstName: "Ava",
        id: "user-1",
        lastName: "Patel",
        role: "Project Manager",
      },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/users/assignable",
      expect.any(Object),
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

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 204,
      headers: { get: vi.fn(() => null) },
      json: vi.fn(),
      text: vi.fn().mockResolvedValue(""),
    });

    await expect(
      deleteProjectTask("project-1", "task-1"),
    ).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://localhost:3001/projects/project-1/tasks/task-1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("creates, updates, and deletes RAID items", async () => {
    const fetchMock = mockFetch({ id: "risk-1", title: "Supplier risk" });
    vi.stubGlobal("fetch", fetchMock);

    await createRaidItem({
      impact: "high",
      probability: "medium",
      projectId: "project-1",
      status: "open",
      title: "Supplier risk",
      type: "risk",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/raid",
      expect.objectContaining({
        body: JSON.stringify({
          impact: "high",
          probability: "medium",
          projectId: "project-1",
          status: "open",
          title: "Supplier risk",
          type: "risk",
        }),
        method: "POST",
      }),
    );

    await updateRaidItem("risk-1", {
      mitigationPlan: "Escalate weekly",
      status: "mitigating",
    });

    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://localhost:3001/raid/risk-1",
      expect.objectContaining({
        body: JSON.stringify({
          mitigationPlan: "Escalate weekly",
          status: "mitigating",
        }),
        method: "PATCH",
      }),
    );

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 204,
      headers: { get: vi.fn(() => null) },
      json: vi.fn(),
      text: vi.fn().mockResolvedValue(""),
    });

    await expect(deleteRaidItem("risk-1")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://localhost:3001/raid/risk-1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("treats successful empty delete responses as undefined even when the API returns 200", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: vi.fn((name: string) =>
          name.toLowerCase() === "content-length" ? "0" : null,
        ),
      },
      json: vi.fn(),
      text: vi.fn().mockResolvedValue(""),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(deleteRaidItem("risk-1")).resolves.toBeUndefined();
    await expect(deleteProjectTask("project-1", "task-1")).resolves.toBeUndefined();
    await expect(deleteProject("project-1")).resolves.toBeUndefined();
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

  it("loads the authenticated permission profile", async () => {
    const fetchMock = mockFetch({
      permissions: [{ id: "permission-1", key: "task.create" }],
      roles: [{ id: "role-1", name: "Project Manager" }],
      user: { id: "user-1", email: "pm@example.com" },
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getAuthMe()).resolves.toEqual({
      permissions: [{ id: "permission-1", key: "task.create" }],
      roles: [{ id: "role-1", name: "Project Manager" }],
      user: { id: "user-1", email: "pm@example.com" },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/auth/me",
      expect.any(Object),
    );
  });

  it("loads permissions and updates role permission assignments", async () => {
    const fetchMock = mockFetch([{ id: "permission-1", key: "task.create" }]);
    vi.stubGlobal("fetch", fetchMock);

    await getPermissions();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/users/permissions",
      expect.any(Object),
    );

    await updateRolePermissions("role-1", ["task.create", "task.update"]);
    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://localhost:3001/users/roles/role-1/permissions",
      expect.objectContaining({
        body: JSON.stringify({
          permissionKeys: ["task.create", "task.update"],
        }),
        method: "PATCH",
      }),
    );
  });
});
