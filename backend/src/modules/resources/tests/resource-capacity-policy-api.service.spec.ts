import { NotFoundException } from '@nestjs/common';
import { ResourceCapacityPolicyApiService } from '../resource-capacity-policy-api.service';
import { ResourceCapacityPolicy } from '../entities/resource-capacity-policy.entity';
import { ResourceCapacityPolicyStatus } from '../enums/resource-capacity-policy-status.enum';
import { ResourceCapacityPolicyService } from '../resource-capacity-policy.service';

const actor = {
  email: 'admin@example.com',
  roleId: 'admin-role-id',
  userId: '4d136f2c-f4b2-4d33-b351-397de2a93dc3',
};

describe('ResourceCapacityPolicyApiService', () => {
  let service: ResourceCapacityPolicyApiService;
  let capacityPolicyService: Record<
    keyof ResourceCapacityPolicyService,
    jest.Mock
  >;

  const policy = Object.assign(new ResourceCapacityPolicy(), {
    capacityMinutesPerWorkingDay: 480,
    createdAt: new Date('2026-07-10T00:00:00.000Z'),
    effectiveEndDate: '2026-08-31',
    effectiveStartDate: '2026-08-01',
    id: 'policy-id',
    resourceId: 'resource-id',
    status: ResourceCapacityPolicyStatus.Active,
    updatedAt: new Date('2026-07-10T00:00:00.000Z'),
  });

  beforeEach(() => {
    capacityPolicyService = {
      archiveCapacityPolicy: jest.fn(),
      createCapacityPolicy: jest.fn(),
      getCapacityPoliciesByResource: jest.fn(),
      getCapacityPolicyById: jest.fn(),
      updateCapacityPolicy: jest.fn(),
    };

    service = new ResourceCapacityPolicyApiService(
      capacityPolicyService as unknown as ResourceCapacityPolicyService,
    );
  });

  it('maps create and update DTOs into command-based service calls', async () => {
    capacityPolicyService.createCapacityPolicy.mockResolvedValue(policy);
    capacityPolicyService.getCapacityPolicyById.mockResolvedValue(policy);
    capacityPolicyService.updateCapacityPolicy.mockResolvedValue({
      ...policy,
      capacityMinutesPerWorkingDay: 420,
    });

    await service.createCapacityPolicy(
      'resource-id',
      {
        capacityMinutesPerWorkingDay: 480,
        effectiveEndDate: '2026-08-31',
        effectiveStartDate: '2026-08-01',
        status: ResourceCapacityPolicyStatus.Active,
      },
      actor,
    );
    await service.updateCapacityPolicy(
      'resource-id',
      'policy-id',
      { capacityMinutesPerWorkingDay: 420 },
      actor,
    );

    expect(capacityPolicyService.createCapacityPolicy).toHaveBeenCalledWith(
      {
        capacityMinutesPerWorkingDay: 480,
        effectiveEndDate: '2026-08-31',
        effectiveStartDate: '2026-08-01',
        resourceId: 'resource-id',
        status: ResourceCapacityPolicyStatus.Active,
      },
      actor,
    );
    expect(capacityPolicyService.updateCapacityPolicy).toHaveBeenCalledWith(
      'policy-id',
      { capacityMinutesPerWorkingDay: 420 },
      actor,
    );
  });

  it('archives through the archive command model after ownership checks', async () => {
    capacityPolicyService.getCapacityPolicyById.mockResolvedValue(policy);

    await service.deleteCapacityPolicy('resource-id', 'policy-id', actor);

    expect(capacityPolicyService.archiveCapacityPolicy).toHaveBeenCalledWith(
      { id: 'policy-id' },
      actor,
    );
  });

  it('throws not found when a policy is requested through the wrong resource path', async () => {
    capacityPolicyService.getCapacityPolicyById.mockResolvedValue(policy);

    await expect(
      service.getCapacityPolicy('other-resource-id', 'policy-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps list results to response DTOs', async () => {
    capacityPolicyService.getCapacityPoliciesByResource.mockResolvedValue([
      policy,
    ]);

    await expect(service.listCapacityPolicies('resource-id')).resolves.toEqual([
      expect.objectContaining({
        id: 'policy-id',
        resourceId: 'resource-id',
      }),
    ]);
  });
});
