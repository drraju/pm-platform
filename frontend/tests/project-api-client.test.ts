import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addProjectMember,
  adminResetUserPassword,
  archiveProject,
  captureProjectBaseline,
  changePassword,
  getDocumentCategories,
  createProjectDocument,
  createProjectTask,
  createProject,
  createProjectTaskDependency,
  getAssignableUsers,
  getAuthMe,
  getDocumentStorageProviders,
  getDocumentTypes,
  getPermissions,
  getProjectDocumentSummary,
  getProjectDocuments,
  createRaidItem,
  deleteProject,
  deleteProjectTaskDependency,
  deleteProjectTask,
  deleteRaidItem,
  disableUser,
  enableUser,
  getMyTasks,
  getProjectBaseline,
  getProjectBaselines,
  getProject,
  getProjectAssumptions,
  getProjectDependencies,
  getProjectIssues,
  getProjectRisks,
  getProjectTaskDependencies,
  getProjects,
  purgeProject,
  removeProjectMember,
  restoreProject,
  updateRolePermissions,
  updateUser,
  updateProject,
  updateProjectMember,
  updateProjectTask,
  updateProjectTaskDependency,
  updateRaidItem,
} from "@/lib/api/client";

function mockFetch(
  response: unknown,
  init: { status?: number; ok?: boolean } = {},
) {
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

  it("loads project planning dependencies and baselines", async () => {
    const fetchMock = mockFetch([{ id: "dependency-1" }]);
    vi.stubGlobal("fetch", fetchMock);

    await getProjectTaskDependencies("project-1");
    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://localhost:3001/projects/project-1/task-dependencies",
      expect.any(Object),
    );

    await getProjectBaselines("project-1");
    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://localhost:3001/projects/project-1/baselines",
      expect.any(Object),
    );

    await getProjectBaseline("project-1", "baseline-1");
    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://localhost:3001/projects/project-1/baselines/baseline-1",
      expect.any(Object),
    );
  });

  it("loads project document links and storage providers", async () => {
    const fetchMock = mockFetch([{ id: "document-1", title: "ADR-015" }]);
    vi.stubGlobal("fetch", fetchMock);

    await getProjectDocuments("project-1", {
      approvalStatus: "APPROVED",
      category: "Architecture",
      documentType: "Architecture Diagram",
      reviewStatus: "CURRENT",
      sortBy: "title",
      sortDirection: "ASC",
      storageProvider: "CONFLUENCE",
      title: "ADR",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/projects/project-1/documents?approvalStatus=APPROVED&category=Architecture&documentType=Architecture+Diagram&reviewStatus=CURRENT&sortBy=title&sortDirection=ASC&storageProvider=CONFLUENCE&title=ADR",
      expect.any(Object),
    );

    await getDocumentStorageProviders();
    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://localhost:3001/documents/storage-providers",
      expect.any(Object),
    );

    await getDocumentTypes();
    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://localhost:3001/documents/document-types",
      expect.any(Object),
    );

    await getDocumentCategories();
    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://localhost:3001/documents/categories",
      expect.any(Object),
    );

    await getProjectDocumentSummary("project-1");
    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://localhost:3001/projects/project-1/documents/summary",
      expect.any(Object),
    );
  });

  it("creates project document links with metadata only", async () => {
    const fetchMock = mockFetch({ id: "document-1", title: "ADR-015" });
    vi.stubGlobal("fetch", fetchMock);

    await createProjectDocument({
      category: "Architecture",
      description: "Approved decision",
      documentType: "Architecture Diagram",
      externalUrl: "https://example.com/adr-015",
      ownerId: "user-1",
      projectId: "project-1",
      storageProvider: "CONFLUENCE",
      title: "ADR-015",
      version: "1.0",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/documents",
      expect.objectContaining({
        body: JSON.stringify({
          category: "Architecture",
          description: "Approved decision",
          documentType: "Architecture Diagram",
          externalUrl: "https://example.com/adr-015",
          ownerId: "user-1",
          projectId: "project-1",
          storageProvider: "CONFLUENCE",
          title: "ADR-015",
          version: "1.0",
        }),
        method: "POST",
      }),
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

  it("archives, restores, and permanently purges projects", async () => {
    const fetchMock = mockFetch({ id: "project-1", status: "archived" });
    vi.stubGlobal("fetch", fetchMock);

    await archiveProject("project-1");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/projects/project-1/archive",
      expect.objectContaining({ method: "POST" }),
    );

    await restoreProject("project-1");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/projects/project-1/restore",
      expect.objectContaining({ method: "POST" }),
    );

    fetchMock.mockResolvedValueOnce({
      headers: new Headers({ "content-length": "0" }),
      ok: true,
      status: 204,
    });
    await expect(purgeProject("project-1")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/projects/project-1/purge",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("creates, updates, and deletes project task dependencies", async () => {
    const fetchMock = mockFetch({ id: "dependency-1" });
    vi.stubGlobal("fetch", fetchMock);

    await createProjectTaskDependency("project-1", {
      dependencyType: "FS",
      lagDays: 2,
      predecessorTaskId: "task-1",
      successorTaskId: "task-2",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/projects/project-1/task-dependencies",
      expect.objectContaining({
        body: JSON.stringify({
          dependencyType: "FS",
          lagDays: 2,
          predecessorTaskId: "task-1",
          successorTaskId: "task-2",
        }),
        method: "POST",
      }),
    );

    await updateProjectTaskDependency("project-1", "dependency-1", {
      dependencyType: "SS",
      lagDays: 1,
    });

    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://localhost:3001/projects/project-1/task-dependencies/dependency-1",
      expect.objectContaining({
        body: JSON.stringify({
          dependencyType: "SS",
          lagDays: 1,
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

    await expect(
      deleteProjectTaskDependency("project-1", "dependency-1"),
    ).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://localhost:3001/projects/project-1/task-dependencies/dependency-1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("captures project baselines", async () => {
    const fetchMock = mockFetch({ id: "baseline-1" });
    vi.stubGlobal("fetch", fetchMock);

    await captureProjectBaseline("project-1", {
      name: "Approved Delivery Baseline",
      setAsCurrent: true,
      status: "approved",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/projects/project-1/baselines",
      expect.objectContaining({
        body: JSON.stringify({
          name: "Approved Delivery Baseline",
          setAsCurrent: true,
          status: "approved",
        }),
        method: "POST",
      }),
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
        role: "PROJECT_MANAGER",
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
        role: "PROJECT_MANAGER",
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
      parentTaskId: "summary-task-1",
      taskKind: "standard",
      assigneeId: "user-1",
      status: "todo",
      priority: "high",
      sequenceNumber: 20,
      plannedStartDate: "2026-07-01",
      plannedEndDate: "2026-07-10",
      actualStartDate: "2026-07-02",
      actualEndDate: null,
      estimatedHours: 16,
      remainingHours: 12,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/projects/project-1/tasks",
      expect.objectContaining({
        body: JSON.stringify({
          title: "Mobilise team",
          parentTaskId: "summary-task-1",
          taskKind: "standard",
          assigneeId: "user-1",
          status: "todo",
          priority: "high",
          sequenceNumber: 20,
          plannedStartDate: "2026-07-01",
          plannedEndDate: "2026-07-10",
          actualStartDate: "2026-07-02",
          actualEndDate: null,
          estimatedHours: 16,
          remainingHours: 12,
        }),
        method: "POST",
      }),
    );

    await updateProjectTask("project-1", "task-1", {
      parentTaskId: null,
      taskKind: "milestone",
      status: "in_progress",
      plannedStartDate: "2026-07-12",
      plannedEndDate: "2026-07-12",
      actualStartDate: null,
      actualEndDate: null,
      estimatedHours: 0,
      remainingHours: 0,
    });

    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://localhost:3001/projects/project-1/tasks/task-1",
      expect.objectContaining({
        body: JSON.stringify({
          parentTaskId: null,
          taskKind: "milestone",
          status: "in_progress",
          plannedStartDate: "2026-07-12",
          plannedEndDate: "2026-07-12",
          actualStartDate: null,
          actualEndDate: null,
          estimatedHours: 0,
          remainingHours: 0,
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
    await expect(
      deleteProjectTask("project-1", "task-1"),
    ).resolves.toBeUndefined();
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
      roles: [{ id: "role-1", name: "PROJECT_MANAGER" }],
      user: { id: "user-1", email: "pm@example.com" },
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getAuthMe()).resolves.toEqual({
      permissions: [{ id: "permission-1", key: "task.create" }],
      roles: [{ id: "role-1", name: "PROJECT_MANAGER" }],
      user: { id: "user-1", email: "pm@example.com" },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/auth/me",
      expect.any(Object),
    );
  });

  it("changes the authenticated user's password", async () => {
    const fetchMock = mockFetch({
      message: "Password changed successfully. Please sign in again.",
      requiresLogin: true,
      success: true,
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      changePassword({
        confirmPassword: "NewPass1!",
        currentPassword: "OldPass1!",
        newPassword: "NewPass1!",
      }),
    ).resolves.toEqual({
      message: "Password changed successfully. Please sign in again.",
      requiresLogin: true,
      success: true,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/auth/change-password",
      expect.objectContaining({
        body: JSON.stringify({
          confirmPassword: "NewPass1!",
          currentPassword: "OldPass1!",
          newPassword: "NewPass1!",
        }),
        method: "POST",
      }),
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

  it("calls user administration lifecycle endpoints", async () => {
    const fetchMock = mockFetch({ id: "user-1", status: "active" });
    vi.stubGlobal("fetch", fetchMock);

    await updateUser("user-1", {
      email: "user@example.com",
      firstName: "Ava",
      lastName: "Patel",
      roleId: "role-1",
    });
    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://localhost:3001/users/user-1",
      expect.objectContaining({
        body: JSON.stringify({
          email: "user@example.com",
          firstName: "Ava",
          lastName: "Patel",
          roleId: "role-1",
        }),
        method: "PATCH",
      }),
    );

    await adminResetUserPassword("user-1", "TempPass1!");
    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://localhost:3001/users/user-1/reset-password",
      expect.objectContaining({
        body: JSON.stringify({ temporaryPassword: "TempPass1!" }),
        method: "POST",
      }),
    );

    await disableUser("user-1");
    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://localhost:3001/users/user-1/disable",
      expect.objectContaining({ method: "POST" }),
    );

    await enableUser("user-1");
    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://localhost:3001/users/user-1/enable",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
