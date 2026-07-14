import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ResourceAvailabilityOverrideType } from '../enums/resource-availability-override-type.enum';
import { ResourceAvailabilityOverrideValidationService } from '../resource-availability-override-validation.service';

describe('ResourceAvailabilityOverrideValidationService', () => {
  let service: ResourceAvailabilityOverrideValidationService;
  let resourcesRepository: { findOne: jest.Mock };

  beforeEach(() => {
    resourcesRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 'resource-id' }),
    };

    service = new ResourceAvailabilityOverrideValidationService(
      {} as never,
      resourcesRepository as never,
    );
  });

  it('accepts a valid reduced-capacity override command', async () => {
    await expect(
      service.validateCreateAvailabilityOverride({
        availableMinutesPerWorkingDay: 240,
        endDate: '2026-08-03',
        overrideType: ResourceAvailabilityOverrideType.ReducedCapacity,
        resourceId: 'resource-id',
        startDate: '2026-08-01',
      }),
    ).resolves.toBeUndefined();
  });

  it('rejects invalid date ranges', async () => {
    await expect(
      service.validateCreateAvailabilityOverride({
        endDate: '2026-08-01',
        overrideType: ResourceAvailabilityOverrideType.Unavailable,
        resourceId: 'resource-id',
        startDate: '2026-08-03',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects unavailable overrides with quantitative values', async () => {
    await expect(
      service.validateCreateAvailabilityOverride({
        availableMinutesPerWorkingDay: 120,
        endDate: '2026-08-03',
        overrideType: ResourceAvailabilityOverrideType.Unavailable,
        resourceId: 'resource-id',
        startDate: '2026-08-01',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects reduced-capacity overrides without quantitative values', async () => {
    await expect(
      service.validateCreateAvailabilityOverride({
        endDate: '2026-08-03',
        overrideType: ResourceAvailabilityOverrideType.ReducedCapacity,
        resourceId: 'resource-id',
        startDate: '2026-08-01',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws when the resource does not exist', async () => {
    resourcesRepository.findOne.mockResolvedValue(null);

    await expect(service.ensureResourceExists('missing-resource-id')).rejects.toThrow(
      NotFoundException,
    );
  });
});
