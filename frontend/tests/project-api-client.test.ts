import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addProjectMember,
  adminResetUserPassword,
  apiRequest,
  archiveProject,
  captureProjectBaseline,
  changePassword,
  clearSession,
  forgotPassword,
  getDocumentCategories,
  createProjectDocument,
  updateProjectDocument,
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
  downloadProjectExcel,
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
  recordProjectTaskExecutionUpdate,
  resetPassword,
  restoreProject,
  storeSession,
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

function createAccessToken(exp: number) {
  return `header.${window.btoa(JSON.stringify({ exp }))}.signature`;
}

function createDeferred<T>() {
  let reject!: (reason?: unknown) => void;
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function response(
  body: unknown,
  status = 200,
  extras: { blob?: () => Promise<Blob> } = {},
) {
  const text = typeof body === "undefined" ? "" : JSON.stringify(body);
  return {
    blob: extras.blob ?? vi.fn().mockResolvedValue(new Blob()),
    headers: { get: vi.fn(() => (text ? String(text.length) : null)) },
    json: vi.fn().mockResolvedValue(body),
    ok: status < 400,
    status,
    text: vi.fn().mockResolvedValue(text),
  } as unknown as Response;
}

describe("project API client", () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => storage.get(key) ?? null),
      removeItem: vi.fn((key: string) => storage.delete(key)),
      setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it("preserves the authentication header", async () => {
    vi.mocked(localStorage.getItem).mockImplementation((key: string) =>
      key === "pm_platform_access_token" ? "access-token" : null,
    );
    const fetchMock = mockFetch([{ id: "project-1", name: "ERP" }]);
    vi.stubGlobal("fetch", fetchMock);

    await getProjects();

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/projects",
      expect.objectContaining({
        headers: {
          Authorization: "Bearer access-token",
          "Content-Type": "application/json",
        },
      }),
    );
  });

  it("preserves normal HTTP errors", async () => {
    const fetchMock = mockFetch(
      { message: "Project access denied" },
      { status: 403 },
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getProjects()).rejects.toThrow("Project access denied");
  });

  it("refreshes an expired access token and retries the request once", async () => {
    const expiredAccessToken = createAccessToken(
      Math.floor(Date.now() / 1000) - 60,
    );
    vi.mocked(localStorage.getItem).mockImplementation((key: string) => {
      if (key === "pm_platform_access_token") return expiredAccessToken;
      if (key === "pm_platform_refresh_token") return "valid-refresh-token";
      return null;
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        headers: { get: vi.fn(() => null) },
        json: vi.fn().mockResolvedValue({ message: "Unauthorized" }),
        ok: false,
        status: 401,
        text: vi.fn(),
      })
      .mockResolvedValueOnce({
        headers: { get: vi.fn(() => null) },
        json: vi.fn().mockResolvedValue({
          accessToken: "new-access-token",
          refreshToken: "new-refresh-token",
        }),
        ok: true,
        status: 200,
        text: vi.fn(),
      })
      .mockImplementationOnce(
        mockFetch([{ id: "project-1", name: "ERP" }]),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getProjects()).resolves.toEqual([
      { id: "project-1", name: "ERP" },
    ]);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3001/auth/refresh",
      expect.objectContaining({
        body: JSON.stringify({ refreshToken: "valid-refresh-token" }),
        method: "POST",
      }),
    );
    expect(localStorage.setItem).toHaveBeenCalledWith(
      "pm_platform_access_token",
      "new-access-token",
    );
    expect(localStorage.setItem).toHaveBeenCalledWith(
      "pm_platform_refresh_token",
      "new-refresh-token",
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://localhost:3001/projects",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer new-access-token",
        }),
      }),
    );
  });

  it("clears an expired session when refresh is rejected", async () => {
    const expiredAccessToken = createAccessToken(
      Math.floor(Date.now() / 1000) - 60,
    );
    vi.mocked(localStorage.getItem).mockImplementation((key: string) => {
      if (key === "pm_platform_access_token") return expiredAccessToken;
      if (key === "pm_platform_refresh_token") return "invalid-refresh-token";
      return null;
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        headers: { get: vi.fn(() => null) },
        json: vi.fn().mockResolvedValue({ message: "Unauthorized" }),
        ok: false,
        status: 401,
        text: vi.fn(),
      })
      .mockResolvedValueOnce({
        headers: { get: vi.fn(() => null) },
        json: vi.fn().mockResolvedValue({ message: "Invalid refresh token" }),
        ok: false,
        status: 401,
        text: vi.fn(),
      });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getProjects()).rejects.toThrow(
      "Session expired. Please sign in again.",
    );
    expect(localStorage.removeItem).toHaveBeenCalledWith(
      "pm_platform_access_token",
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("preserves application-level 401 errors for a valid access token", async () => {
    const validAccessToken = createAccessToken(
      Math.floor(Date.now() / 1000) + 3_600,
    );
    vi.mocked(localStorage.getItem).mockImplementation((key: string) =>
      key === "pm_platform_access_token" ? validAccessToken : null,
    );
    const fetchMock = mockFetch(
      { message: "Current password is incorrect" },
      { status: 401 },
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      changePassword({
        confirmPassword: "new-password",
        currentPassword: "wrong-password",
        newPassword: "new-password",
      }),
    ).rejects.toThrow("Current password is incorrect");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(localStorage.removeItem).not.toHaveBeenCalled();
  });

  it("uses one refresh for concurrent expired requests", async () => {
    const expiredAccessToken = createAccessToken(
      Math.floor(Date.now() / 1000) - 60,
    );
    const refreshDeferred = createDeferred<Response>();
    storeSession(expiredAccessToken, "refresh-token-1");
    const fetchMock = vi.fn((url: string, options: RequestInit) => {
      if (url.endsWith("/auth/refresh")) {
        return refreshDeferred.promise;
      }
      if (
        (options.headers as Record<string, string>).Authorization ===
        `Bearer ${expiredAccessToken}`
      ) {
        return Promise.resolve(response({ message: "Unauthorized" }, 401));
      }
      return Promise.resolve(response([{ id: "project-1", name: "ERP" }]));
    });
    vi.stubGlobal("fetch", fetchMock);

    const requests = [getProjects(), getProjects(), getProjects()];
    await vi.waitFor(() => {
      expect(
        fetchMock.mock.calls.filter(([url]) =>
          String(url).endsWith("/auth/refresh"),
        ),
      ).toHaveLength(1);
    });
    refreshDeferred.resolve(
      response({
        accessToken: "access-token-2",
        refreshToken: "refresh-token-2",
      }),
    );

    await expect(Promise.all(requests)).resolves.toHaveLength(3);
    expect(
      fetchMock.mock.calls.filter(([url]) =>
        String(url).endsWith("/auth/refresh"),
      ),
    ).toHaveLength(1);
  });

  it("retries a late expired-token 401 with the exact completed refresh transition", async () => {
    const expiredAccessToken = createAccessToken(
      Math.floor(Date.now() / 1000) - 60,
    );
    const lateOriginalResponse = createDeferred<Response>();
    let oldTokenRequestCount = 0;
    storeSession(expiredAccessToken, "refresh-token-1");
    const fetchMock = vi.fn((url: string, options: RequestInit) => {
      if (url.endsWith("/auth/refresh")) {
        return Promise.resolve(
          response({
            accessToken: "access-token-2",
            refreshToken: "refresh-token-2",
          }),
        );
      }
      if (
        (options.headers as Record<string, string>).Authorization ===
        `Bearer ${expiredAccessToken}`
      ) {
        oldTokenRequestCount += 1;
        return oldTokenRequestCount === 1
          ? Promise.resolve(response({ message: "Unauthorized" }, 401))
          : lateOriginalResponse.promise;
      }
      return Promise.resolve(response([{ id: "project-1", name: "ERP" }]));
    });
    vi.stubGlobal("fetch", fetchMock);

    const firstRequest = getProjects();
    const lateRequest = getProjects();

    await expect(firstRequest).resolves.toEqual([
      { id: "project-1", name: "ERP" },
    ]);
    lateOriginalResponse.resolve(response({ message: "Unauthorized" }, 401));

    await expect(lateRequest).resolves.toEqual([
      { id: "project-1", name: "ERP" },
    ]);
    expect(
      fetchMock.mock.calls.filter(([url]) =>
        String(url).endsWith("/auth/refresh"),
      ),
    ).toHaveLength(1);
    expect(
      fetchMock.mock.calls.filter(
        ([url, options]) =>
          String(url).endsWith("/projects") &&
          (options.headers as Record<string, string>).Authorization ===
            "Bearer access-token-2",
      ),
    ).toHaveLength(2);
  });

  it("does not let a late old-generation 401 revive a logged-out session", async () => {
    const expiredAccessToken = createAccessToken(
      Math.floor(Date.now() / 1000) - 60,
    );
    const lateOriginalResponse = createDeferred<Response>();
    let oldTokenRequestCount = 0;
    storeSession(expiredAccessToken, "refresh-token-1");
    const fetchMock = vi.fn((url: string, options: RequestInit) => {
      if (url.endsWith("/auth/refresh")) {
        return Promise.resolve(
          response({
            accessToken: "access-token-2",
            refreshToken: "refresh-token-2",
          }),
        );
      }
      if (
        (options.headers as Record<string, string>).Authorization ===
        `Bearer ${expiredAccessToken}`
      ) {
        oldTokenRequestCount += 1;
        return oldTokenRequestCount === 1
          ? Promise.resolve(response({ message: "Unauthorized" }, 401))
          : lateOriginalResponse.promise;
      }
      return Promise.resolve(response([{ id: "project-1", name: "ERP" }]));
    });
    vi.stubGlobal("fetch", fetchMock);

    const firstRequest = getProjects();
    const lateRequest = getProjects();
    await expect(firstRequest).resolves.toHaveLength(1);
    clearSession();
    lateOriginalResponse.resolve(response({ message: "Unauthorized" }, 401));

    await expect(lateRequest).rejects.toThrow(
      "Session changed while the request was in progress.",
    );
    expect(localStorage.getItem("pm_platform_access_token")).toBeNull();
    expect(localStorage.getItem("pm_platform_refresh_token")).toBeNull();
    expect(
      fetchMock.mock.calls.filter(([url]) =>
        String(url).endsWith("/auth/refresh"),
      ),
    ).toHaveLength(1);
  });

  it("does not let a late old-generation 401 consume a newer login", async () => {
    const expiredAccessToken = createAccessToken(
      Math.floor(Date.now() / 1000) - 60,
    );
    const lateOriginalResponse = createDeferred<Response>();
    let oldTokenRequestCount = 0;
    storeSession(expiredAccessToken, "refresh-token-1");
    const fetchMock = vi.fn((url: string, options: RequestInit) => {
      if (url.endsWith("/auth/refresh")) {
        return Promise.resolve(
          response({
            accessToken: "access-token-2",
            refreshToken: "refresh-token-2",
          }),
        );
      }
      if (
        (options.headers as Record<string, string>).Authorization ===
        `Bearer ${expiredAccessToken}`
      ) {
        oldTokenRequestCount += 1;
        return oldTokenRequestCount === 1
          ? Promise.resolve(response({ message: "Unauthorized" }, 401))
          : lateOriginalResponse.promise;
      }
      return Promise.resolve(response([{ id: "project-1", name: "ERP" }]));
    });
    vi.stubGlobal("fetch", fetchMock);

    const firstRequest = getProjects();
    const lateRequest = getProjects();
    await expect(firstRequest).resolves.toHaveLength(1);
    storeSession("new-user-access-token", "new-user-refresh-token");
    lateOriginalResponse.resolve(response({ message: "Unauthorized" }, 401));

    await expect(lateRequest).rejects.toThrow(
      "Session changed while the request was in progress.",
    );
    expect(localStorage.getItem("pm_platform_access_token")).toBe(
      "new-user-access-token",
    );
    expect(localStorage.getItem("pm_platform_refresh_token")).toBe(
      "new-user-refresh-token",
    );
  });

  it("does not let a late old-generation 401 consume a newer refresh lineage", async () => {
    const firstExpiredAccessToken = createAccessToken(
      Math.floor(Date.now() / 1000) - 60,
    );
    const secondExpiredAccessToken = createAccessToken(
      Math.floor(Date.now() / 1000) - 30,
    );
    const lateOriginalResponse = createDeferred<Response>();
    let firstTokenRequestCount = 0;
    let refreshRequestCount = 0;
    let secondTokenRequestCount = 0;
    storeSession(firstExpiredAccessToken, "refresh-token-1");
    const fetchMock = vi.fn((url: string, options: RequestInit) => {
      if (url.endsWith("/auth/refresh")) {
        refreshRequestCount += 1;
        return Promise.resolve(
          response(
            refreshRequestCount === 1
              ? {
                  accessToken: secondExpiredAccessToken,
                  refreshToken: "refresh-token-2",
                }
              : {
                  accessToken: "access-token-3",
                  refreshToken: "refresh-token-3",
                },
          ),
        );
      }
      const authorization = (options.headers as Record<string, string>)
        .Authorization;
      if (authorization === `Bearer ${firstExpiredAccessToken}`) {
        firstTokenRequestCount += 1;
        return firstTokenRequestCount === 1
          ? Promise.resolve(response({ message: "Unauthorized" }, 401))
          : lateOriginalResponse.promise;
      }
      if (authorization === `Bearer ${secondExpiredAccessToken}`) {
        secondTokenRequestCount += 1;
        return Promise.resolve(
          secondTokenRequestCount === 1
            ? response([{ id: "project-1", name: "ERP" }])
            : response({ message: "Unauthorized" }, 401),
        );
      }
      return Promise.resolve(response([{ id: "project-1", name: "ERP" }]));
    });
    vi.stubGlobal("fetch", fetchMock);

    const firstRequest = getProjects();
    const lateRequest = getProjects();
    await expect(firstRequest).resolves.toHaveLength(1);
    await expect(getProjects()).resolves.toHaveLength(1);
    lateOriginalResponse.resolve(response({ message: "Unauthorized" }, 401));

    await expect(lateRequest).rejects.toThrow(
      "Session changed while the request was in progress.",
    );
    expect(refreshRequestCount).toBe(2);
    expect(localStorage.getItem("pm_platform_access_token")).toBe(
      "access-token-3",
    );
  });

  it("does not resurrect a session when logout occurs during refresh", async () => {
    const expiredAccessToken = createAccessToken(
      Math.floor(Date.now() / 1000) - 60,
    );
    const refreshDeferred = createDeferred<Response>();
    storeSession(expiredAccessToken, "refresh-token-1");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ message: "Unauthorized" }, 401))
      .mockImplementationOnce(() => refreshDeferred.promise);
    vi.stubGlobal("fetch", fetchMock);

    const request = getProjects();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    clearSession();
    refreshDeferred.resolve(
      response({
        accessToken: "access-token-2",
        refreshToken: "refresh-token-2",
      }),
    );

    await expect(request).rejects.toThrow(
      "Session changed while the request was in progress.",
    );
    expect(localStorage.getItem("pm_platform_access_token")).toBeNull();
    expect(localStorage.getItem("pm_platform_refresh_token")).toBeNull();
  });

  it("does not let a successful old refresh overwrite a newer login", async () => {
    const expiredAccessToken = createAccessToken(
      Math.floor(Date.now() / 1000) - 60,
    );
    const refreshDeferred = createDeferred<Response>();
    storeSession(expiredAccessToken, "old-refresh-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ message: "Unauthorized" }, 401))
      .mockImplementationOnce(() => refreshDeferred.promise);
    vi.stubGlobal("fetch", fetchMock);

    const oldRequest = getProjects();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    clearSession();
    storeSession("new-user-access-token", "new-user-refresh-token");
    refreshDeferred.resolve(
      response({
        accessToken: "old-user-access-token-2",
        refreshToken: "old-user-refresh-token-2",
      }),
    );

    await expect(oldRequest).rejects.toThrow(
      "Session changed while the request was in progress.",
    );
    expect(localStorage.getItem("pm_platform_access_token")).toBe(
      "new-user-access-token",
    );
    expect(localStorage.getItem("pm_platform_refresh_token")).toBe(
      "new-user-refresh-token",
    );
  });

  it("does not let a failed old refresh clear a newer login", async () => {
    const expiredAccessToken = createAccessToken(
      Math.floor(Date.now() / 1000) - 60,
    );
    const refreshDeferred = createDeferred<Response>();
    storeSession(expiredAccessToken, "old-refresh-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ message: "Unauthorized" }, 401))
      .mockImplementationOnce(() => refreshDeferred.promise);
    vi.stubGlobal("fetch", fetchMock);

    const oldRequest = getProjects();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    clearSession();
    storeSession("new-user-access-token", "new-user-refresh-token");
    refreshDeferred.resolve(response({ message: "Invalid refresh token" }, 401));

    await expect(oldRequest).rejects.toThrow(
      "Session expired. Please sign in again.",
    );
    expect(localStorage.getItem("pm_platform_access_token")).toBe(
      "new-user-access-token",
    );
    expect(localStorage.getItem("pm_platform_refresh_token")).toBe(
      "new-user-refresh-token",
    );
  });

  it.each([
    [401, "Current password is incorrect"],
    [403, "Project access denied"],
    [500, "Unexpected service failure"],
  ])(
    "surfaces a retry %s without refreshing again",
    async (status, message) => {
      const expiredAccessToken = createAccessToken(
        Math.floor(Date.now() / 1000) - 60,
      );
      storeSession(expiredAccessToken, "refresh-token-1");
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(response({ message: "Unauthorized" }, 401))
        .mockResolvedValueOnce(
          response({
            accessToken: "access-token-2",
            refreshToken: "refresh-token-2",
          }),
        )
        .mockResolvedValueOnce(response({ message }, status));
      vi.stubGlobal("fetch", fetchMock);

      await expect(getProjects()).rejects.toThrow(message);
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(localStorage.getItem("pm_platform_access_token")).toBe(
        "access-token-2",
      );
    },
  );

  it("lets one caller abort without cancelling another caller's refresh", async () => {
    const expiredAccessToken = createAccessToken(
      Math.floor(Date.now() / 1000) - 60,
    );
    const refreshDeferred = createDeferred<Response>();
    const firstController = new AbortController();
    storeSession(expiredAccessToken, "refresh-token-1");
    const fetchMock = vi.fn((url: string, options: RequestInit) => {
      if (url.endsWith("/auth/refresh")) {
        return refreshDeferred.promise;
      }
      if (
        (options.headers as Record<string, string>).Authorization ===
        `Bearer ${expiredAccessToken}`
      ) {
        return Promise.resolve(response({ message: "Unauthorized" }, 401));
      }
      return Promise.resolve(response([{ id: "project-1", name: "ERP" }]));
    });
    vi.stubGlobal("fetch", fetchMock);

    const abortedRequest = apiRequest("/projects", {
      signal: firstController.signal,
    });
    const activeRequest = getProjects();
    await vi.waitFor(() => {
      expect(
        fetchMock.mock.calls.filter(([url]) =>
          String(url).endsWith("/auth/refresh"),
        ),
      ).toHaveLength(1);
    });
    firstController.abort();
    const abortedExpectation = expect(abortedRequest).rejects.toMatchObject({
      name: "AbortError",
    });
    refreshDeferred.resolve(
      response({
        accessToken: "access-token-2",
        refreshToken: "refresh-token-2",
      }),
    );

    await abortedExpectation;
    await expect(activeRequest).resolves.toEqual([
      { id: "project-1", name: "ERP" },
    ]);
    expect(localStorage.getItem("pm_platform_access_token")).toBe(
      "access-token-2",
    );
  });

  it("enforces the normal deadline while refresh is pending", async () => {
    vi.useFakeTimers();
    const expiredAccessToken = createAccessToken(
      Math.floor(Date.now() / 1000) - 60,
    );
    storeSession(expiredAccessToken, "refresh-token-1");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ message: "Unauthorized" }, 401))
      .mockImplementationOnce(
        (_url: string, options: RequestInit) =>
          new Promise((_resolve, reject) => {
            options.signal?.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            );
          }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const expectation = expect(getProjects()).rejects.toThrow(
      "Request timed out after 60 seconds.",
    );
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(60_000);

    await expectation;
    expect(vi.getTimerCount()).toBe(0);
  });

  it("enforces the normal deadline while the retry is pending", async () => {
    vi.useFakeTimers();
    const expiredAccessToken = createAccessToken(
      Math.floor(Date.now() / 1000) - 60,
    );
    storeSession(expiredAccessToken, "refresh-token-1");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ message: "Unauthorized" }, 401))
      .mockResolvedValueOnce(
        response({
          accessToken: "access-token-2",
          refreshToken: "refresh-token-2",
        }),
      )
      .mockImplementationOnce(
        (_url: string, options: RequestInit) =>
          new Promise((_resolve, reject) => {
            options.signal?.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            );
          }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const expectation = expect(getProjects()).rejects.toThrow(
      "Request timed out after 60 seconds.",
    );
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(60_000);

    await expectation;
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cleans up timers after refresh and retry complete", async () => {
    vi.useFakeTimers();
    const expiredAccessToken = createAccessToken(
      Math.floor(Date.now() / 1000) - 60,
    );
    storeSession(expiredAccessToken, "refresh-token-1");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ message: "Unauthorized" }, 401))
      .mockResolvedValueOnce(
        response({
          accessToken: "access-token-2",
          refreshToken: "refresh-token-2",
        }),
      )
      .mockResolvedValueOnce(response([{ id: "project-1", name: "ERP" }]));
    vi.stubGlobal("fetch", fetchMock);

    await getProjects();

    expect(vi.getTimerCount()).toBe(0);
  });

  it("converts an application timeout into a clear error", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(
      (_url: string, options: RequestInit) =>
        new Promise((_resolve, reject) => {
          options.signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted", "AbortError"));
          });
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const expectation = expect(getProjects()).rejects.toThrow(
      "Request timed out after 60 seconds.",
    );
    await vi.advanceTimersByTimeAsync(60_000);

    await expectation;
  });

  it("cleans up the timeout after a request completes", async () => {
    vi.useFakeTimers();
    const fetchMock = mockFetch([{ id: "project-1", name: "ERP" }]);
    vi.stubGlobal("fetch", fetchMock);

    await getProjects();

    expect(vi.getTimerCount()).toBe(0);
  });

  it("uses the longer timeout for Excel exports", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(
      (_url: string, options: RequestInit) =>
        new Promise((_resolve, reject) => {
          options.signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted", "AbortError"));
          });
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const expectation = expect(downloadProjectExcel("project-1")).rejects.toThrow(
      "Request timed out after 120 seconds.",
    );
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock.mock.calls[0][1].signal).not.toHaveProperty("aborted", true);
    await vi.advanceTimersByTimeAsync(60_000);

    await expectation;
  });

  it("refreshes an expired session and retries an Excel export", async () => {
    const expiredAccessToken = createAccessToken(
      Math.floor(Date.now() / 1000) - 60,
    );
    const exportBlob = new Blob(["workbook"]);
    storeSession(expiredAccessToken, "refresh-token-1");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ message: "Unauthorized" }, 401))
      .mockResolvedValueOnce(
        response({
          accessToken: "access-token-2",
          refreshToken: "refresh-token-2",
        }),
      )
      .mockResolvedValueOnce(
        response(undefined, 200, {
          blob: vi.fn().mockResolvedValue(exportBlob),
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(downloadProjectExcel("project-1")).resolves.toBe(exportBlob);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(localStorage.getItem("pm_platform_access_token")).toBe(
      "access-token-2",
    );
    expect(localStorage.getItem("pm_platform_refresh_token")).toBe(
      "refresh-token-2",
    );
  });

  it("clears the current session when Excel export refresh fails", async () => {
    const expiredAccessToken = createAccessToken(
      Math.floor(Date.now() / 1000) - 60,
    );
    storeSession(expiredAccessToken, "invalid-refresh-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ message: "Unauthorized" }, 401))
      .mockResolvedValueOnce(response({ message: "Invalid refresh token" }, 401));
    vi.stubGlobal("fetch", fetchMock);

    await expect(downloadProjectExcel("project-1")).rejects.toThrow(
      "Session expired. Please sign in again.",
    );
    expect(localStorage.getItem("pm_platform_access_token")).toBeNull();
    expect(localStorage.getItem("pm_platform_refresh_token")).toBeNull();
  });

  it("surfaces an Excel retry 401 without another refresh", async () => {
    const expiredAccessToken = createAccessToken(
      Math.floor(Date.now() / 1000) - 60,
    );
    storeSession(expiredAccessToken, "refresh-token-1");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ message: "Unauthorized" }, 401))
      .mockResolvedValueOnce(
        response({
          accessToken: "access-token-2",
          refreshToken: "refresh-token-2",
        }),
      )
      .mockResolvedValueOnce(response({ message: "Unauthorized" }, 401));
    vi.stubGlobal("fetch", fetchMock);

    await expect(downloadProjectExcel("project-1")).rejects.toThrow(
      "Unable to export project (401)",
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(localStorage.getItem("pm_platform_access_token")).toBe(
      "access-token-2",
    );
  });

  it("aborts an Excel caller while shared refresh remains independent", async () => {
    const expiredAccessToken = createAccessToken(
      Math.floor(Date.now() / 1000) - 60,
    );
    const controller = new AbortController();
    const refreshDeferred = createDeferred<Response>();
    storeSession(expiredAccessToken, "refresh-token-1");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ message: "Unauthorized" }, 401))
      .mockImplementationOnce(() => refreshDeferred.promise);
    vi.stubGlobal("fetch", fetchMock);

    const request = downloadProjectExcel("project-1", {
      signal: controller.signal,
    });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const expectation = expect(request).rejects.toMatchObject({
      name: "AbortError",
    });
    controller.abort();
    await expectation;
    refreshDeferred.resolve(
      response({
        accessToken: "access-token-2",
        refreshToken: "refresh-token-2",
      }),
    );
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem("pm_platform_access_token")).toBe(
      expiredAccessToken,
    );
    expect(localStorage.getItem("pm_platform_refresh_token")).toBe(
      "refresh-token-1",
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

  it("updates project document metadata through PATCH", async () => {
    const fetchMock = mockFetch({ id: "document-1", title: "Business HLD" });
    vi.stubGlobal("fetch", fetchMock);

    await updateProjectDocument("document-1", {
      approvalStatus: "APPROVED",
      category: "Business",
      documentType: "HLD",
      title: "Business HLD",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/documents/document-1",
      expect.objectContaining({
        body: JSON.stringify({
          approvalStatus: "APPROVED",
          category: "Business",
          documentType: "HLD",
          title: "Business HLD",
        }),
        method: "PATCH",
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

    await getAssignableUsers("project-1");
    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://localhost:3001/users/assignable?projectId=project-1",
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

    await recordProjectTaskExecutionUpdate("project-1", "task-1", {
      assigneeId: "user-2",
      nextActionOwnerId: "user-1",
      nextStep: "Confirm API owner",
      percentComplete: 65,
      priority: "critical",
      status: "in_progress",
      targetCompletionDate: "2026-08-07",
      updateNotes: "Customer asked for acceleration.",
    });

    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://localhost:3001/projects/project-1/tasks/task-1/execution-updates",
      expect.objectContaining({
        body: JSON.stringify({
          assigneeId: "user-2",
          nextActionOwnerId: "user-1",
          nextStep: "Confirm API owner",
          percentComplete: 65,
          priority: "critical",
          status: "in_progress",
          targetCompletionDate: "2026-08-07",
          updateNotes: "Customer asked for acceleration.",
        }),
        method: "POST",
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

  it("requests a password reset without requiring a session token", async () => {
    const fetchMock = mockFetch({
      message:
        "If an account exists for that email, password reset instructions will be sent.",
      success: true,
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(forgotPassword("user@example.com")).resolves.toEqual({
      message:
        "If an account exists for that email, password reset instructions will be sent.",
      success: true,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/auth/forgot-password",
      expect.objectContaining({
        body: JSON.stringify({ email: "user@example.com" }),
        method: "POST",
      }),
    );
    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty(
      "Authorization",
    );
  });

  it("resets a password with a reset token without requiring a session token", async () => {
    const fetchMock = mockFetch({
      message: "Password reset successfully. Please sign in.",
      success: true,
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      resetPassword({
        confirmPassword: "NewPass1!",
        newPassword: "NewPass1!",
        token: "reset-token",
      }),
    ).resolves.toEqual({
      message: "Password reset successfully. Please sign in.",
      success: true,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/auth/reset-password",
      expect.objectContaining({
        body: JSON.stringify({
          confirmPassword: "NewPass1!",
          newPassword: "NewPass1!",
          token: "reset-token",
        }),
        method: "POST",
      }),
    );
    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty(
      "Authorization",
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
