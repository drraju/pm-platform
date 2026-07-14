import { ResourceAvailabilityOverrideApiService } from '../resource-availability-override-api.service';
import { ResourceAvailabilityOverrideController } from '../resource-availability-override.controller';
import { ResourceAvailabilityOverrideType } from '../enums/resource-availability-override-type.enum';

type AuthenticatedRequest = Parameters<
  ResourceAvailabilityOverrideController['createAvailabilityOverride']
>[0];

describe('ResourceAvailabilityOverrideController', () => {
  let controller: ResourceAvailabilityOverrideController;
  let service: Record<keyof ResourceAvailabilityOverrideApiService, jest.Mock>;

  beforeEach(() => {
    service = {
      createAvailabilityOverride: jest.fn(),
      deleteAvailabilityOverride: jest.fn(),
      getAvailabilityOverride: jest.fn(),
      listAvailabilityOverrides: jest.fn(),
      updateAvailabilityOverride: jest.fn(),
    };

    controller = new ResourceAvailabilityOverrideController(
      service as unknown as ResourceAvailabilityOverrideApiService,
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

    await controller.createAvailabilityOverride(request, 'resource-id', {
      availableMinutesPerWorkingDay: 240,
      endDate: '2026-08-03',
      overrideType: ResourceAvailabilityOverrideType.ReducedCapacity,
      reason: 'Training block',
      startDate: '2026-08-01',
    });
    await controller.updateAvailabilityOverride(
      request,
      'resource-id',
      'override-id',
      {
        reason: 'Updated reason',
      },
    );
    await controller.deleteAvailabilityOverride(
      request,
      'resource-id',
      'override-id',
    );

    expect(service.createAvailabilityOverride).toHaveBeenCalledWith(
      'resource-id',
      {
        availableMinutesPerWorkingDay: 240,
        endDate: '2026-08-03',
        overrideType: ResourceAvailabilityOverrideType.ReducedCapacity,
        reason: 'Training block',
        startDate: '2026-08-01',
      },
      request.user,
    );
    expect(service.updateAvailabilityOverride).toHaveBeenCalledWith(
      'resource-id',
      'override-id',
      { reason: 'Updated reason' },
      request.user,
    );
    expect(service.deleteAvailabilityOverride).toHaveBeenCalledWith(
      'resource-id',
      'override-id',
      request.user,
    );
  });

  it('forwards read operations to the API service', async () => {
    await controller.listAvailabilityOverrides('resource-id');
    await controller.getAvailabilityOverride('resource-id', 'override-id');

    expect(service.listAvailabilityOverrides).toHaveBeenCalledWith(
      'resource-id',
    );
    expect(service.getAvailabilityOverride).toHaveBeenCalledWith(
      'resource-id',
      'override-id',
    );
  });
});
