import { apiBaseUrl } from "@/lib/config/env";

export type ApiRole = {
  id: string;
  name: string;
  description?: string | null;
  permissions?: ApiPermission[];
};

export type ApiEnterpriseCapability = {
  allowedRoles: string[];
  category: string;
  description: string;
  displayName: string;
  executionCapabilityId: string;
  icon: string;
  id: string;
  permissions: string[];
  requiredContext: string[];
  responseType: string;
  supportedSkills: string[];
  version: string;
  visibility: string;
};

export type ApiStructuredAIResponse = {
  actionItems?: Array<Record<string, unknown>>;
  confidence?: string;
  diagnostics?: Record<string, unknown>;
  findings?: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown>;
  opportunities?: string[];
  rawContent?: string;
  recommendations?: Array<Record<string, unknown>>;
  risks?: Array<Record<string, unknown>>;
  summary?: { businessImpact?: string; overview: string; title: string };
  warnings?: string[];
};

export type ApiCapabilityExecutionResult = {
  status: string;
  structuredResponse?: ApiStructuredAIResponse;
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
  accountHistory?: Array<{
    action: string;
    administratorId: string;
    timestamp: string;
  }>;
  createdAt?: string;
  lastLoginAt?: string | null;
  roleId?: string;
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
  taskCounts?: ApiTaskCounts;
  createdAt?: string;
  updatedAt?: string;
};

export type ApiProjectMember = {
  id: string;
  projectId?: string;
  userId: string;
  role: string;
  createdAt?: string;
  updatedAt?: string;
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

export type ApiTaskCounts = {
  milestones: number;
  phases: number;
  tasks: number;
};

export type ApiTask = {
  id: string;
  projectId: string;
  parentTaskId?: string | null;
  title: string;
  description?: string | null;
  assigneeId?: string | null;
  status: "backlog" | "todo" | "in_progress" | "blocked" | "done";
  priority: string;
  remarks?: string | null;
  taskKind?: "standard" | "summary" | "milestone";
  milestoneCategory?: ApiMilestoneCategory | null;
  percentComplete?: number;
  sequenceNumber?: number | null;
  startDate?: string | null;
  dueDate?: string | null;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
  estimatedHours?: number | null;
  remainingHours?: number | null;
  phaseProgress?: number | null;
  phaseStartDate?: string | null;
  phaseEndDate?: string | null;
  childTaskCount?: number;
  latestExecutionUpdate?: ApiTaskExecutionUpdate | null;
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

export type ApiTaskExecutionUpdate = {
  id: string;
  taskId: string;
  projectId: string;
  status: ApiTask["status"];
  priority: string;
  percentComplete: number;
  assigneeId?: string | null;
  nextStep?: string | null;
  nextActionOwnerId?: string | null;
  targetCompletionDate?: string | null;
  updateNotes?: string | null;
  changes?: Record<
    string,
    { previousValue: string | number | null; nextValue: string | number | null }
  > | null;
  updatedById?: string | null;
  updatedOn?: string;
};

export type ApiTaskType = "task" | "summary" | "milestone";
export type ApiMilestoneCategory =
  | "standard"
  | "release"
  | "drop"
  | "go_live"
  | "decision";

export type ApiTaskDependency = {
  id: string;
  predecessorTaskId: string;
  successorTaskId: string;
  dependencyType: "FS" | "SS" | "FF" | "SF";
  lagDays: number;
  predecessorTask?: ApiTask | null;
  successorTask?: ApiTask | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ApiPlanningTaskSchedule = {
  id: string;
  snapshotId: string;
  projectId: string;
  taskId: string;
  parentTaskId?: string | null;
  taskTitle: string;
  status?: ApiTask["status"] | null;
  taskKind: "standard" | "summary" | "milestone";
  taskType?: ApiTaskType;
  milestoneCategory?: ApiMilestoneCategory | null;
  ownerId?: string | null;
  plannedStartDate?: string | null;
  plannedFinishDate?: string | null;
  durationDays: number;
  percentComplete: number;
  sequenceNumber?: number | null;
  earlyStart?: number | null;
  earlyFinish?: number | null;
  lateStart?: number | null;
  lateFinish?: number | null;
  totalFloatDays?: number | null;
  freeFloatDays?: number | null;
  isCritical: boolean;
  task?: ApiTask | null;
};

export type ApiScheduleSnapshot = {
  id: string;
  projectId: string;
  versionNumber: number;
  projectStartDate?: string | null;
  projectFinishDate?: string | null;
  projectCompletionPercent: number;
  criticalPathTaskIds: string[];
  calculatedAt?: string | null;
};

export type ApiResourceAllocation = {
  id: string;
  projectId: string;
  taskId: string;
  userId: string;
  allocationPercent: number;
  startDate?: string | null;
  finishDate?: string | null;
  user?: ApiUser | null;
};

export type ApiPlanningWorkspace = {
  project: ApiProject;
  snapshot: ApiScheduleSnapshot;
  schedules: ApiPlanningTaskSchedule[];
  dependencies: ApiTaskDependency[];
  resourceAllocations: ApiResourceAllocation[];
  criticalPathTaskIds: string[];
};

export type ApiDuplicateWorkPackageInput = {
  newSummaryName: string;
  copyChildTasks?: boolean;
  preserveWbsHierarchy?: boolean;
  preserveTaskDurations?: boolean;
  preserveEstimatedEffort?: boolean;
  preserveInternalPredecessors?: boolean;
  preserveMilestones?: boolean;
  preserveNotes?: boolean;
  preserveChecklists?: boolean;
  copyResourceAssignments?: boolean;
  copyPlannedDates?: boolean;
  copyActualDates?: boolean;
  copyComments?: boolean;
  copyAttachments?: boolean;
};

export type ApiDuplicateWorkPackageResult = {
  newSummaryTaskId: string;
  copiedTaskIds: string[];
  workspace: ApiPlanningWorkspace;
};

export type ApiProjectBaselineTask = {
  id: string;
  projectBaselineId: string;
  projectId: string;
  taskId?: string | null;
  parentTaskId?: string | null;
  taskTitle: string;
  taskKind: "standard" | "summary" | "milestone";
  sequenceNumber?: number | null;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  estimatedHours?: number | null;
  percentComplete?: number | null;
};

export type ApiProjectBaseline = {
  id: string;
  projectId: string;
  name: string;
  versionNumber: number;
  status: string;
  capturedAt: string;
  capturedById: string;
  isCurrent: boolean;
  capturedBy?: ApiUser | null;
  tasks?: ApiProjectBaselineTask[];
  createdAt?: string;
  updatedAt?: string;
};

export type ApiProjectDetails = ApiProject & {
  members?: ApiProjectMember[];
  tasks?: ApiTask[];
  taskCounts?: ApiTaskCounts;
  risks?: ApiRaidItem[];
  issues?: ApiRaidItem[];
  assumptions?: ApiRaidItem[];
  dependencies?: ApiRaidItem[];
  baselines?: ApiProjectBaseline[];
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

export type ApiDocumentStorageProvider =
  | "GOOGLE_DRIVE"
  | "SHAREPOINT"
  | "ONEDRIVE"
  | "CONFLUENCE"
  | "GITHUB"
  | "DROPBOX"
  | "NETWORK_SHARE"
  | "OTHER";

export type ApiDocumentApprovalStatus =
  | "DRAFT"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "SUPERSEDED"
  | "ARCHIVED";

export type ApiDocumentReviewStatus =
  | "CURRENT"
  | "REVIEW_DUE_SOON"
  | "OVERDUE"
  | "NEVER_REVIEWED";

export type ApiDocumentLinkStatus = "UNKNOWN";

export type ApiDocumentReference = {
  id: string;
  name: string;
};

export type ApiStorageProviderReference = {
  label: string;
  value: ApiDocumentStorageProvider;
};

export type ApiDocumentUserSummary = {
  displayName: string;
  email: string;
  id: string;
};

export type ApiProjectDocument = {
  approvalStatus: ApiDocumentApprovalStatus;
  category?: string | null;
  categoryId?: string | null;
  createdAt?: string;
  createdBy?: ApiDocumentUserSummary | null;
  createdById?: string | null;
  description?: string | null;
  documentType: string;
  documentTypeId?: string;
  externalUrl: string;
  id: string;
  lastReviewedAt?: string | null;
  linkStatus: ApiDocumentLinkStatus;
  nextReviewAt?: string | null;
  owner?: ApiDocumentUserSummary | null;
  ownerId?: string | null;
  projectId: string;
  reviewStatus: ApiDocumentReviewStatus;
  storageProvider: ApiDocumentStorageProvider;
  storageProviderLabel: string;
  title: string;
  updatedAt?: string;
  updatedBy?: ApiDocumentUserSummary | null;
  updatedById?: string | null;
  version?: string | null;
};

export type ApiProjectDocumentSummary = {
  approved: number;
  byCategory: Record<string, number>;
  byStorageProvider: Record<string, number>;
  draft: number;
  overdueReviews: number;
  totalDocuments: number;
  underReview: number;
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

    if (
      !decodedPayload.sub ||
      !decodedPayload.email ||
      !decodedPayload.roleId
    ) {
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

const authSessionChangeListeners = new Set<() => void>();

export function subscribeAuthSessionChange(listener: () => void) {
  authSessionChangeListeners.add(listener);
  return () => {
    authSessionChangeListeners.delete(listener);
  };
}

function notifyAuthSessionChange() {
  for (const listener of authSessionChangeListeners) {
    listener();
  }
}

export function clearSession() {
  window.localStorage.removeItem("pm_platform_access_token");
  window.localStorage.removeItem("pm_platform_refresh_token");
  window.localStorage.removeItem("pm_platform_permissions");
  window.localStorage.removeItem("pm_platform_role_names");
  window.localStorage.removeItem("pm_platform_session_user");
  notifyAuthSessionChange();
}

export function getStoredPermissionKeys() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedPermissions = window.localStorage.getItem(
      "pm_platform_permissions",
    );
    return storedPermissions ? (JSON.parse(storedPermissions) as string[]) : [];
  } catch {
    return [];
  }
}

export function getStoredRoleNames() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedRoles = window.localStorage.getItem("pm_platform_role_names");
    return storedRoles ? (JSON.parse(storedRoles) as string[]) : [];
  } catch {
    return [];
  }
}

export function storeAuthMe(authMe: ApiAuthMe) {
  window.localStorage.setItem(
    "pm_platform_permissions",
    JSON.stringify(authMe.permissions.map((permission) => permission.key)),
  );
  window.localStorage.setItem(
    "pm_platform_role_names",
    JSON.stringify(authMe.roles.map((role) => role.name)),
  );
  window.localStorage.setItem(
    "pm_platform_session_user",
    JSON.stringify(authMe.user),
  );
  notifyAuthSessionChange();
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

  if (response.headers.get("content-length") === "0") {
    return undefined as T;
  }

  const responseText = await response.text();
  if (!responseText.trim()) {
    return undefined as T;
  }

  return JSON.parse(responseText) as T;
}

export async function downloadProjectExcel(projectId: string) {
  const response = await fetch(`${apiBaseUrl}/projects/${projectId}/export/excel`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${getStoredAccessToken() ?? ""}` },
  });
  if (!response.ok) throw new Error(`Unable to export project (${response.status})`);
  return response.blob();
}

export function getAiEnterpriseCapabilities() {
  return apiRequest<ApiEnterpriseCapability[]>('/ai-playground/capabilities');
}

export function executeAiEnterpriseCapability(
  capabilityId: string,
  input: {
    contextSourceData?: unknown;
    input: unknown;
    projectIds?: readonly string[];
    requestId?: string;
    workspaceId?: string;
  },
) {
  return apiRequest<ApiCapabilityExecutionResult>(
    `/ai-playground/capabilities/${capabilityId}/execute`,
    { body: JSON.stringify(input), method: 'POST' },
  );
}

export function login(email: string, password: string) {
  return apiRequest<{
    accessToken: string;
    refreshToken: string;
    requiresPasswordChange?: boolean;
  }>("/auth/login", {
    method: "POST",
    token: null,
    body: JSON.stringify({ email, password }),
  });
}

export function getAuthMe() {
  return apiRequest<ApiAuthMe>("/auth/me");
}

export function changePassword(input: {
  confirmPassword: string;
  currentPassword: string;
  newPassword: string;
}) {
  return apiRequest<{
    message: string;
    requiresLogin: boolean;
    success: boolean;
  }>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function forgotPassword(email: string) {
  return apiRequest<{
    message: string;
    success: boolean;
  }>("/auth/forgot-password", {
    method: "POST",
    token: null,
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(input: {
  confirmPassword: string;
  newPassword: string;
  token: string;
}) {
  return apiRequest<{
    message: string;
    success: boolean;
  }>("/auth/reset-password", {
    method: "POST",
    token: null,
    body: JSON.stringify(input),
  });
}

export function getProjects(
  input: { archived?: boolean; includeArchived?: boolean } = {},
) {
  const searchParams = new URLSearchParams();
  if (input.archived) {
    searchParams.set("archived", "true");
  } else if (input.includeArchived) {
    searchParams.set("includeArchived", "true");
  }

  const query = searchParams.toString();
  return apiRequest<ApiProject[]>(`/projects${query ? `?${query}` : ""}`);
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

export function getPlanningWorkspace(projectId: string) {
  return apiRequest<ApiPlanningWorkspace>(
    `/planning/projects/${projectId}/workspace`,
  );
}

export function getDocumentStorageProviders() {
  return apiRequest<ApiStorageProviderReference[]>(
    "/documents/storage-providers",
  );
}

export function getDocumentTypes() {
  return apiRequest<ApiDocumentReference[]>("/documents/document-types");
}

export function getDocumentCategories() {
  return apiRequest<ApiDocumentReference[]>("/documents/categories");
}

export function getProjectDocumentSummary(projectId: string) {
  return apiRequest<ApiProjectDocumentSummary>(
    `/projects/${projectId}/documents/summary`,
  );
}

export function getProjectDocuments(
  projectId: string,
  input: {
    approvalStatus?: string;
    category?: string;
    description?: string;
    documentType?: string;
    ownerId?: string;
    reviewStatus?: string;
    sortBy?: string;
    sortDirection?: "ASC" | "DESC";
    storageProvider?: string;
    title?: string;
    version?: string;
  } = {},
) {
  const params = new URLSearchParams();
  if (input.approvalStatus) {
    params.set("approvalStatus", input.approvalStatus);
  }
  if (input.category) {
    params.set("category", input.category);
  }
  if (input.description) {
    params.set("description", input.description);
  }
  if (input.documentType) {
    params.set("documentType", input.documentType);
  }
  if (input.ownerId) {
    params.set("ownerId", input.ownerId);
  }
  if (input.reviewStatus) {
    params.set("reviewStatus", input.reviewStatus);
  }
  if (input.sortBy) {
    params.set("sortBy", input.sortBy);
  }
  if (input.sortDirection) {
    params.set("sortDirection", input.sortDirection);
  }
  if (input.storageProvider) {
    params.set("storageProvider", input.storageProvider);
  }
  if (input.title) {
    params.set("title", input.title);
  }
  if (input.version) {
    params.set("version", input.version);
  }

  const queryString = params.toString();
  return apiRequest<ApiProjectDocument[]>(
    queryString
      ? `/projects/${projectId}/documents?${queryString}`
      : `/projects/${projectId}/documents`,
  );
}

export function createProjectDocument(input: {
  approvalStatus?: ApiDocumentApprovalStatus;
  category?: string | null;
  description?: string | null;
  documentType: string;
  externalUrl: string;
  lastReviewedAt?: string | null;
  nextReviewAt?: string | null;
  ownerId?: string | null;
  projectId: string;
  storageProvider: ApiDocumentStorageProvider;
  title: string;
  version?: string | null;
}) {
  return apiRequest<ApiProjectDocument>("/documents", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateProjectDocument(
  documentId: string,
  input: {
    approvalStatus?: ApiDocumentApprovalStatus;
    category?: string | null;
    description?: string | null;
    documentType?: string;
    externalUrl?: string;
    lastReviewedAt?: string | null;
    nextReviewAt?: string | null;
    ownerId?: string | null;
    projectId?: string;
    storageProvider?: ApiDocumentStorageProvider;
    title?: string;
    version?: string | null;
  },
) {
  return apiRequest<ApiProjectDocument>(`/documents/${documentId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function regeneratePlanningWorkspace(projectId: string) {
  return apiRequest<ApiPlanningWorkspace>(
    `/planning/projects/${projectId}/workspace/regenerate`,
    {
      method: "POST",
    },
  );
}

export function updatePlanningTaskSchedule(
  projectId: string,
  taskId: string,
  input: {
    durationDays?: number | null;
    milestoneCategory?: ApiMilestoneCategory | null;
    ownerId?: string | null;
    parentTaskId?: string | null;
    percentComplete?: number;
    plannedFinishDate?: string | null;
    plannedStartDate?: string | null;
    sequenceNumber?: number | null;
    status?: ApiTask["status"];
    taskTitle?: string;
  },
) {
  return apiRequest<ApiPlanningTaskSchedule>(
    `/planning/projects/${projectId}/task-schedules/${taskId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export function createPlanningTask(
  projectId: string,
  input: {
    milestoneCategory?: ApiMilestoneCategory;
    ownerId?: string | null;
    parentTaskId?: string | null;
    taskType?: ApiTaskType;
    title?: string;
  },
) {
  return apiRequest<ApiPlanningTaskSchedule>(
    `/planning/projects/${projectId}/tasks`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function duplicatePlanningWorkPackage(
  projectId: string,
  sourceSummaryTaskId: string,
  input: ApiDuplicateWorkPackageInput,
) {
  return apiRequest<ApiDuplicateWorkPackageResult>(
    `/planning/projects/${projectId}/tasks/${sourceSummaryTaskId}/duplicate-work-package`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function removeDuplicatedPlanningWorkPackage(
  projectId: string,
  summaryTaskId: string,
) {
  return apiRequest<ApiPlanningWorkspace>(
    `/planning/projects/${projectId}/work-packages/${summaryTaskId}`,
    { method: "DELETE" },
  );
}

export function createPlanningDependency(
  projectId: string,
  input: {
    dependencyType: ApiTaskDependency["dependencyType"];
    lagDays?: number;
    predecessorTaskId: string;
    successorTaskId: string;
  },
) {
  return apiRequest<ApiTaskDependency>(
    `/planning/projects/${projectId}/dependencies`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function deletePlanningDependency(
  projectId: string,
  dependencyId: string,
) {
  return apiRequest<void>(
    `/planning/projects/${projectId}/dependencies/${dependencyId}`,
    {
      method: "DELETE",
    },
  );
}

export function createPlanningResourceAllocation(
  projectId: string,
  input: {
    allocationPercent: number;
    finishDate?: string | null;
    startDate?: string | null;
    taskId: string;
    userId: string;
  },
) {
  return apiRequest<ApiResourceAllocation>(
    `/planning/projects/${projectId}/resource-allocations`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
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

export function archiveProject(projectId: string) {
  return apiRequest<ApiProject>(`/projects/${projectId}/archive`, {
    method: "POST",
  });
}

export function restoreProject(projectId: string) {
  return apiRequest<ApiProject>(`/projects/${projectId}/restore`, {
    method: "POST",
  });
}

export function purgeProject(projectId: string) {
  return apiRequest<void>(`/projects/${projectId}/purge`, {
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

export function getAssignableUsers(projectId?: string) {
  const query = projectId
    ? `?projectId=${encodeURIComponent(projectId)}`
    : "";
  return apiRequest<ApiAssignableUser[]>(`/users/assignable${query}`);
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

export function updateRolePermissions(
  roleId: string,
  permissionKeys: string[],
) {
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

export function updateUser(
  userId: string,
  input: Partial<{
    email: string;
    firstName: string;
    lastName: string;
    roleId: string;
    status: string;
  }>,
) {
  return apiRequest<ApiUser>(`/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function enableUser(userId: string) {
  return apiRequest<ApiUser>(`/users/${userId}/enable`, {
    method: "POST",
  });
}

export function disableUser(userId: string) {
  return apiRequest<ApiUser>(`/users/${userId}/disable`, {
    method: "POST",
  });
}

export function adminResetUserPassword(
  userId: string,
  temporaryPassword: string,
) {
  return apiRequest<ApiUser>(`/users/${userId}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ temporaryPassword }),
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

export function getTaskExecutionUpdates(taskId: string) {
  return apiRequest<ApiTaskExecutionUpdate[]>(
    `/tasks/${taskId}/execution-updates`,
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
    assigneeId?: string | null;
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
    parentTaskId?: string | null;
    taskKind?: ApiTask["taskKind"];
    description?: string | null;
    assigneeId?: string | null;
    status?: ApiTask["status"];
    priority?: string;
    remarks?: string | null;
    percentComplete?: number;
    sequenceNumber?: number | null;
    startDate?: string | null;
    dueDate?: string | null;
    plannedStartDate?: string | null;
    plannedEndDate?: string | null;
    actualStartDate?: string | null;
    actualEndDate?: string | null;
    estimatedHours?: number | null;
    remainingHours?: number | null;
  },
) {
  return apiRequest<ApiTask>(`/projects/${projectId}/tasks`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getProjectBaselines(projectId: string) {
  return apiRequest<ApiProjectBaseline[]>(`/projects/${projectId}/baselines`);
}

export function getProjectBaseline(projectId: string, baselineId: string) {
  return apiRequest<ApiProjectBaseline>(
    `/projects/${projectId}/baselines/${baselineId}`,
  );
}

export function captureProjectBaseline(
  projectId: string,
  input: {
    name: string;
    status?: string;
    setAsCurrent?: boolean;
  },
) {
  return apiRequest<ApiProjectBaseline>(`/projects/${projectId}/baselines`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateProjectTask(
  projectId: string,
  taskId: string,
  input: {
    title?: string;
    parentTaskId?: string | null;
    taskKind?: ApiTask["taskKind"];
    description?: string | null;
    assigneeId?: string | null;
    status?: ApiTask["status"];
    priority?: string;
    remarks?: string | null;
    percentComplete?: number;
    sequenceNumber?: number | null;
    startDate?: string | null;
    dueDate?: string | null;
    plannedStartDate?: string | null;
    plannedEndDate?: string | null;
    actualStartDate?: string | null;
    actualEndDate?: string | null;
    estimatedHours?: number | null;
    remainingHours?: number | null;
  },
) {
  return apiRequest<ApiTask>(`/projects/${projectId}/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function recordProjectTaskExecutionUpdate(
  projectId: string,
  taskId: string,
  input: {
    status: ApiTask["status"];
    priority: string;
    percentComplete: number;
    assigneeId?: string | null;
    nextStep?: string | null;
    nextActionOwnerId?: string | null;
    targetCompletionDate?: string | null;
    updateNotes?: string | null;
  },
) {
  return apiRequest<ApiTask>(
    `/projects/${projectId}/tasks/${taskId}/execution-updates`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function deleteProjectTask(projectId: string, taskId: string) {
  return apiRequest<void>(`/projects/${projectId}/tasks/${taskId}`, {
    method: "DELETE",
  });
}

export function getProjectTaskDependencies(projectId: string) {
  return apiRequest<ApiTaskDependency[]>(
    `/projects/${projectId}/task-dependencies`,
  );
}

export function createProjectTaskDependency(
  projectId: string,
  input: {
    predecessorTaskId: string;
    successorTaskId: string;
    dependencyType: ApiTaskDependency["dependencyType"];
    lagDays?: number;
  },
) {
  return apiRequest<ApiTaskDependency>(
    `/projects/${projectId}/task-dependencies`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function updateProjectTaskDependency(
  projectId: string,
  dependencyId: string,
  input: Partial<{
    predecessorTaskId: string;
    successorTaskId: string;
    dependencyType: ApiTaskDependency["dependencyType"];
    lagDays: number;
  }>,
) {
  return apiRequest<ApiTaskDependency>(
    `/projects/${projectId}/task-dependencies/${dependencyId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export function deleteProjectTaskDependency(
  projectId: string,
  dependencyId: string,
) {
  return apiRequest<void>(
    `/projects/${projectId}/task-dependencies/${dependencyId}`,
    {
      method: "DELETE",
    },
  );
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

export type ApiAiPlaygroundRequest = {
  actorId?: string;
  capabilityId?: string;
  conversationId?: string;
  correlationId?: string;
  input: unknown;
  projectIds?: string[];
  providerId?: string;
  requestId?: string;
  sessionId?: string;
  tenantId?: string;
  workspaceId?: string;
};

export type ApiAiPlaygroundHistoryItem = {
  capability: string;
  durationMs?: number;
  executionId: string;
  provider?: string;
  request: string;
  requestId: string;
  status: string;
};

export type ApiAiPlaygroundRegistrySnapshot = Record<
  | "capabilities"
  | "conversations"
  | "prompts"
  | "providers"
  | "sessions"
  | "skills"
  | "enterpriseCapabilities",
  Array<Record<string, unknown>>
>;

export type ApiAiPlaygroundTrace = {
  conversationId: string;
  diagnostics: Record<string, unknown>;
  eventBusEvents: Array<Record<string, unknown>>;
  eventTimeline: Array<{
    durationMs?: number;
    eventName: string;
    executionId: string;
    timestamp: string;
  }>;
  executionId: string;
  executionStates: Array<Record<string, unknown>>;
  finalResult: Record<string, unknown>;
  input: unknown;
  pipelineStages: Array<Record<string, unknown>>;
  registrySnapshot: ApiAiPlaygroundRegistrySnapshot;
  request: ApiAiPlaygroundRequest;
  requestId: string;
  selectedCapability: string;
  selectedContextMetadata: Array<Record<string, unknown>>;
  selectedConversation: Record<string, unknown> | null;
  selectedPrompt?: Record<string, unknown>;
  selectedProvider?: Record<string, unknown>;
  selectedSkill?: Record<string, unknown>;
  timing: Record<string, unknown>;
};

export type ApiAiPlaygroundResponse = {
  trace: ApiAiPlaygroundTrace;
};

export function executeAiPlaygroundRequest(input: ApiAiPlaygroundRequest) {
  return apiRequest<ApiAiPlaygroundResponse>("/ai-playground/execute", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getAiPlaygroundHistory() {
  return apiRequest<ApiAiPlaygroundHistoryItem[]>("/ai-playground/history");
}

export function getAiPlaygroundTrace(executionId: string) {
  return apiRequest<ApiAiPlaygroundTrace>(
    `/ai-playground/history/${executionId}`,
  );
}

export function replayAiPlaygroundExecution(executionId: string) {
  return apiRequest<ApiAiPlaygroundResponse>(
    `/ai-playground/history/${executionId}/replay`,
    {
      method: "POST",
    },
  );
}

export function getAiPlaygroundRegistries() {
  return apiRequest<ApiAiPlaygroundRegistrySnapshot>(
    "/ai-playground/registries",
  );
}
