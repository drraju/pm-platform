import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthorizationActor } from '../../common/authz/authorization-policy.service';
import { Not, Repository } from 'typeorm';
import { ResourceCapacityPolicy } from './entities/resource-capacity-policy.entity';
import { ResourceCapacityPolicyStatus } from './enums/resource-capacity-policy-status.enum';
import {
  ArchiveResourceCapacityPolicyCommand,
  CreateResourceCapacityPolicyCommand,
  UpdateResourceCapacityPolicyCommand,
} from './resource-capacity-policy.commands';
import { ResourceCapacityPolicyValidationService } from './resource-capacity-policy-validation.service';

@Injectable()
export class ResourceCapacityPolicyService {
  constructor(
    @InjectRepository(ResourceCapacityPolicy)
    private readonly capacityPoliciesRepository: Repository<ResourceCapacityPolicy>,
    private readonly capacityPolicyValidationService: ResourceCapacityPolicyValidationService,
  ) {}

  async createCapacityPolicy(
    input: CreateResourceCapacityPolicyCommand,
    actor?: AuthorizationActor,
  ): Promise<ResourceCapacityPolicy> {
    return this.capacityPoliciesRepository.manager.transaction(
      async (manager) => {
        await this.capacityPolicyValidationService.validateResolvedCapacityPolicy(
          input,
          manager,
        );
        await this.capacityPolicyValidationService.ensureNoOverlappingActivePolicy(
          {
            effectiveEndDate: input.effectiveEndDate ?? null,
            effectiveStartDate: input.effectiveStartDate,
            resourceId: input.resourceId,
            status: input.status ?? ResourceCapacityPolicyStatus.Draft,
          },
          undefined,
          manager,
        );

        const policy = manager.create(ResourceCapacityPolicy, {
          capacityMinutesPerWorkingDay: input.capacityMinutesPerWorkingDay,
          createdById: actor?.userId,
          effectiveEndDate: input.effectiveEndDate ?? null,
          effectiveStartDate: input.effectiveStartDate,
          resourceId: input.resourceId,
          status: input.status ?? ResourceCapacityPolicyStatus.Draft,
          updatedById: actor?.userId,
        });

        return manager.save(ResourceCapacityPolicy, policy);
      },
    );
  }

  async updateCapacityPolicy(
    policyId: string,
    input: UpdateResourceCapacityPolicyCommand,
    actor?: AuthorizationActor,
  ): Promise<ResourceCapacityPolicy> {
    return this.capacityPoliciesRepository.manager.transaction(
      async (manager) => {
        const policy = await this.findCapacityPolicyOrThrow(policyId, manager);
        const updatedPolicy = manager.merge(ResourceCapacityPolicy, policy, {
          ...input,
          effectiveEndDate:
            input.effectiveEndDate !== undefined
              ? input.effectiveEndDate
              : policy.effectiveEndDate,
          updatedById: actor?.userId,
        });

        await this.capacityPolicyValidationService.validateResolvedCapacityPolicy(
          updatedPolicy,
          manager,
        );
        await this.capacityPolicyValidationService.ensureNoOverlappingActivePolicy(
          updatedPolicy,
          policyId,
          manager,
        );

        return manager.save(ResourceCapacityPolicy, updatedPolicy);
      },
    );
  }

  async archiveCapacityPolicy(
    command: ArchiveResourceCapacityPolicyCommand,
    actor?: AuthorizationActor,
  ): Promise<ResourceCapacityPolicy> {
    const policy = await this.findCapacityPolicyOrThrow(command.id);
    policy.status = ResourceCapacityPolicyStatus.Archived;
    policy.updatedById = actor?.userId;
    return this.capacityPoliciesRepository.save(policy);
  }

  async getCapacityPolicyById(
    policyId: string,
  ): Promise<ResourceCapacityPolicy> {
    return this.findCapacityPolicyOrThrow(policyId);
  }

  async getCapacityPoliciesByResource(
    resourceId: string,
  ): Promise<ResourceCapacityPolicy[]> {
    await this.capacityPolicyValidationService.ensureResourceExists(resourceId);

    return this.capacityPoliciesRepository.find({
      order: { createdAt: 'ASC', effectiveStartDate: 'ASC' },
      where: {
        resourceId,
        status: Not(ResourceCapacityPolicyStatus.Archived),
      },
    });
  }

  private async findCapacityPolicyOrThrow(
    policyId: string,
    manager?: Repository<ResourceCapacityPolicy>['manager'],
  ): Promise<ResourceCapacityPolicy> {
    const policy =
      (await manager?.findOne(ResourceCapacityPolicy, {
        where: { id: policyId },
      })) ??
      (await this.capacityPoliciesRepository.findOne({
        where: { id: policyId },
      }));

    if (!policy) {
      throw new NotFoundException(
        `Resource capacity policy ${policyId} not found`,
      );
    }

    return policy;
  }
}
