import { apiRequest } from "@/lib/api/client";

export type CustomerStatus = "prospect" | "active" | "paused" | "closed";

export type ApiCustomerOwner = {
  email: string;
  firstName: string | null;
  id: string;
  lastName: string | null;
};

export type ApiCustomer = {
  commercialNote?: string | null;
  domain: string | null;
  id: string;
  name: string;
  owner: ApiCustomerOwner;
  projectCount: number;
  renewalDate: string | null;
  lastTouch: string | null;
  status: CustomerStatus;
  successNote?: string | null;
};

export type CustomerInput = {
  commercialNote?: string | null;
  domain?: string | null;
  name: string;
  ownerId?: string;
  renewalDate?: string | null;
  lastTouch?: string | null;
  status?: CustomerStatus;
  successNote?: string | null;
};

export type CustomerFieldAccess = {
  commercial: boolean;
  renewal: boolean;
  success: boolean;
};

export function getCustomerFieldAccess() {
  return apiRequest<CustomerFieldAccess>("/customers/access");
}

export function getCustomers(status: CustomerStatus | "all" = "active") {
  const query = status === "active" ? "" : `?status=${encodeURIComponent(status)}`;
  return apiRequest<ApiCustomer[]>(`/customers${query}`);
}

export type ApiCustomerWork = {
  dueDate: string | null;
  id: string;
  parentTaskId: string | null;
  status?: string | null;
  taskKind?: string | null;
};

export type ApiCustomerProject = {
  id: string;
  leadName: string;
  name: string;
  openable?: boolean;
  status: string;
  targetFinish: string | null;
  work?: ApiCustomerWork[];
};

export type ApiProjectRequest = {
  customerId: string;
  id: string;
  name: string;
  note?: string | null;
  projectId: string | null;
  status: "open" | "closed";
  targetFinish: string | null;
};

export function customerProjectPath(project: Pick<ApiCustomerProject, "id" | "openable">) {
  return project.openable ? `/projects/${project.id}` : null;
}

export type ApiCommitment = {
  customerId: string;
  dueDate: string | null;
  id: string;
  projectId: string;
  projectName: string;
  status: "accepted" | "dismissed" | "open";
  taskId: string | null;
  title: string;
};

export function getCustomerProjects(customerId: string) {
  return apiRequest<ApiCustomerProject[]>(`/customers/${customerId}/projects`);
}

export function getCustomerProjectRequests(customerId: string) {
  return apiRequest<ApiProjectRequest[]>(`/customers/${customerId}/project-requests`);
}

export function createCustomerProjectRequest(
  customerId: string,
  input: { name: string; note?: string; targetFinish?: string },
) {
  return apiRequest<ApiProjectRequest>(`/customers/${customerId}/project-requests`, {
    body: JSON.stringify(input),
    method: "POST",
  });
}

export function getCustomer(customerId: string) {
  return apiRequest<ApiCustomer>(`/customers/${customerId}`);
}

export function getCustomerOwners() {
  return apiRequest<ApiCustomerOwner[]>("/customers/owners");
}

export function createCustomer(input: CustomerInput) {
  return apiRequest<ApiCustomer>("/customers", {
    body: JSON.stringify(input),
    method: "POST",
  });
}

export function updateCustomer(customerId: string, input: Partial<CustomerInput>) {
  return apiRequest<ApiCustomer>(`/customers/${customerId}`, {
    body: JSON.stringify(input),
    method: "PATCH",
  });
}

export function getCustomerCommitments(customerId: string) {
  return apiRequest<ApiCommitment[]>(`/customers/${customerId}/commitments`);
}

export function createCustomerCommitment(
  customerId: string,
  input: { dueDate?: string | null; projectId: string; title: string },
) {
  return apiRequest<ApiCommitment>(`/customers/${customerId}/commitments`, {
    body: JSON.stringify(input),
    method: "POST",
  });
}

export function dismissCustomerCommitment(customerId: string, commitmentId: string) {
  return apiRequest<ApiCommitment>(`/customers/${customerId}/commitments/${commitmentId}`, {
    body: JSON.stringify({ status: "dismissed" }),
    method: "PATCH",
  });
}

export function getProjectCommitments(projectId: string) {
  return apiRequest<ApiCommitment[]>(`/projects/${projectId}/commitments`);
}

export function acceptProjectCommitment(projectId: string, commitmentId: string) {
  return apiRequest<ApiCommitment>(`/projects/${projectId}/commitments/${commitmentId}/accept`, {
    method: "POST",
  });
}

export function ownerName(owner: ApiCustomerOwner) {
  const name = [owner.firstName, owner.lastName].filter(Boolean).join(" ").trim();
  return name || owner.email;
}

export const customerStatusLabels: Record<CustomerStatus, string> = {
  active: "Active",
  closed: "Closed",
  paused: "Paused",
  prospect: "Prospect",
};
