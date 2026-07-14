import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Not, Repository } from 'typeorm';
import { ResourceCapacityPolicy } from '../entities/resource-capacity-policy.entity';
import { ResourceCapacityPolicyStatus } from '../enums/resource-capacity-policy-status.enum';
import {
  CreateResourceCapacityPolicyCommand,
  UpdateResourceCapacityPolicyCommand,
} from '../resource-capacity-policy.commands';
import { ResourceCapacityPolicyService } from '../resource-capacity-policy.service';

type MockRepository<T extends object = object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
> & {
  manager: {
    create: jest.Mock;
    findOne: jest.Mock;
    merge: jest.Mock;
    save: jest.Mock;
    transaction: jest.Mock;
  };
};

const actor = {
  email: 'admin@example.com',
  roleId: 'admin-role-id',
  userId: '4d136f2c-f4b2-4d33-b351-397de2a93dc3',
};

describe('ResourceCapacityPolicyService', () => {
  let service: ResourceCapacityPolicyService;
  let capacityPoliciesRepository: MockRepository<ResourceCapacityPolicy>;
  let validationService: {
    ensureNoOverlappingActivePolicy: jest.Mock;
    ensureResourceExists: jest.Mock;
    validateResolvedCapacityPolicy: jest.Mock;
  };

  const existingPolicy = Object.assign(new ResourceCapacityPolicy(), {
    capacityMinutesPerWorkingDay: 480,
    createdAt: new Date('2026-07-10T00:00:00.000Z'),
    effectiveEndDate: '2026-07-31',
    effectiveStartDate: '2026-07-01',
    id: 'policy-id',
    resourceId: 'resource-id',
    status: ResourceCapacityPolicyStatus.Active,
    updatedAt: new Date('2026-07-10T00:00:00.000Z'),
  });

  beforeEach(() => {
    capacityPoliciesRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((input: Partial<ResourceCapacityPolicy>) =>
        Promise.resolve(
          Object.assign(new ResourceCapacityPolicy(), {
            id: 'policy-id',
            ...input,
          }),
        ),
      ),
      manager: {
        create: jest.fn(
          (
            _entity: typeof ResourceCapacityPolicy,
            input: Partial<ResourceCapacityPolicy>,
          ) => Object.assign(new ResourceCapacityPolicy(), input),
        ),
        findOne: jest.fn(),
        merge: jest.fn(
          (
            _entity: typeof ResourceCapacityPolicy,
            target: ResourceCapacityPolicy,
            source: Partial<ResourceCapacityPolicy>,
          ) => Object.assign(new ResourceCapacityPolicy(), target, source),
        ),
        save: jest.fn(
          (
            _entity: typeof ResourceCapacityPolicy,
            input: ResourceCapacityPolicy,
          ) => Promise.resolve(input),
        ),
        transaction: jest.fn(
          (
            callback: (
              manager: MockRepository<ResourceCapacityPolicy>['manager'],
            ) => Promise<ResourceCapacityPolicy>,
          ) => callback(capacityPoliciesRepository.manager),
        ),
      },
    };

    validationService = {
      ensureNoOverlappingActivePolicy: jest.fn(),
      ensureResourceExists: jest.fn(),
      validateResolvedCapacityPolicy: jest.fn(),
    };

    service = new ResourceCapacityPolicyService(
      capacityPoliciesRepository as Repository<ResourceCapacityPolicy>,
      validationService as never,
    );
  });

  it('creates a capacity policy in a transaction with audit metadata', async () => {
    const input: CreateResourceCapacityPolicyCommand = {
      capacityMinutesPerWorkingDay: 480,
      effectiveEndDate: '2026-07-31',
      effectiveStartDate: '2026-07-01',
      resourceId: 'resource-id',
      status: ResourceCapacityPolicyStatus.Active,
    };

    const created = await service.createCapacityPolicy(input, actor);

    expect(capacityPoliciesRepository.manager.transaction).toHaveBeenCalled();
    expect(
      validationService.validateResolvedCapacityPolicy,
    ).toHaveBeenCalledWith(input, capacityPoliciesRepository.manager);
    expect(
      validationService.ensureNoOverlappingActivePolicy,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        effectiveEndDate: '2026-07-31',
        effectiveStartDate: '2026-07-01',
        resourceId: 'resource-id',
        status: ResourceCapacityPolicyStatus.Active,
      }),
      undefined,
      capacityPoliciesRepository.manager,
    );
    expect(created).toEqual(
      expect.objectContaining({
        capacityMinutesPerWorkingDay: 480,
        createdById: actor.userId,
        resourceId: 'resource-id',
        updatedById: actor.userId,
      }),
    );
  });

  it('stops persistence when create validation fails', async () => {
    validationService.validateResolvedCapacityPolicy.mockRejectedValue(
      new BadRequestException('invalid capacity policy'),
    );

    await expect(
      service.createCapacityPolicy({
        capacityMinutesPerWorkingDay: -1,
        effectiveStartDate: '2026-07-01',
        resourceId: 'resource-id',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(capacityPoliciesRepository.manager.create).not.toHaveBeenCalled();
    expect(capacityPoliciesRepository.manager.save).not.toHaveBeenCalled();
    expect(
      validationService.ensureNoOverlappingActivePolicy,
    ).not.toHaveBeenCalled();
  });

  it('updates a capacity policy using merged state validation', async () => {
    capacityPoliciesRepository.manager.findOne.mockResolvedValue(
      existingPolicy,
    );
    const input: UpdateResourceCapacityPolicyCommand = {
      capacityMinutesPerWorkingDay: 420,
      effectiveEndDate: null,
    };

    const updated = await service.updateCapacityPolicy(
      existingPolicy.id,
      input,
      actor,
    );

    expect(
      validationService.validateResolvedCapacityPolicy,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        capacityMinutesPerWorkingDay: 420,
        effectiveEndDate: null,
        effectiveStartDate: existingPolicy.effectiveStartDate,
      }),
      capacityPoliciesRepository.manager,
    );
    expect(
      validationService.ensureNoOverlappingActivePolicy,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        id: existingPolicy.id,
        resourceId: existingPolicy.resourceId,
      }),
      existingPolicy.id,
      capacityPoliciesRepository.manager,
    );
    expect(updated).toEqual(
      expect.objectContaining({
        capacityMinutesPerWorkingDay: 420,
        effectiveEndDate: null,
        updatedById: actor.userId,
      }),
    );
  });

  it('archives a capacity policy without redesigning persistence', async () => {
    capacityPoliciesRepository.findOne?.mockResolvedValue(existingPolicy);

    await expect(
      service.archiveCapacityPolicy({ id: existingPolicy.id }, actor),
    ).resolves.toEqual(
      expect.objectContaining({
        status: ResourceCapacityPolicyStatus.Archived,
        updatedById: actor.userId,
      }),
    );
  });

  it('lists policies by resource after validating resource existence', async () => {
    capacityPoliciesRepository.find?.mockResolvedValue([existingPolicy]);

    await expect(
      service.getCapacityPoliciesByResource(existingPolicy.resourceId),
    ).resolves.toEqual([existingPolicy]);

    expect(validationService.ensureResourceExists).toHaveBeenCalledWith(
      existingPolicy.resourceId,
    );
    expect(capacityPoliciesRepository.find).toHaveBeenCalledWith({
      order: { createdAt: 'ASC', effectiveStartDate: 'ASC' },
      where: {
        resourceId: existingPolicy.resourceId,
        status: Not(ResourceCapacityPolicyStatus.Archived),
      },
    });
  });

  it('throws when updating a missing capacity policy', async () => {
    capacityPoliciesRepository.manager.findOne.mockResolvedValue(null);

    await expect(
      service.updateCapacityPolicy('missing-policy-id', {}),
    ).rejects.toThrow(NotFoundException);
  });
});
