import { ResourceAvailabilityOverrideType } from './enums/resource-availability-override-type.enum';

export interface CreateResourceAvailabilityOverrideCommand {
  resourceId: string;
  overrideType: ResourceAvailabilityOverrideType;
  availableMinutesPerWorkingDay?: number | null;
  startDate: string;
  endDate: string;
  reason?: string | null;
}

export interface UpdateResourceAvailabilityOverrideCommand {
  resourceId?: string;
  overrideType?: ResourceAvailabilityOverrideType;
  availableMinutesPerWorkingDay?: number | null;
  startDate?: string;
  endDate?: string;
  reason?: string | null;
}

export interface ArchiveResourceAvailabilityOverrideCommand {
  id: string;
}
