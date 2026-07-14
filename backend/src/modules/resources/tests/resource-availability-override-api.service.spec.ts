import { NotFoundException } from '@nestjs/common';
import { ResourceAvailabilityOverrideApiService } from '../resource-availability-override-api.service';
import { ResourceAvailabilityOverride } from '../entities/resource-availability-override.entity';
import { ResourceAvailabilityOverrideType } from '../enums/resource-availability-override-type.enum';
import { ResourceAvailabilityOverrideService } from '../resource-availability-override.service';

const actor = {
  email: 'admin@example.com',
  roleId: 'admin-role-id',
  userId: '4d136f2c-f4b2-4d33-b351-397de2a93dc3',
};

describe('ResourceAvailabilityOverrideApiService', () => {
  let service: ResourceAvailabilityOverrideApiService;
  let availabilityOverrideService: Record<
    keyof ResourceAvailabilityOverrideService,
    jest.Mock
  >;

  const override = Object.assign(new ResourceAvailabilityOverride(), {
    availableMinutesPerWorkingDay: 240,
    createdAt: new Date('2026-07-10T00:00:00.000Z'),
    endDate: '2026-08-03',
    id: 'override-id',
    overrideType: ResourceAvailabilityOverrideType.ReducedCapacity,
    reason: 'Training block',
    resourceId: 'resource-id',
    startDate: '2026-08-01',
    updatedAt: new Date('2026-07-10T00:00:00.000Z'),
  });

  beforeEach(() => {
    availabilityOverrideService = {
      archiveAvailabilityOverride: jest.fn(),
      createAvailabilityOverride: jest.fn(),
      getAvailabilityOverrideById: jest.fn(),
      getAvailabilityOverridesByResource: jest.fn(),
      updateAvailabilityOverride: jest.fn(),
    };

    service = new ResourceAvailabilityOverrideApiService(
      availabilityOverrideService as unknown as ResourceAvailabilityOverrideService,
    );
  });

  it('maps create and update DTOs into command-based service calls', async () => {
    availabilityOverrideService.createAvailabilityOverride.mockResolvedValue(
      override,
    );
    availabilityOverrideService.getAvailabilityOverrideById.mockResolvedValue(
      override,
    );
    availabilityOverrideService.updateAvailabilityOverride.mockResolvedValue({
      ...override,
      reason: 'Updated reason',
    });

    await service.createAvailabilityOverride(
      'resource-id',
      {
        availableMinutesPerWorkingDay: 240,
        endDate: '2026-08-03',
        overrideType: ResourceAvailabilityOverrideType.ReducedCapacity,
        reason: 'Training block',
        startDate: '2026-08-01',
      },
      actor,
    );
    await service.updateAvailabilityOverride(
      'resource-id',
      'override-id',
      { reason: 'Updated reason' },
      actor,
    );

    expect(
      availabilityOverrideService.createAvailabilityOverride,
    ).toHaveBeenCalledWith(
      {
        availableMinutesPerWorkingDay: 240,
        endDate: '2026-08-03',
        overrideType: ResourceAvailabilityOverrideType.ReducedCapacity,
        reason: 'Training block',
        resourceId: 'resource-id',
        startDate: '2026-08-01',
      },
      actor,
    );
    expect(
      availabilityOverrideService.updateAvailabilityOverride,
    ).toHaveBeenCalledWith('override-id', { reason: 'Updated reason' }, actor);
  });

  it('archives through the archive command model after ownership checks', async () => {
    availabilityOverrideService.getAvailabilityOverrideById.mockResolvedValue(
      override,
    );

    await service.deleteAvailabilityOverride(
      'resource-id',
      'override-id',
      actor,
    );

    expect(
      availabilityOverrideService.archiveAvailabilityOverride,
    ).toHaveBeenCalledWith({ id: 'override-id' }, actor);
  });

  it('throws not found when an override is requested through the wrong resource path', async () => {
    availabilityOverrideService.getAvailabilityOverrideById.mockResolvedValue(
      override,
    );

    await expect(
      service.getAvailabilityOverride('other-resource-id', 'override-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps list results to response DTOs', async () => {
    availabilityOverrideService.getAvailabilityOverridesByResource.mockResolvedValue(
      [override],
    );

    await expect(
      service.listAvailabilityOverrides('resource-id'),
    ).resolves.toEqual([
      expect.objectContaining({
        id: 'override-id',
        resourceId: 'resource-id',
      }),
    ]);
  });
});
