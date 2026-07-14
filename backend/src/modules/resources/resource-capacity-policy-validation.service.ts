import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Not, Repository } from 'typeorm';
import { Resource } from './entities/resource.entity';
import { ResourceCapacityPolicy } from './entities/resource-capacity-policy.entity';
import { ResourceCapacityPolicyStatus } from './enums/resource-capacity-policy-status.enum';
import {
  CreateResourceCapacityPolicyCommand,
  UpdateResourceCapacityPolicyCommand,
} from './resource-capacity-policy.commands';

export type ResourceCapacityPolicyValidationInput =
  | CreateResourceCapacityPolicyCommand
  | UpdateResourceCapacityPolicyCommand
  | Pick<
      ResourceCapacityPolicy,
      | 'resourceId'
      | 'capacityMinutesPerWorkingDay'
      | 'effectiveStartDate'
      | 'effectiveEndDate'
      | 'status'
    >;

@Injectable()
export class ResourceCapacityPolicyValidationService {
  constructor(
    @InjectRepository(ResourceCapacityPolicy)
    private readonly capacityPoliciesRepository: Repository<ResourceCapacityPolicy>,
    @InjectRepository(Resource)
    private readonly resourcesRepository: Repository<Resource>,
  ) {}

  async validateCreateCapacityPolicy(
    input: CreateResourceCapacityPolicyCommand,
  ) {
    await this.validateCapacityPolicy(input);
  }

  async validateUpdateCapacityPolicy(
    input: UpdateResourceCapacityPolicyCommand,
  ) {
    await this.validateCapacityPolicy(input);
  }

  async validateResolvedCapacityPolicy(
    input: ResourceCapacityPolicyValidationInput,
    manager?: EntityManager,
  ) {
    await this.validateCapacityPolicy(input, manager);
  }

  async ensureNoOverlappingActivePolicy(
    input: Pick<
      ResourceCapacityPolicy,
      'resourceId' | 'effectiveStartDate' | 'effectiveEndDate' | 'status'
    >,
    policyId?: string,
    manager?: EntityManager,
  ) {
    if (input.status !== ResourceCapacityPolicyStatus.Active) {
      return;
    }

    const policiesRepository =
      manager?.getRepository(ResourceCapacityPolicy) ??
      this.capacityPoliciesRepository;

    const effectiveEndDate = input.effectiveEndDate ?? '9999-12-31';

    const existing = await policiesRepository
      .createQueryBuilder('policy')
      .where('policy.resource_id = :resourceId', { resourceId: input.resourceId })
      .andWhere('policy.status = :status', {
        status: ResourceCapacityPolicyStatus.Active,
      })
      .andWhere('policy.deleted_at IS NULL')
      .andWhere(policyId ? 'policy.id <> :policyId' : '1=1', { policyId })
      .andWhere('policy.effective_start_date <= :effectiveEndDate', {
        effectiveEndDate,
      })
      .andWhere(
        "COALESCE(policy.effective_end_date, DATE '9999-12-31') >= :effectiveStartDate",
        {
          effectiveStartDate: input.effectiveStartDate,
        },
      )
      .getOne();

    if (existing) {
      throw new ConflictException(
        'Resource capacity policy overlaps an existing active policy',
      );
    }
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

  private async validateCapacityPolicy(
    input: ResourceCapacityPolicyValidationInput,
    manager?: EntityManager,
  ) {
    if (input.resourceId !== undefined) {
      await this.ensureResourceExists(input.resourceId, manager);
    }

    if (
      input.capacityMinutesPerWorkingDay !== undefined &&
      input.capacityMinutesPerWorkingDay !== null
    ) {
      this.validateNonNegativeInteger(
        input.capacityMinutesPerWorkingDay,
        'Capacity minutes per working day',
      );
    }

    if (input.status !== undefined && input.status !== null) {
      this.validateAllowedValue(
        input.status,
        Object.values(ResourceCapacityPolicyStatus),
        'status',
      );
    }

    if (
      input.effectiveStartDate !== undefined &&
      input.effectiveStartDate !== null &&
      input.effectiveEndDate !== undefined &&
      input.effectiveEndDate !== null
    ) {
      this.validateDateRange(input.effectiveStartDate, input.effectiveEndDate);
    }
  }

  private validateAllowedValue(
    value: string,
    allowedValues: string[],
    fieldName: string,
  ) {
    if (!allowedValues.includes(value)) {
      throw new BadRequestException(
        `Unsupported resource capacity policy ${fieldName}`,
      );
    }
  }

  private validateDateRange(startDate: string, endDate: string) {
    if (new Date(startDate) > new Date(endDate)) {
      throw new BadRequestException(
        'Resource capacity policy start date must be on or before end date',
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
}
