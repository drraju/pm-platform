import { apiRequest } from "@/lib/api/client";

export type ProgramWork = {
  dueDate: string | null;
  id: string;
  parentTaskId: string | null;
  status?: string | null;
  taskKind?: string | null;
};

export type ProgramListItem = {
  customersTouched: number;
  id: string;
  name: string;
  ownerName: string;
  projectCount: number;
  projects: Array<{ id: string; work: ProgramWork[] }>;
};

export type ProgramProject = {
  customerName: string | null;
  id: string;
  leadName: string;
  name: string;
  targetFinish: string | null;
  work: ProgramWork[];
};

export type ProgramDetail = {
  editable: boolean;
  id: string;
  name: string;
  ownerName: string;
  projects: ProgramProject[];
};

export type AvailableProject = {
  customerName: string | null;
  id: string;
  name: string;
};

export type ProgramLead = {
  email: string;
  firstName: string | null;
  id: string;
  lastName: string | null;
};

export type ProjectRequest = {
  customerId: string;
  customerName: string | null;
  id: string;
  name: string;
  note?: string | null;
  projectId: string | null;
  status: "open" | "closed";
  targetFinish: string | null;
};

export function getPrograms() {
  return apiRequest<ProgramListItem[]>("/programs");
}

export function getProgram(programId: string) {
  return apiRequest<ProgramDetail>(`/programs/${programId}`);
}

export function createProgram(input: { name: string; ownerId?: string }) {
  return apiRequest<ProgramListItem>("/programs", {
    body: JSON.stringify(input),
    method: "POST",
  });
}

export function getAvailableProjects(programId: string) {
  return apiRequest<AvailableProject[]>(`/programs/${programId}/available-projects`);
}

export function attachProgramProject(programId: string, projectId: string) {
  return apiRequest<{ id: string }>(`/programs/${programId}/projects`, {
    body: JSON.stringify({ projectId }),
    method: "POST",
  });
}

export function createProgramProject(
  programId: string,
  input: { customerId: string; leadUserId?: string; name: string; targetFinish?: string },
) {
  return apiRequest<{ id: string }>(`/programs/${programId}/projects/new`, {
    body: JSON.stringify(input),
    method: "POST",
  });
}

export function getProgramLeads() {
  return apiRequest<ProgramLead[]>("/programs/leads");
}

export function getOpenProjectRequests() {
  return apiRequest<ProjectRequest[]>("/programs/requests");
}

export function acceptProjectRequest(requestId: string, leadUserId: string) {
  return apiRequest<{ customerId: string; projectId: string }>(
    `/programs/requests/${requestId}/accept`,
    {
      body: JSON.stringify({ leadUserId }),
      method: "POST",
    },
  );
}

export function personLabel(person: { email: string; firstName: string | null; lastName: string | null }) {
  const name = [person.firstName, person.lastName].filter(Boolean).join(" ").trim();
  return name || person.email;
}
