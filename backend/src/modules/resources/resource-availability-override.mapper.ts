import {
  CreateResourceAvailabilityOverrideDto,
  ResourceAvailabilityOverrideResponseDto,
  UpdateResourceAvailabilityOverrideDto,
} from './dto/resource-availability-override.dto';
import { ResourceAvailabilityOverride } from './entities/resource-availability-override.entity';
import {
  ArchiveResourceAvailabilityOverrideCommand,
  CreateResourceAvailabilityOverrideCommand,
  UpdateResourceAvailabilityOverrideCommand,
} from './resource-availability-override.commands';

export class ResourceAvailabilityOverrideMapper {
  static toCreateCommand(
    resourceId: string,
    input: CreateResourceAvailabilityOverrideDto,
  ): CreateResourceAvailabilityOverrideCommand {
    return {
      availableMinutesPerWorkingDay:
        input.availableMinutesPerWorkingDay ?? null,
      endDate: input.endDate,
      overrideType: input.overrideType,
      reason: input.reason ?? null,
      resourceId,
      startDate: input.startDate,
    };
  }

  static toUpdateCommand(
    input: UpdateResourceAvailabilityOverrideDto,
  ): UpdateResourceAvailabilityOverrideCommand {
    return {
      availableMinutesPerWorkingDay:
        input.availableMinutesPerWorkingDay !== undefined
          ? (input.availableMinutesPerWorkingDay ?? null)
          : undefined,
      endDate: input.endDate,
      overrideType: input.overrideType,
      reason: input.reason !== undefined ? (input.reason ?? null) : undefined,
      startDate: input.startDate,
    };
  }

  static toArchiveCommand(
    overrideId: string,
  ): ArchiveResourceAvailabilityOverrideCommand {
    return { id: overrideId };
  }

  static toResponse(
    override: ResourceAvailabilityOverride,
  ): ResourceAvailabilityOverrideResponseDto {
    return {
      availableMinutesPerWorkingDay:
        override.availableMinutesPerWorkingDay ?? null,
      createdAt: override.createdAt,
      endDate: override.endDate,
      id: override.id,
      overrideType: override.overrideType,
      reason: override.reason ?? null,
      resourceId: override.resourceId,
      startDate: override.startDate,
      updatedAt: override.updatedAt,
    };
  }

  static toResponses(
    overrides: ResourceAvailabilityOverride[],
  ): ResourceAvailabilityOverrideResponseDto[] {
    return overrides.map((override) => this.toResponse(override));
  }
}
