import { ResourceCapacityPolicy } from '../entities/resource-capacity-policy.entity';
import { ResourceCapacityPolicyStatus } from '../enums/resource-capacity-policy-status.enum';
import { ResourceCapacityPolicyMapper } from '../resource-capacity-policy.mapper';

describe('ResourceCapacityPolicyMapper', () => {
  it('preserves omitted optional update fields as undefined', () => {
    expect(ResourceCapacityPolicyMapper.toUpdateCommand({})).toEqual({
      capacityMinutesPerWorkingDay: undefined,
      effectiveEndDate: undefined,
      effectiveStartDate: undefined,
      status: undefined,
    });
  });

  it('preserves an explicit null effective end date', () => {
    expect(
      ResourceCapacityPolicyMapper.toUpdateCommand({ effectiveEndDate: null }),
    ).toEqual(
      expect.objectContaining({
        effectiveEndDate: null,
      }),
    );
  });

  it('maps populated commands and responses without leaking entity state', () => {
    expect(
      ResourceCapacityPolicyMapper.toCreateCommand('resource-id', {
        capacityMinutesPerWorkingDay: 480,
        effectiveEndDate: '2026-08-31',
        effectiveStartDate: '2026-08-01',
        status: ResourceCapacityPolicyStatus.Active,
      }),
    ).toEqual({
      capacityMinutesPerWorkingDay: 480,
      effectiveEndDate: '2026-08-31',
      effectiveStartDate: '2026-08-01',
      resourceId: 'resource-id',
      status: ResourceCapacityPolicyStatus.Active,
    });

    const policy = Object.assign(new ResourceCapacityPolicy(), {
      capacityMinutesPerWorkingDay: 480,
      createdAt: new Date('2026-07-10T00:00:00.000Z'),
      effectiveEndDate: '2026-08-31',
      effectiveStartDate: '2026-08-01',
      id: 'policy-id',
      resourceId: 'resource-id',
      status: ResourceCapacityPolicyStatus.Active,
      updatedAt: new Date('2026-07-11T00:00:00.000Z'),
    });

    expect(ResourceCapacityPolicyMapper.toResponse(policy)).toEqual({
      capacityMinutesPerWorkingDay: 480,
      createdAt: policy.createdAt,
      effectiveEndDate: '2026-08-31',
      effectiveStartDate: '2026-08-01',
      id: 'policy-id',
      resourceId: 'resource-id',
      status: ResourceCapacityPolicyStatus.Active,
      updatedAt: policy.updatedAt,
    });
  });
});
