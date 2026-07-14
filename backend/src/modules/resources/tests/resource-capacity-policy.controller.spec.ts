import { ResourceCapacityPolicyApiService } from '../resource-capacity-policy-api.service';
import { ResourceCapacityPolicyController } from '../resource-capacity-policy.controller';
import { ResourceCapacityPolicyStatus } from '../enums/resource-capacity-policy-status.enum';

type AuthenticatedRequest = Parameters<
  ResourceCapacityPolicyController['createCapacityPolicy']
>[0];

describe('ResourceCapacityPolicyController', () => {
  let controller: ResourceCapacityPolicyController;
  let service: Record<keyof ResourceCapacityPolicyApiService, jest.Mock>;

  beforeEach(() => {
    service = {
      createCapacityPolicy: jest.fn(),
      deleteCapacityPolicy: jest.fn(),
      getCapacityPolicy: jest.fn(),
      listCapacityPolicies: jest.fn(),
      updateCapacityPolicy: jest.fn(),
    };

    controller = new ResourceCapacityPolicyController(
      service as unknown as ResourceCapacityPolicyApiService,
    );
  });

  it('forwards authenticated write operations to the API service', async () => {
    const request = {
      user: {
        email: 'admin@example.com',
        roleId: 'admin-role-id',
        userId: '4d136f2c-f4b2-4d33-b351-397de2a93dc3',
      },
    } as unknown as AuthenticatedRequest;

    await controller.createCapacityPolicy(request, 'resource-id', {
      capacityMinutesPerWorkingDay: 480,
      effectiveStartDate: '2026-08-01',
      status: ResourceCapacityPolicyStatus.Active,
    });
    await controller.updateCapacityPolicy(request, 'resource-id', 'policy-id', {
      effectiveEndDate: '2026-08-31',
    });
    await controller.deleteCapacityPolicy(request, 'resource-id', 'policy-id');

    expect(service.createCapacityPolicy).toHaveBeenCalledWith(
      'resource-id',
      {
        capacityMinutesPerWorkingDay: 480,
        effectiveStartDate: '2026-08-01',
        status: ResourceCapacityPolicyStatus.Active,
      },
      request.user,
    );
    expect(service.updateCapacityPolicy).toHaveBeenCalledWith(
      'resource-id',
      'policy-id',
      { effectiveEndDate: '2026-08-31' },
      request.user,
    );
    expect(service.deleteCapacityPolicy).toHaveBeenCalledWith(
      'resource-id',
      'policy-id',
      request.user,
    );
  });

  it('forwards read operations to the API service', async () => {
    await controller.listCapacityPolicies('resource-id');
    await controller.getCapacityPolicy('resource-id', 'policy-id');

    expect(service.listCapacityPolicies).toHaveBeenCalledWith('resource-id');
    expect(service.getCapacityPolicy).toHaveBeenCalledWith(
      'resource-id',
      'policy-id',
    );
  });
});
