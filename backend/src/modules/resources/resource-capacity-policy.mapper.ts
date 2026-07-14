import {
  CreateResourceCapacityPolicyDto,
  ResourceCapacityPolicyResponseDto,
  UpdateResourceCapacityPolicyDto,
} from './dto/resource-capacity-policy.dto';
import { ResourceCapacityPolicy } from './entities/resource-capacity-policy.entity';
import {
  ArchiveResourceCapacityPolicyCommand,
  CreateResourceCapacityPolicyCommand,
  UpdateResourceCapacityPolicyCommand,
} from './resource-capacity-policy.commands';

export class ResourceCapacityPolicyMapper {
  static toCreateCommand(
    resourceId: string,
    input: CreateResourceCapacityPolicyDto,
  ): CreateResourceCapacityPolicyCommand {
    return {
      capacityMinutesPerWorkingDay: input.capacityMinutesPerWorkingDay,
      effectiveEndDate: input.effectiveEndDate ?? null,
      effectiveStartDate: input.effectiveStartDate,
      resourceId,
      status: input.status,
    };
  }

  static toUpdateCommand(
    input: UpdateResourceCapacityPolicyDto,
  ): UpdateResourceCapacityPolicyCommand {
    return {
      capacityMinutesPerWorkingDay: input.capacityMinutesPerWorkingDay,
      effectiveEndDate:
        input.effectiveEndDate !== undefined
          ? (input.effectiveEndDate ?? null)
          : undefined,
      effectiveStartDate: input.effectiveStartDate,
      status: input.status,
    };
  }

  static toArchiveCommand(
    policyId: string,
  ): ArchiveResourceCapacityPolicyCommand {
    return { id: policyId };
  }

  static toResponse(
    policy: ResourceCapacityPolicy,
  ): ResourceCapacityPolicyResponseDto {
    return {
      capacityMinutesPerWorkingDay: policy.capacityMinutesPerWorkingDay,
      createdAt: policy.createdAt,
      effectiveEndDate: policy.effectiveEndDate ?? null,
      effectiveStartDate: policy.effectiveStartDate,
      id: policy.id,
      resourceId: policy.resourceId,
      status: policy.status,
      updatedAt: policy.updatedAt,
    };
  }

  static toResponses(
    policies: ResourceCapacityPolicy[],
  ): ResourceCapacityPolicyResponseDto[] {
    return policies.map((policy) => this.toResponse(policy));
  }
}
