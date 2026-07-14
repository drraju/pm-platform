import { ResourceAvailabilityOverride } from '../entities/resource-availability-override.entity';
import { ResourceAvailabilityOverrideType } from '../enums/resource-availability-override-type.enum';
import { ResourceAvailabilityOverrideMapper } from '../resource-availability-override.mapper';

describe('ResourceAvailabilityOverrideMapper', () => {
  it('preserves omitted optional update fields as undefined', () => {
    expect(ResourceAvailabilityOverrideMapper.toUpdateCommand({})).toEqual({
      availableMinutesPerWorkingDay: undefined,
      endDate: undefined,
      overrideType: undefined,
      reason: undefined,
      startDate: undefined,
    });
  });

  it('preserves explicit null quantitative and reason values', () => {
    expect(
      ResourceAvailabilityOverrideMapper.toUpdateCommand({
        availableMinutesPerWorkingDay: null,
        reason: null,
      }),
    ).toEqual(
      expect.objectContaining({
        availableMinutesPerWorkingDay: null,
        reason: null,
      }),
    );
  });

  it('maps populated commands and responses without leaking entity state', () => {
    expect(
      ResourceAvailabilityOverrideMapper.toCreateCommand('resource-id', {
        availableMinutesPerWorkingDay: 240,
        endDate: '2026-08-03',
        overrideType: ResourceAvailabilityOverrideType.ReducedCapacity,
        reason: 'Training block',
        startDate: '2026-08-01',
      }),
    ).toEqual({
      availableMinutesPerWorkingDay: 240,
      endDate: '2026-08-03',
      overrideType: ResourceAvailabilityOverrideType.ReducedCapacity,
      reason: 'Training block',
      resourceId: 'resource-id',
      startDate: '2026-08-01',
    });

    const override = Object.assign(new ResourceAvailabilityOverride(), {
      availableMinutesPerWorkingDay: 240,
      createdAt: new Date('2026-07-10T00:00:00.000Z'),
      endDate: '2026-08-03',
      id: 'override-id',
      overrideType: ResourceAvailabilityOverrideType.ReducedCapacity,
      reason: 'Training block',
      resourceId: 'resource-id',
      startDate: '2026-08-01',
      updatedAt: new Date('2026-07-11T00:00:00.000Z'),
    });

    expect(ResourceAvailabilityOverrideMapper.toResponse(override)).toEqual({
      availableMinutesPerWorkingDay: 240,
      createdAt: override.createdAt,
      endDate: '2026-08-03',
      id: 'override-id',
      overrideType: ResourceAvailabilityOverrideType.ReducedCapacity,
      reason: 'Training block',
      resourceId: 'resource-id',
      startDate: '2026-08-01',
      updatedAt: override.updatedAt,
    });
  });
});
