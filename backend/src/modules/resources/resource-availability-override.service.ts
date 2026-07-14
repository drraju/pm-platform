import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthorizationActor } from '../../common/authz/authorization-policy.service';
import { Repository } from 'typeorm';
import { ResourceAvailabilityOverride } from './entities/resource-availability-override.entity';
import {
  ArchiveResourceAvailabilityOverrideCommand,
  CreateResourceAvailabilityOverrideCommand,
  UpdateResourceAvailabilityOverrideCommand,
} from './resource-availability-override.commands';
import { ResourceAvailabilityOverrideValidationService } from './resource-availability-override-validation.service';

@Injectable()
export class ResourceAvailabilityOverrideService {
  constructor(
    @InjectRepository(ResourceAvailabilityOverride)
    private readonly availabilityOverridesRepository: Repository<ResourceAvailabilityOverride>,
    private readonly availabilityOverrideValidationService: ResourceAvailabilityOverrideValidationService,
  ) {}

  async createAvailabilityOverride(
    input: CreateResourceAvailabilityOverrideCommand,
    actor?: AuthorizationActor,
  ): Promise<ResourceAvailabilityOverride> {
    return this.availabilityOverridesRepository.manager.transaction(
      async (manager) => {
        await this.availabilityOverrideValidationService.validateResolvedAvailabilityOverride(
          input,
          manager,
        );

        const override = manager.create(ResourceAvailabilityOverride, {
          availableMinutesPerWorkingDay:
            input.availableMinutesPerWorkingDay ?? null,
          createdById: actor?.userId,
          endDate: input.endDate,
          overrideType: input.overrideType,
          reason: input.reason ?? null,
          resourceId: input.resourceId,
          startDate: input.startDate,
          updatedById: actor?.userId,
        });

        return manager.save(ResourceAvailabilityOverride, override);
      },
    );
  }

  async updateAvailabilityOverride(
    overrideId: string,
    input: UpdateResourceAvailabilityOverrideCommand,
    actor?: AuthorizationActor,
  ): Promise<ResourceAvailabilityOverride> {
    return this.availabilityOverridesRepository.manager.transaction(
      async (manager) => {
        const override = await this.findAvailabilityOverrideOrThrow(
          overrideId,
          manager,
        );
        const updatedOverride = manager.merge(
          ResourceAvailabilityOverride,
          override,
          {
            ...input,
            availableMinutesPerWorkingDay:
              input.availableMinutesPerWorkingDay !== undefined
                ? input.availableMinutesPerWorkingDay
                : override.availableMinutesPerWorkingDay,
            reason: input.reason !== undefined ? input.reason : override.reason,
            updatedById: actor?.userId,
          },
        );

        await this.availabilityOverrideValidationService.validateResolvedAvailabilityOverride(
          updatedOverride,
          manager,
        );

        return manager.save(ResourceAvailabilityOverride, updatedOverride);
      },
    );
  }

  async archiveAvailabilityOverride(
    command: ArchiveResourceAvailabilityOverrideCommand,
    actor?: AuthorizationActor,
  ): Promise<void> {
    await this.availabilityOverridesRepository.manager.transaction(
      async (manager) => {
        const override = await this.findAvailabilityOverrideOrThrow(
          command.id,
          manager,
        );
        override.deletedById = actor?.userId;
        override.updatedById = actor?.userId;

        await manager.save(ResourceAvailabilityOverride, override);
        await manager.softRemove(ResourceAvailabilityOverride, override);
      },
    );
  }

  async getAvailabilityOverrideById(
    overrideId: string,
  ): Promise<ResourceAvailabilityOverride> {
    return this.findAvailabilityOverrideOrThrow(overrideId);
  }

  async getAvailabilityOverridesByResource(
    resourceId: string,
  ): Promise<ResourceAvailabilityOverride[]> {
    await this.availabilityOverrideValidationService.ensureResourceExists(
      resourceId,
    );

    return this.availabilityOverridesRepository.find({
      order: { createdAt: 'ASC', startDate: 'ASC' },
      where: { resourceId },
    });
  }

  private async findAvailabilityOverrideOrThrow(
    overrideId: string,
    manager?: Repository<ResourceAvailabilityOverride>['manager'],
  ): Promise<ResourceAvailabilityOverride> {
    const override =
      (await manager?.findOne(ResourceAvailabilityOverride, {
        where: { id: overrideId },
      })) ??
      (await this.availabilityOverridesRepository.findOne({
        where: { id: overrideId },
      }));

    if (!override) {
      throw new NotFoundException(
        `Resource availability override ${overrideId} not found`,
      );
    }

    return override;
  }
}
