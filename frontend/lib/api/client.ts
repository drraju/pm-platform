import { apiBaseUrl } from "@/lib/config/env";

export type ApiRole = {
  id: string;
  name: string;
  description?: string | null;
  status?: string;
  permissions?: ApiPermission[];
};

export type ApiPermission = {
  id: string;
  key: string;
  description?: string | null;
  category: string;
};

export type ApiUser = {
  id: string;
  email: string;
  username?: string | null;
  firstName: string;
  lastName: string;
  status: string;
  role?: ApiRole | null;
};

export type ApiAuthProfile = {
  userId: string;
  email: string;
  roleId: string;
  roleName: string;
  permissions: string[];
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
  owner?: ApiUser | null;
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
  visibilityLevel?: "INTERNAL" | "PARTNER" | "CUSTOMER";
  user?: ApiUser | null;
  project?: ApiProject | null;
};

export type ApiTask = {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  assigneeId?: string | null;
  status: "backlog" | "todo" | "in_progress" | "blocked" | "done";
  priority: string;
  type?: string;
  startDate?: string | null;
  dueDate?: string | null;
  project?: ApiProject | null;
  assignee?: ApiUser | null;
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
  sourceTaskId?: string | null;
  targetTaskId?: string | null;
  dependencyType?:
    | "finish_to_start"
    | "start_to_start"
    | "finish_to_finish"
    | "start_to_finish";
  project?: ApiProject | null;
  owner?: ApiUser | null;
};

export type ApiTimelineTask = {
  id: string;
  title: string;
  status: ApiTask["status"];
  startDate: string | null;
  dueDate: string | null;
  assignee: string | null;
};

export type ApiTimelineMilestone = {
  id: string;
  title: string;
  targetDate: string | null;
};

export type ApiTimelineDependency = {
  sourceTaskId: string;
  targetTaskId: string;
  type:
    | "finish_to_start"
    | "start_to_start"
    | "finish_to_finish"
    | "start_to_finish";
};

export type ApiProjectTimeline = {
  projectId: string;
  projectName: string;
  tasks: ApiTimelineTask[];
  milestones: ApiTimelineMilestone[];
  dependencies: ApiTimelineDependency[];
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

export type ApiExecutivePortfolioHealth = {
  totalProjects: number;
  greenProjects: number;
  amberProjects: number;
  redProjects: number;
};

export type ApiExecutiveDelivery = {
  overdueTasks: number;
  upcomingMilestones: number;
};

export type ApiExecutiveGovernance = {
  openRisks: number;
  openIssues: number;
};

export type ApiExecutiveSummary = {
  portfolioHealth: ApiExecutivePortfolioHealth;
  delivery: ApiExecutiveDelivery;
  governance: ApiExecutiveGovernance;
  projectsRequiringAttention: ApiPortfolioProjectAttention[];
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
  return apiRequest<{ accessToken: string; refreshToken: string }>(
    "/auth/login",
    {
      method: "POST",
      token: null,
      body: JSON.stringify({ email, password }),
    },
  );
}

export function register(input: {
  email: string;
  username?: string;
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

export function getAuthProfile() {
  return apiRequest<ApiAuthProfile>("/auth/me");
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

export function getExecutiveSummary() {
  return apiRequest<ApiExecutiveSummary>("/executive/summary");
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

export function getProjectTimeline(projectId: string) {
  return apiRequest<ApiProjectTimeline>(`/projects/${projectId}/timeline`);
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

export function updateProject(
  projectId: string,
  input: {
    name?: string;
    description?: string;
    status?: string;
    startDate?: string;
    targetEndDate?: string;
    ownerId?: string;
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

export function getAdminDashboard() {
  return apiRequest<{
    sections: string[];
    totals: {
      memberships: number;
      permissions: number;
      roles: number;
      users: number;
    };
  }>("/admin");
}

export function getAdminUsers() {
  return apiRequest<ApiUser[]>("/admin/users");
}

export function createAdminUser(input: {
  email: string;
  username?: string;
  firstName: string;
  lastName: string;
  password: string;
  roleId: string;
  status?: string;
}) {
  return apiRequest<ApiUser>("/admin/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAdminUser(
  userId: string,
  input: {
    firstName?: string;
    lastName?: string;
    roleId?: string;
    status?: string;
  },
) {
  return apiRequest<ApiUser>(`/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function disableAdminUser(userId: string) {
  return apiRequest<ApiUser>(`/admin/users/${userId}/disable`, {
    method: "PATCH",
  });
}

export function resetAdminUserPassword(
  userId: string,
  temporaryPassword: string,
) {
  return apiRequest<ApiUser>(`/admin/users/${userId}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ temporaryPassword }),
  });
}

export function getAdminRoles() {
  return apiRequest<ApiRole[]>("/admin/roles");
}

export function createAdminRole(input: {
  name: string;
  description?: string;
  status?: string;
}) {
  return apiRequest<ApiRole>("/admin/roles", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAdminRole(
  roleId: string,
  input: { name?: string; description?: string; status?: string },
) {
  return apiRequest<ApiRole>(`/admin/roles/${roleId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function cloneAdminRole(roleId: string) {
  return apiRequest<ApiRole>(`/admin/roles/${roleId}/clone`, {
    method: "POST",
  });
}

export function getAdminPermissions() {
  return apiRequest<ApiPermission[]>("/admin/permissions");
}

export function createAdminPermission(input: {
  key: string;
  description?: string;
  category?: string;
}) {
  return apiRequest<ApiPermission>("/admin/permissions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getAdminRoleMatrix() {
  return apiRequest<{ permissions: ApiPermission[]; roles: ApiRole[] }>(
    "/admin/role-matrix",
  );
}

export function updateAdminRoleMatrix(input: {
  assignments: { roleId: string; permissionIds: string[] }[];
}) {
  return apiRequest<{ permissions: ApiPermission[]; roles: ApiRole[] }>(
    "/admin/role-matrix",
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export function getAdminProjectMemberships() {
  return apiRequest<ApiProjectMember[]>("/admin/project-memberships");
}

export function upsertAdminProjectMembership(input: {
  projectId: string;
  userId: string;
  role: string;
  visibilityLevel: "INTERNAL" | "PARTNER" | "CUSTOMER";
}) {
  return apiRequest<ApiProjectMember>("/admin/project-memberships", {
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

export function getMyTasks(
  input: {
    priority?: string;
    projectId?: string;
    status?: ApiTask["status"];
  } = {},
) {
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
  type?: string;
  dueDate?: string;
}) {
  return apiRequest<ApiTask>("/tasks", {
    method: "POST",
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
    type?: string;
    startDate?: string;
    dueDate?: string;
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
    type?: string;
    startDate?: string;
    dueDate?: string;
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
  sourceTaskId?: string;
  targetTaskId?: string;
  dependencyType?:
    | "finish_to_start"
    | "start_to_start"
    | "finish_to_finish"
    | "start_to_finish";
}) {
  return apiRequest<ApiRaidItem>("/raid", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
