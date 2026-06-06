import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createProject,
  deleteProject,
  getProject,
  getProjects,
  updateProject,
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
});
