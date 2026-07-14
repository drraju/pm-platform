import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ResourceAvailabilityOverride } from '../entities/resource-availability-override.entity';
import { ResourceAvailabilityOverrideType } from '../enums/resource-availability-override-type.enum';
import {
  CreateResourceAvailabilityOverrideCommand,
  UpdateResourceAvailabilityOverrideCommand,
} from '../resource-availability-override.commands';
import { ResourceAvailabilityOverrideService } from '../resource-availability-override.service';

type MockRepository<T extends object = object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
> & {
  manager: {
    create: jest.Mock;
    findOne: jest.Mock;
    merge: jest.Mock;
    save: jest.Mock;
    softRemove: jest.Mock;
    transaction: jest.Mock;
  };
};

const actor = {
  email: 'admin@example.com',
  roleId: 'admin-role-id',
  userId: '4d136f2c-f4b2-4d33-b351-397de2a93dc3',
};

describe('ResourceAvailabilityOverrideService', () => {
  let service: ResourceAvailabilityOverrideService;
  let availabilityOverridesRepository: MockRepository<ResourceAvailabilityOverride>;
  let validationService: {
    ensureResourceExists: jest.Mock;
    validateResolvedAvailabilityOverride: jest.Mock;
  };

  const existingOverride = Object.assign(new ResourceAvailabilityOverride(), {
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
    availabilityOverridesRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      manager: {
        create: jest.fn((_entity, input) => input),
        findOne: jest.fn(),
        merge: jest.fn((_entity, target, source) => ({ ...target, ...source })),
        save: jest.fn(async (_entity, input) => input),
        softRemove: jest.fn(async (_entity, input) => input),
        transaction: jest.fn(async (callback) =>
          callback(availabilityOverridesRepository.manager),
        ),
      },
    };

    validationService = {
      ensureResourceExists: jest.fn(),
      validateResolvedAvailabilityOverride: jest.fn(),
    };

    service = new ResourceAvailabilityOverrideService(
      availabilityOverridesRepository as Repository<ResourceAvailabilityOverride>,
      validationService as never,
    );
  });

  it('creates an availability override in a transaction with audit metadata', async () => {
    const input: CreateResourceAvailabilityOverrideCommand = {
      availableMinutesPerWorkingDay: 240,
      endDate: '2026-08-03',
      overrideType: ResourceAvailabilityOverrideType.ReducedCapacity,
      reason: 'Training block',
      resourceId: 'resource-id',
      startDate: '2026-08-01',
    };

    const created = await service.createAvailabilityOverride(input, actor);

    expect(
      availabilityOverridesRepository.manager.transaction,
    ).toHaveBeenCalled();
    expect(
      validationService.validateResolvedAvailabilityOverride,
    ).toHaveBeenCalledWith(input, availabilityOverridesRepository.manager);
    expect(created).toEqual(
      expect.objectContaining({
        createdById: actor.userId,
        overrideType: ResourceAvailabilityOverrideType.ReducedCapacity,
        resourceId: 'resource-id',
        updatedById: actor.userId,
      }),
    );
  });

  it('updates an availability override using merged state validation', async () => {
    availabilityOverridesRepository.manager.findOne.mockResolvedValue(
      existingOverride,
    );
    const input: UpdateResourceAvailabilityOverrideCommand = {
      availableMinutesPerWorkingDay: 180,
      reason: null,
    };

    const updated = await service.updateAvailabilityOverride(
      existingOverride.id,
      input,
      actor,
    );

    expect(
      validationService.validateResolvedAvailabilityOverride,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        availableMinutesPerWorkingDay: 180,
        reason: null,
        startDate: existingOverride.startDate,
      }),
      availabilityOverridesRepository.manager,
    );
    expect(updated).toEqual(
      expect.objectContaining({
        availableMinutesPerWorkingDay: 180,
        reason: null,
        updatedById: actor.userId,
      }),
    );
  });

  it('soft deletes an availability override in a transaction', async () => {
    availabilityOverridesRepository.manager.findOne.mockResolvedValue(
      existingOverride,
    );

    await service.archiveAvailabilityOverride(
      { id: existingOverride.id },
      actor,
    );

    expect(
      availabilityOverridesRepository.manager.transaction,
    ).toHaveBeenCalled();
    expect(availabilityOverridesRepository.manager.save).toHaveBeenCalledWith(
      ResourceAvailabilityOverride,
      expect.objectContaining({
        deletedById: actor.userId,
        updatedById: actor.userId,
      }),
    );
    expect(
      availabilityOverridesRepository.manager.softRemove,
    ).toHaveBeenCalledWith(
      ResourceAvailabilityOverride,
      expect.objectContaining({ id: existingOverride.id }),
    );
  });

  it('lists overrides by resource after validating resource existence', async () => {
    availabilityOverridesRepository.find?.mockResolvedValue([existingOverride]);

    await expect(
      service.getAvailabilityOverridesByResource(existingOverride.resourceId),
    ).resolves.toEqual([existingOverride]);

    expect(validationService.ensureResourceExists).toHaveBeenCalledWith(
      existingOverride.resourceId,
    );
    expect(availabilityOverridesRepository.find).toHaveBeenCalledWith({
      order: { createdAt: 'ASC', startDate: 'ASC' },
      where: { resourceId: existingOverride.resourceId },
    });
  });

  it('throws when updating a missing availability override', async () => {
    availabilityOverridesRepository.manager.findOne.mockResolvedValue(null);

    await expect(
      service.updateAvailabilityOverride('missing-override-id', {}),
    ).rejects.toThrow(NotFoundException);
  });
});
