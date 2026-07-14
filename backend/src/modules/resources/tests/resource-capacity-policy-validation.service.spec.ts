import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ResourceCapacityPolicyStatus } from '../enums/resource-capacity-policy-status.enum';
import { ResourceCapacityPolicyValidationService } from '../resource-capacity-policy-validation.service';

describe('ResourceCapacityPolicyValidationService', () => {
  let service: ResourceCapacityPolicyValidationService;
  let capacityPoliciesRepository: {
    createQueryBuilder: jest.Mock;
  };
  let resourcesRepository: {
    findOne: jest.Mock;
  };
  let queryBuilder: {
    where: jest.Mock;
    andWhere: jest.Mock;
    getOne: jest.Mock;
  };

  beforeEach(() => {
    queryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      where: jest.fn().mockReturnThis(),
    };
    capacityPoliciesRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    resourcesRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 'resource-id' }),
    };

    service = new ResourceCapacityPolicyValidationService(
      capacityPoliciesRepository as never,
      resourcesRepository as never,
    );
  });

  it('accepts a valid capacity policy command', async () => {
    await expect(
      service.validateCreateCapacityPolicy({
        capacityMinutesPerWorkingDay: 480,
        effectiveEndDate: '2026-07-31',
        effectiveStartDate: '2026-07-01',
        resourceId: 'resource-id',
        status: ResourceCapacityPolicyStatus.Active,
      }),
    ).resolves.toBeUndefined();
  });

  it.each([
    [0, '2026-07-01', '2026-07-01'],
    [480, '2026-07-01', undefined],
  ])(
    'accepts boundary capacity %s with dates %s to %s',
    async (
      capacityMinutesPerWorkingDay,
      effectiveStartDate,
      effectiveEndDate,
    ) => {
      await expect(
        service.validateCreateCapacityPolicy({
          capacityMinutesPerWorkingDay,
          effectiveEndDate,
          effectiveStartDate,
          resourceId: 'resource-id',
        }),
      ).resolves.toBeUndefined();
    },
  );

  it('rejects fractional capacity minutes', async () => {
    await expect(
      service.validateCreateCapacityPolicy({
        capacityMinutesPerWorkingDay: 0.5,
        effectiveStartDate: '2026-07-01',
        resourceId: 'resource-id',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects negative capacity minutes', async () => {
    await expect(
      service.validateCreateCapacityPolicy({
        capacityMinutesPerWorkingDay: -1,
        effectiveStartDate: '2026-07-01',
        resourceId: 'resource-id',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects invalid date ranges', async () => {
    await expect(
      service.validateCreateCapacityPolicy({
        capacityMinutesPerWorkingDay: 480,
        effectiveEndDate: '2026-07-01',
        effectiveStartDate: '2026-07-31',
        resourceId: 'resource-id',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects unsupported status values', async () => {
    await expect(
      service.validateUpdateCapacityPolicy({
        status: 'unsupported' as ResourceCapacityPolicyStatus,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects overlapping active policies', async () => {
    queryBuilder.getOne.mockResolvedValue({ id: 'policy-id' });

    await expect(
      service.ensureNoOverlappingActivePolicy({
        effectiveEndDate: '2026-07-31',
        effectiveStartDate: '2026-07-01',
        resourceId: 'resource-id',
        status: ResourceCapacityPolicyStatus.Active,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('uses an unbounded end date when checking open-ended policies', async () => {
    queryBuilder.getOne.mockResolvedValue(null);

    await expect(
      service.ensureNoOverlappingActivePolicy({
        effectiveEndDate: null,
        effectiveStartDate: '2026-07-01',
        resourceId: 'resource-id',
        status: ResourceCapacityPolicyStatus.Active,
      }),
    ).resolves.toBeUndefined();

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'policy.effective_start_date <= :effectiveEndDate',
      { effectiveEndDate: '9999-12-31' },
    );
  });

  it('bypasses overlap queries for inactive policies', async () => {
    await expect(
      service.ensureNoOverlappingActivePolicy({
        effectiveEndDate: '2026-07-31',
        effectiveStartDate: '2026-07-01',
        resourceId: 'resource-id',
        status: ResourceCapacityPolicyStatus.Draft,
      }),
    ).resolves.toBeUndefined();

    expect(
      capacityPoliciesRepository.createQueryBuilder,
    ).not.toHaveBeenCalled();
  });

  it('throws when the resource does not exist', async () => {
    resourcesRepository.findOne.mockResolvedValue(null);

    await expect(
      service.ensureResourceExists('missing-resource-id'),
    ).rejects.toThrow(NotFoundException);
  });
});
