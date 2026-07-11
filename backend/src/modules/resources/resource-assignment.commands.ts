import { ResourceAssignmentStatus } from './enums/resource-assignment-status.enum';

export interface CreateResourceAssignmentCommand {
  resourceId: string;
  projectId: string;
  taskId?: string | null;
  allocationPercent?: number | null;
  plannedMinutesPerDay?: number | null;
  startDate: string;
  endDate: string;
  status?: ResourceAssignmentStatus;
}

export interface UpdateResourceAssignmentCommand {
  resourceId?: string;
  projectId?: string;
  taskId?: string | null;
  allocationPercent?: number | null;
  plannedMinutesPerDay?: number | null;
  startDate?: string;
  endDate?: string;
  status?: ResourceAssignmentStatus;
}
