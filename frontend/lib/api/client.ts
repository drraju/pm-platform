import { apiBaseUrl } from "@/lib/config/env";

export type ApiRole = {
  id: string;
  name: string;
  description?: string | null;
  permissions?: ApiPermission[];
};

export type ApiPermission = {
  id: string;
  key: string;
  description?: string | null;
};

export type ApiUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  role?: ApiRole | null;
};

export type ApiAssignableUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  role?: string | null;
  status?: string;
};

export type ApiSessionUser = {
  email: string;
  roleId: string;
  userId: string;
};

export type ApiAuthMe = {
  user: ApiUser;
  roles: ApiRole[];
  permissions: ApiPermission[];
};

export type ApiProjectHealthStatus = "GREEN" | "AMBER" | "RED";

export type ApiProjectHealth = {
  status: ApiProjectHealthStatus;
  reasons: string[];
};

export type ApiProject = {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  startDate?: string | null;
  targetEndDate?: string | null;
  ownerId?: string | null;
  businessOwnerId?: string | null;
  executiveSponsorId?: string | null;
  deliveryLeadId?: string | null;
  owner?: ApiUser | null;
  businessOwner?: ApiUser | null;
  executiveSponsor?: ApiUser | null;
  deliveryLead?: ApiUser | null;
  members?: ApiProjectMember[];
  tasks?: ApiTask[];
  risks?: ApiRaidItem[];
  issues?: ApiRaidItem[];
  health?: ApiProjectHealth;
  createdAt?: string;
  updatedAt?: string;
};

export type ApiProjectMember = {
  id: string;
  projectId?: string;
  userId: string;
  role: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    displayName?: string;
    role?: string | null;
    status?: string;
  } | null;
};

export type ApiTask = {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  assigneeId?: string | null;
  status: "backlog" | "todo" | "in_progress" | "blocked" | "done";
  priority: string;
  remarks?: string | null;
  percentComplete?: number;
  startDate?: string | null;
  dueDate?: string | null;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
  project?: ApiProject | null;
  assignee?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    displayName?: string;
    role?: ApiRole | string | null;
    status?: string;
  } | null;
};

export type ApiProjectDetails = ApiProject & {
  members?: ApiProjectMember[];
  tasks?: ApiTask[];
  risks?: ApiRaidItem[];
  issues?: ApiRaidItem[];
  assumptions?: ApiRaidItem[];
  dependencies?: ApiRaidItem[];
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
  priority?: string;
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
  comments?: ApiRaidComment[];
  history?: ApiRaidHistoryEntry[];
};

export type ApiRaidComment = {
  id: string;
  raidItemId: string;
  raidType: ApiRaidItem["type"];
  projectId: string;
  body: string;
  authorId?: string | null;
  author?: ApiUser | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiRaidHistoryEntry = {
  id: string;
  raidItemId: string;
  raidType: ApiRaidItem["type"];
  projectId: string;
  action: string;
  fieldName?: string | null;
  previousValue?: string | null;
  nextValue?: string | null;
  changes?: Record<
    string,
    { previousValue: string | null; nextValue: string | null }
  > | null;
  actorId?: string | null;
  actor?: ApiUser | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiTaskSummary = {
  total: number;
  todo: number;
  inProgress: number;
  blocked: number;
  completed: number;
  overdue: number;
};

export type ApiDashboardProject = {
  id: string;
  name: string;
  status: string;
  role: string;
  health?: ApiProjectHealth;
};

export type ApiDashboardTask = {
  id: string;
  title: string;
  dueDate: string | null;
  projectName: string;
};

export type ApiDashboardRisk = {
  id: string;
  title: string;
  severity: string;
  projectName: string;
};

export type ApiDashboardIssue = {
  id: string;
  title: string;
  priority: string;
  projectName: string;
};

export type ApiMeDashboard = {
  assignedProjects: ApiDashboardProject[];
  taskSummary: ApiTaskSummary;
  overdueTasks: ApiDashboardTask[];
  upcomingTasks: ApiDashboardTask[];
  openRisks: ApiDashboardRisk[];
  openIssues: ApiDashboardIssue[];
  health: ApiProjectHealth;
};

export type ApiPortfolioSummary = {
  totalProjects: number;
  greenProjects: number;
  amberProjects: number;
  redProjects: number;
  projectsRequiringAttention: ApiPortfolioProjectAttention[];
  openRisksBySeverity: ApiSeverityCounts;
  openIssuesByPriority: ApiSeverityCounts;
  overdueTasks: ApiPortfolioOverdueTasks;
  upcomingMilestones: ApiPortfolioUpcomingMilestone[];
};

export type ApiPortfolioProjectAttention = {
  id: string;
  name: string;
  healthStatus: ApiProjectHealthStatus;
  reasons: string[];
};

export type ApiSeverityCounts = {
  critical: number;
  high: number;
  medium: number;
  low: number;
};

export type ApiPortfolioOverdueTasks = {
  total: number;
  projects: ApiPortfolioOverdueTaskProject[];
};

export type ApiPortfolioOverdueTaskProject = {
  projectId: string;
  projectName: string;
  overdueTaskCount: number;
};

export type ApiPortfolioUpcomingMilestone = {
  taskId: string;
  title: string;
  projectId: string;
  projectName: string;
  dueDate: string;
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

export function getStoredSessionUser(): ApiSessionUser | null {
  const token = getStoredAccessToken();
  if (!token) {
    return null;
  }

  try {
    const [, payload] = token.split(".");
    if (!payload) {
      return null;
    }

    const normalizedPayload = payload.replaceAll("-", "+").replaceAll("_", "/");
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      "=",
    );
    const decodedPayload = JSON.parse(window.atob(paddedPayload)) as {
      email?: string;
      roleId?: string;
      sub?: string;
    };

    if (!decodedPayload.sub || !decodedPayload.email || !decodedPayload.roleId) {
      return null;
    }

    return {
      email: decodedPayload.email,
      roleId: decodedPayload.roleId,
      userId: decodedPayload.sub,
    };
  } catch {
    return null;
  }
}

export function storeSession(accessToken: string, refreshToken: string) {
  window.localStorage.setItem("pm_platform_access_token", accessToken);
  window.localStorage.setItem("pm_platform_refresh_token", refreshToken);
}

export function clearSession() {
  window.localStorage.removeItem("pm_platform_access_token");
  window.localStorage.removeItem("pm_platform_refresh_token");
  window.localStorage.removeItem("pm_platform_permissions");
  window.localStorage.removeItem("pm_platform_session_user");
}

export function getStoredPermissionKeys() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedPermissions = window.localStorage.getItem("pm_platform_permissions");
    return storedPermissions ? (JSON.parse(storedPermissions) as string[]) : [];
  } catch {
    return [];
  }
}

export function storeAuthMe(authMe: ApiAuthMe) {
  window.localStorage.setItem(
    "pm_platform_permissions",
    JSON.stringify(authMe.permissions.map((permission) => permission.key)),
  );
  window.localStorage.setItem("pm_platform_session_user", JSON.stringify(authMe.user));
}

export async function apiRequest<T>(
  path: string,
  { token = getStoredAccessToken(), headers, ...options }: RequestOptions = {},
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    cache: "no-store",
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

export function getAuthMe() {
  return apiRequest<ApiAuthMe>("/auth/me");
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

export function getMyDashboard() {
  return apiRequest<ApiMeDashboard>("/dashboard/me");
}

export function getPortfolioSummary() {
  return apiRequest<ApiPortfolioSummary>("/portfolio/summary");
}

export function getProject(projectId: string) {
  return apiRequest<ApiProjectDetails>(`/projects/${projectId}`);
}

export function getProjectRisks(projectId: string) {
  return apiRequest<ApiRaidItem[]>(`/projects/${projectId}/risks`);
}

export function getProjectIssues(projectId: string) {
  return apiRequest<ApiRaidItem[]>(`/projects/${projectId}/issues`);
}

export function getProjectAssumptions(projectId: string) {
  return apiRequest<ApiRaidItem[]>(`/projects/${projectId}/assumptions`);
}

export function getProjectDependencies(projectId: string) {
  return apiRequest<ApiRaidItem[]>(`/projects/${projectId}/dependencies`);
}

export function createProject(input: {
  name: string;
  description?: string;
  status?: string;
  startDate?: string;
  targetEndDate?: string;
  ownerId?: string;
  businessOwnerId?: string;
  executiveSponsorId?: string;
  deliveryLeadId?: string;
}) {
  return apiRequest<ApiProject>("/projects", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateProject(
  projectId: string,
  input: {
    name?: string;
    description?: string;
    status?: string;
    startDate?: string;
    targetEndDate?: string;
    ownerId?: string;
    businessOwnerId?: string;
    executiveSponsorId?: string;
    deliveryLeadId?: string;
  },
) {
  return apiRequest<ApiProjectDetails>(`/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteProject(projectId: string) {
  return apiRequest<void>(`/projects/${projectId}`, {
    method: "DELETE",
  });
}

export function getProjectMembers(projectId: string) {
  return apiRequest<ApiProjectMember[]>(`/projects/${projectId}/members`);
}

export function addProjectMember(
  projectId: string,
  input: {
    userId: string;
    role?: string;
  },
) {
  return apiRequest<ApiProjectMember>(`/projects/${projectId}/members`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateProjectMember(
  projectId: string,
  userId: string,
  input: {
    role: string;
  },
) {
  return apiRequest<ApiProjectMember>(
    `/projects/${projectId}/members/${userId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export function removeProjectMember(projectId: string, userId: string) {
  return apiRequest<void>(`/projects/${projectId}/members/${userId}`, {
    method: "DELETE",
  });
}

export function getUsers() {
  return apiRequest<ApiUser[]>("/users");
}

export function getAssignableUsers() {
  return apiRequest<ApiAssignableUser[]>("/users/assignable");
}

export function getRoles() {
  return apiRequest<ApiRole[]>("/users/roles");
}

export function getPermissions() {
  return apiRequest<ApiPermission[]>("/users/permissions");
}

export function createRole(input: { name: string; description?: string }) {
  return apiRequest<ApiRole>("/users/roles", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateRolePermissions(roleId: string, permissionKeys: string[]) {
  return apiRequest<ApiRole>(`/users/roles/${roleId}/permissions`, {
    method: "PATCH",
    body: JSON.stringify({ permissionKeys }),
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

export function getMyTasks(input: {
  priority?: string;
  projectId?: string;
  status?: ApiTask["status"];
} = {}) {
  const params = new URLSearchParams();
  if (input.priority) {
    params.set("priority", input.priority);
  }
  if (input.projectId) {
    params.set("projectId", input.projectId);
  }
  if (input.status) {
    params.set("status", input.status);
  }

  const queryString = params.toString();
  return apiRequest<ApiTask[]>(
    queryString ? `/tasks/my?${queryString}` : "/tasks/my",
  );
}

export function createTask(input: {
  projectId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  status?: ApiTask["status"];
  priority?: string;
  remarks?: string;
  percentComplete?: number;
  startDate?: string;
  dueDate?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
}) {
  return apiRequest<ApiTask>("/tasks", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateTask(
  taskId: string,
  input: {
    projectId?: string;
    title?: string;
    description?: string;
    assigneeId?: string;
    status?: ApiTask["status"];
    priority?: string;
    remarks?: string;
    percentComplete?: number;
    startDate?: string;
    dueDate?: string;
    plannedStartDate?: string;
    plannedEndDate?: string;
    actualStartDate?: string;
    actualEndDate?: string;
  },
) {
  return apiRequest<ApiTask>(`/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function getProjectTasks(projectId: string) {
  return apiRequest<ApiTask[]>(`/projects/${projectId}/tasks`);
}

export function createProjectTask(
  projectId: string,
  input: {
    title: string;
    description?: string;
    assigneeId?: string;
    status?: ApiTask["status"];
    priority?: string;
    remarks?: string;
    percentComplete?: number;
    startDate?: string;
    dueDate?: string;
    plannedStartDate?: string;
    plannedEndDate?: string;
    actualStartDate?: string;
    actualEndDate?: string;
  },
) {
  return apiRequest<ApiTask>(`/projects/${projectId}/tasks`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateProjectTask(
  projectId: string,
  taskId: string,
  input: {
    title?: string;
    description?: string;
    assigneeId?: string;
    status?: ApiTask["status"];
    priority?: string;
    remarks?: string;
    percentComplete?: number;
    startDate?: string;
    dueDate?: string;
    plannedStartDate?: string;
    plannedEndDate?: string;
    actualStartDate?: string;
    actualEndDate?: string;
  },
) {
  return apiRequest<ApiTask>(`/projects/${projectId}/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteProjectTask(projectId: string, taskId: string) {
  return apiRequest<void>(`/projects/${projectId}/tasks/${taskId}`, {
    method: "DELETE",
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

export function updateRaidItem(
  itemId: string,
  input: Partial<{
    title: string;
    description: string;
    ownerId: string | null;
    status: string;
    severity: string;
    probability: string;
    impact: string;
    mitigationPlan: string | null;
    resolutionPlan: string | null;
    validationStatus: string;
    validationNotes: string | null;
    dependsOn: string | null;
    dueDate: string | null;
  }>,
) {
  return apiRequest<ApiRaidItem>(`/raid/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteRaidItem(itemId: string) {
  return apiRequest<void>(`/raid/${itemId}`, {
    method: "DELETE",
  });
}

export function addRaidComment(itemId: string, input: { body: string }) {
  return apiRequest<ApiRaidItem>(`/raid/${itemId}/comments`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
