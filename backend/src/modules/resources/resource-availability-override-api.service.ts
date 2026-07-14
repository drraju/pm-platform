import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthorizationActor } from '../../common/authz/authorization-policy.service';
import {
  CreateResourceAvailabilityOverrideDto,
  ResourceAvailabilityOverrideResponseDto,
  UpdateResourceAvailabilityOverrideDto,
} from './dto/resource-availability-override.dto';
import { ResourceAvailabilityOverrideMapper } from './resource-availability-override.mapper';
import { ResourceAvailabilityOverrideService } from './resource-availability-override.service';

@Injectable()
export class ResourceAvailabilityOverrideApiService {
  constructor(
    private readonly resourceAvailabilityOverrideService: ResourceAvailabilityOverrideService,
  ) {}

  async createAvailabilityOverride(
    resourceId: string,
    input: CreateResourceAvailabilityOverrideDto,
    actor: AuthorizationActor,
  ): Promise<ResourceAvailabilityOverrideResponseDto> {
    return ResourceAvailabilityOverrideMapper.toResponse(
      await this.resourceAvailabilityOverrideService.createAvailabilityOverride(
        ResourceAvailabilityOverrideMapper.toCreateCommand(resourceId, input),
        actor,
      ),
    );
  }

  async listAvailabilityOverrides(
    resourceId: string,
  ): Promise<ResourceAvailabilityOverrideResponseDto[]> {
    return ResourceAvailabilityOverrideMapper.toResponses(
      await this.resourceAvailabilityOverrideService.getAvailabilityOverridesByResource(
        resourceId,
      ),
    );
  }

  async getAvailabilityOverride(
    resourceId: string,
    overrideId: string,
  ): Promise<ResourceAvailabilityOverrideResponseDto> {
    const override =
      await this.resourceAvailabilityOverrideService.getAvailabilityOverrideById(
        overrideId,
      );
    this.ensureOverrideBelongsToResource(
      resourceId,
      override.resourceId,
      overrideId,
    );
    return ResourceAvailabilityOverrideMapper.toResponse(override);
  }

  async updateAvailabilityOverride(
    resourceId: string,
    overrideId: string,
    input: UpdateResourceAvailabilityOverrideDto,
    actor: AuthorizationActor,
  ): Promise<ResourceAvailabilityOverrideResponseDto> {
    const existing =
      await this.resourceAvailabilityOverrideService.getAvailabilityOverrideById(
        overrideId,
      );
    this.ensureOverrideBelongsToResource(
      resourceId,
      existing.resourceId,
      overrideId,
    );

    return ResourceAvailabilityOverrideMapper.toResponse(
      await this.resourceAvailabilityOverrideService.updateAvailabilityOverride(
        overrideId,
        ResourceAvailabilityOverrideMapper.toUpdateCommand(input),
        actor,
      ),
    );
  }

  async deleteAvailabilityOverride(
    resourceId: string,
    overrideId: string,
    actor: AuthorizationActor,
  ): Promise<void> {
    const existing =
      await this.resourceAvailabilityOverrideService.getAvailabilityOverrideById(
        overrideId,
      );
    this.ensureOverrideBelongsToResource(
      resourceId,
      existing.resourceId,
      overrideId,
    );

    await this.resourceAvailabilityOverrideService.archiveAvailabilityOverride(
      ResourceAvailabilityOverrideMapper.toArchiveCommand(overrideId),
      actor,
    );
  }

  private ensureOverrideBelongsToResource(
    requestedResourceId: string,
    actualResourceId: string,
    overrideId: string,
  ) {
    if (requestedResourceId !== actualResourceId) {
      throw new NotFoundException(
        `Resource availability override ${overrideId} not found for resource ${requestedResourceId}`,
      );
    }
  }
}
