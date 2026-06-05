import { apiBaseUrl } from "@/lib/config/env";

export type ApiRole = {
  id: string;
  name: string;
};

export type ApiUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  role?: ApiRole | null;
};

export type ApiProject = {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  startDate?: string | null;
  targetEndDate?: string | null;
  ownerId?: string | null;
  owner?: ApiUser | null;
};

export type ApiTask = {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  assigneeId?: string | null;
  status: "backlog" | "todo" | "in_progress" | "blocked" | "done";
  priority: string;
  dueDate?: string | null;
  project?: ApiProject | null;
  assignee?: ApiUser | null;
};

export type ApiRaidItem = {
  id: string;
  type: "risk" | "assumption" | "issue" | "dependency";
  projectId: string;
  title: string;
  description?: string | null;
  ownerId?: string | null;
  status: string;
  severity?: string;
  probability?: string;
  impact?: string;
  mitigationPlan?: string | null;
  resolutionPlan?: string | null;
  validationStatus?: string;
  validationNotes?: string | null;
  dependsOn?: string | null;
  dueDate?: string | null;
  project?: ApiProject | null;
  owner?: ApiUser | null;
};

type RequestOptions = RequestInit & {
  token?: string | null;
};

export function getStoredAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem("pm_platform_access_token");
}

export function storeSession(accessToken: string, refreshToken: string) {
  window.localStorage.setItem("pm_platform_access_token", accessToken);
  window.localStorage.setItem("pm_platform_refresh_token", refreshToken);
}

export function clearSession() {
  window.localStorage.removeItem("pm_platform_access_token");
  window.localStorage.removeItem("pm_platform_refresh_token");
}

export async function apiRequest<T>(
  path: string,
  { token = getStoredAccessToken(), headers, ...options }: RequestOptions = {},
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (!response.ok) {
    let message = `Request failed with ${response.status}`;
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) {
        message = body.message.join(", ");
      } else if (body.message) {
        message = body.message;
      }
    } catch {
      // Keep the status-based message when the API returns no JSON body.
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function login(email: string, password: string) {
  return apiRequest<{ accessToken: string; refreshToken: string }>("/auth/login", {
    method: "POST",
    token: null,
    body: JSON.stringify({ email, password }),
  });
}

export function register(input: {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}) {
  return apiRequest<{ accessToken: string; refreshToken: string }>(
    "/auth/register",
    {
      method: "POST",
      token: null,
      body: JSON.stringify(input),
    },
  );
}

export function getProjects() {
  return apiRequest<ApiProject[]>("/projects");
}

export function createProject(input: {
  name: string;
  description?: string;
  status?: string;
  startDate?: string;
  targetEndDate?: string;
  ownerId?: string;
}) {
  return apiRequest<ApiProject>("/projects", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getUsers() {
  return apiRequest<ApiUser[]>("/users");
}

export function getRoles() {
  return apiRequest<ApiRole[]>("/users/roles");
}

export function createRole(input: { name: string; description?: string }) {
  return apiRequest<ApiRole>("/users/roles", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function createUser(input: {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  roleId: string;
  status?: string;
}) {
  return apiRequest<ApiUser>("/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getTasks() {
  return apiRequest<ApiTask[]>("/tasks");
}

export function createTask(input: {
  projectId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  status?: ApiTask["status"];
  priority?: string;
  dueDate?: string;
}) {
  return apiRequest<ApiTask>("/tasks", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getRaidItems() {
  return apiRequest<ApiRaidItem[]>("/raid");
}

export function createRaidItem(input: {
  type: ApiRaidItem["type"];
  projectId: string;
  title: string;
  description?: string;
  ownerId?: string;
  status?: string;
  severity?: string;
  probability?: string;
  impact?: string;
  mitigationPlan?: string;
  resolutionPlan?: string;
  validationStatus?: string;
  validationNotes?: string;
  dependsOn?: string;
  dueDate?: string;
}) {
  return apiRequest<ApiRaidItem>("/raid", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
