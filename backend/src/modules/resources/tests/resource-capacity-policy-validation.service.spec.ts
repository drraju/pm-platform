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

  it('throws when the resource does not exist', async () => {
    resourcesRepository.findOne.mockResolvedValue(null);

    await expect(service.ensureResourceExists('missing-resource-id')).rejects.toThrow(
      NotFoundException,
    );
  });
});
