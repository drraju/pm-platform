import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateResourceCapacityPolicyDto,
  UpdateResourceCapacityPolicyDto,
} from '../dto/resource-capacity-policy.dto';
import { ResourceCapacityPolicyStatus } from '../enums/resource-capacity-policy-status.enum';

describe('ResourceCapacityPolicy DTO validation', () => {
  it('accepts a valid create resource capacity policy payload', async () => {
    const dto = plainToInstance(CreateResourceCapacityPolicyDto, {
      capacityMinutesPerWorkingDay: 480,
      effectiveEndDate: '2026-08-31',
      effectiveStartDate: '2026-08-01',
      status: ResourceCapacityPolicyStatus.Active,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('accepts partial update payloads', async () => {
    const dto = plainToInstance(UpdateResourceCapacityPolicyDto, {
      capacityMinutesPerWorkingDay: 420,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects invalid dates, enums, and capacity values', async () => {
    const dto = plainToInstance(CreateResourceCapacityPolicyDto, {
      capacityMinutesPerWorkingDay: -1,
      effectiveEndDate: 'not-a-date',
      effectiveStartDate: 'also-not-a-date',
      status: 'unsupported',
    });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining([
        'capacityMinutesPerWorkingDay',
        'effectiveEndDate',
        'effectiveStartDate',
        'status',
      ]),
    );
  });
});
