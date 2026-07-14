import { ResourceCapacityPolicyStatus } from './enums/resource-capacity-policy-status.enum';

export interface CreateResourceCapacityPolicyCommand {
  resourceId: string;
  capacityMinutesPerWorkingDay: number;
  effectiveStartDate: string;
  effectiveEndDate?: string | null;
  status?: ResourceCapacityPolicyStatus;
}

export interface UpdateResourceCapacityPolicyCommand {
  resourceId?: string;
  capacityMinutesPerWorkingDay?: number;
  effectiveStartDate?: string;
  effectiveEndDate?: string | null;
  status?: ResourceCapacityPolicyStatus;
}

export interface ArchiveResourceCapacityPolicyCommand {
  id: string;
}
