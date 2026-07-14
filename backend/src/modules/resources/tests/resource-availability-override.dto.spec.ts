import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateResourceAvailabilityOverrideDto,
  UpdateResourceAvailabilityOverrideDto,
} from '../dto/resource-availability-override.dto';
import { ResourceAvailabilityOverrideType } from '../enums/resource-availability-override-type.enum';

describe('ResourceAvailabilityOverride DTO validation', () => {
  it('accepts a valid create resource availability override payload', async () => {
    const dto = plainToInstance(CreateResourceAvailabilityOverrideDto, {
      availableMinutesPerWorkingDay: 240,
      endDate: '2026-08-03',
      overrideType: ResourceAvailabilityOverrideType.ReducedCapacity,
      reason: 'Training block',
      startDate: '2026-08-01',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('accepts partial update payloads', async () => {
    const dto = plainToInstance(UpdateResourceAvailabilityOverrideDto, {
      reason: 'Updated reason',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects invalid dates, enums, and minute values', async () => {
    const dto = plainToInstance(CreateResourceAvailabilityOverrideDto, {
      availableMinutesPerWorkingDay: -1,
      endDate: 'not-a-date',
      overrideType: 'unsupported',
      reason: 42,
      startDate: 'also-not-a-date',
    });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining([
        'availableMinutesPerWorkingDay',
        'endDate',
        'overrideType',
        'reason',
        'startDate',
      ]),
    );
  });
});
