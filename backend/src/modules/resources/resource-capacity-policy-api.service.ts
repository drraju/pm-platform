import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthorizationActor } from '../../common/authz/authorization-policy.service';
import {
  CreateResourceCapacityPolicyDto,
  ResourceCapacityPolicyResponseDto,
  UpdateResourceCapacityPolicyDto,
} from './dto/resource-capacity-policy.dto';
import { ResourceCapacityPolicyMapper } from './resource-capacity-policy.mapper';
import { ResourceCapacityPolicyService } from './resource-capacity-policy.service';

@Injectable()
export class ResourceCapacityPolicyApiService {
  constructor(
    private readonly resourceCapacityPolicyService: ResourceCapacityPolicyService,
  ) {}

  async createCapacityPolicy(
    resourceId: string,
    input: CreateResourceCapacityPolicyDto,
    actor: AuthorizationActor,
  ): Promise<ResourceCapacityPolicyResponseDto> {
    return ResourceCapacityPolicyMapper.toResponse(
      await this.resourceCapacityPolicyService.createCapacityPolicy(
        ResourceCapacityPolicyMapper.toCreateCommand(resourceId, input),
        actor,
      ),
    );
  }

  async listCapacityPolicies(
    resourceId: string,
  ): Promise<ResourceCapacityPolicyResponseDto[]> {
    return ResourceCapacityPolicyMapper.toResponses(
      await this.resourceCapacityPolicyService.getCapacityPoliciesByResource(
        resourceId,
      ),
    );
  }

  async getCapacityPolicy(
    resourceId: string,
    policyId: string,
  ): Promise<ResourceCapacityPolicyResponseDto> {
    const policy =
      await this.resourceCapacityPolicyService.getCapacityPolicyById(policyId);
    this.ensurePolicyBelongsToResource(resourceId, policy.resourceId, policyId);
    return ResourceCapacityPolicyMapper.toResponse(policy);
  }

  async updateCapacityPolicy(
    resourceId: string,
    policyId: string,
    input: UpdateResourceCapacityPolicyDto,
    actor: AuthorizationActor,
  ): Promise<ResourceCapacityPolicyResponseDto> {
    const existing =
      await this.resourceCapacityPolicyService.getCapacityPolicyById(policyId);
    this.ensurePolicyBelongsToResource(
      resourceId,
      existing.resourceId,
      policyId,
    );

    return ResourceCapacityPolicyMapper.toResponse(
      await this.resourceCapacityPolicyService.updateCapacityPolicy(
        policyId,
        ResourceCapacityPolicyMapper.toUpdateCommand(input),
        actor,
      ),
    );
  }

  async deleteCapacityPolicy(
    resourceId: string,
    policyId: string,
    actor: AuthorizationActor,
  ): Promise<void> {
    const existing =
      await this.resourceCapacityPolicyService.getCapacityPolicyById(policyId);
    this.ensurePolicyBelongsToResource(
      resourceId,
      existing.resourceId,
      policyId,
    );

    await this.resourceCapacityPolicyService.archiveCapacityPolicy(
      ResourceCapacityPolicyMapper.toArchiveCommand(policyId),
      actor,
    );
  }

  private ensurePolicyBelongsToResource(
    requestedResourceId: string,
    actualResourceId: string,
    policyId: string,
  ) {
    if (requestedResourceId !== actualResourceId) {
      throw new NotFoundException(
        `Resource capacity policy ${policyId} not found for resource ${requestedResourceId}`,
      );
    }
  }
}
