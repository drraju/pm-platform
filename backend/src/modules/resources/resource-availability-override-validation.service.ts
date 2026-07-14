import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Resource } from './entities/resource.entity';
import { ResourceAvailabilityOverride } from './entities/resource-availability-override.entity';
import { ResourceAvailabilityOverrideType } from './enums/resource-availability-override-type.enum';
import {
  CreateResourceAvailabilityOverrideCommand,
  UpdateResourceAvailabilityOverrideCommand,
} from './resource-availability-override.commands';

export type ResourceAvailabilityOverrideValidationInput =
  | CreateResourceAvailabilityOverrideCommand
  | UpdateResourceAvailabilityOverrideCommand
  | Pick<
      ResourceAvailabilityOverride,
      | 'resourceId'
      | 'overrideType'
      | 'availableMinutesPerWorkingDay'
      | 'startDate'
      | 'endDate'
      | 'reason'
    >;

@Injectable()
export class ResourceAvailabilityOverrideValidationService {
  constructor(
    @InjectRepository(ResourceAvailabilityOverride)
    private readonly availabilityOverridesRepository: Repository<ResourceAvailabilityOverride>,
    @InjectRepository(Resource)
    private readonly resourcesRepository: Repository<Resource>,
  ) {}

  async validateCreateAvailabilityOverride(
    input: CreateResourceAvailabilityOverrideCommand,
  ) {
    await this.validateAvailabilityOverride(input);
  }

  async validateUpdateAvailabilityOverride(
    input: UpdateResourceAvailabilityOverrideCommand,
  ) {
    await this.validateAvailabilityOverride(input);
  }

  async validateResolvedAvailabilityOverride(
    input: ResourceAvailabilityOverrideValidationInput,
    manager?: EntityManager,
  ) {
    await this.validateAvailabilityOverride(input, manager);
  }

  async ensureResourceExists(resourceId: string, manager?: EntityManager) {
    const resource = await (
      manager?.getRepository(Resource) ?? this.resourcesRepository
    ).findOne({
      where: { id: resourceId },
    });

    if (!resource) {
      throw new NotFoundException(`Resource ${resourceId} not found`);
    }
  }

  private async validateAvailabilityOverride(
    input: ResourceAvailabilityOverrideValidationInput,
    manager?: EntityManager,
  ) {
    if (input.resourceId !== undefined) {
      await this.ensureResourceExists(input.resourceId, manager);
    }

    if (input.overrideType !== undefined && input.overrideType !== null) {
      this.validateAllowedValue(
        input.overrideType,
        Object.values(ResourceAvailabilityOverrideType),
        'override type',
      );
    }

    if (
      input.availableMinutesPerWorkingDay !== undefined &&
      input.availableMinutesPerWorkingDay !== null
    ) {
      this.validateNonNegativeInteger(
        input.availableMinutesPerWorkingDay,
        'Available minutes per working day',
      );
    }

    if (
      input.startDate !== undefined &&
      input.startDate !== null &&
      input.endDate !== undefined &&
      input.endDate !== null
    ) {
      this.validateDateRange(input.startDate, input.endDate);
    }

    if (input.reason !== undefined && input.reason !== null) {
      this.validateText(input.reason, 'Availability override reason', 2000);
    }

    this.validateOverrideShape(input);
  }

  private validateOverrideShape(
    input: ResourceAvailabilityOverrideValidationInput,
  ) {
    if (input.overrideType === undefined || input.overrideType === null) {
      return;
    }

    if (
      input.overrideType === ResourceAvailabilityOverrideType.Unavailable &&
      input.availableMinutesPerWorkingDay !== undefined &&
      input.availableMinutesPerWorkingDay !== null
    ) {
      throw new BadRequestException(
        'Unavailable overrides must not provide available minutes per working day',
      );
    }

    if (
      input.overrideType === ResourceAvailabilityOverrideType.ReducedCapacity &&
      (input.availableMinutesPerWorkingDay === undefined ||
        input.availableMinutesPerWorkingDay === null)
    ) {
      throw new BadRequestException(
        'Reduced-capacity overrides require available minutes per working day',
      );
    }
  }

  private validateAllowedValue(
    value: string,
    allowedValues: string[],
    fieldName: string,
  ) {
    if (!allowedValues.includes(value)) {
      throw new BadRequestException(
        `Unsupported resource availability override ${fieldName}`,
      );
    }
  }

  private validateDateRange(startDate: string, endDate: string) {
    if (new Date(startDate) > new Date(endDate)) {
      throw new BadRequestException(
        'Resource availability override start date must be on or before end date',
      );
    }
  }

  private validateNonNegativeInteger(value: number, fieldLabel: string) {
    if (!Number.isInteger(value) || value < 0) {
      throw new BadRequestException(
        `${fieldLabel} must be a non-negative integer`,
      );
    }
  }

  private validateText(value: string, fieldLabel: string, maxLength: number) {
    if (value.trim().length > maxLength) {
      throw new BadRequestException(
        `${fieldLabel} must be at most ${maxLength} characters`,
      );
    }
  }
}
