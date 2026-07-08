import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Resource } from '../entities/resource.entity';
import { ResourceStatus } from '../enums/resource-status.enum';
import { ResourceType } from '../enums/resource-type.enum';
import { ResourceValidationService } from '../resource-validation.service';
import { ResourceService } from '../resource.service';

type MockRepository<T extends object = object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

const actor = {
  email: 'admin@example.com',
  roleId: 'admin-role-id',
  userId: '4d136f2c-f4b2-4d33-b351-397de2a93dc3',
};

describe('ResourceService', () => {
  let service: ResourceService;
  let resourcesRepository: MockRepository<Resource>;

  beforeEach(() => {
    resourcesRepository = {
      create: jest.fn((input) => input),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((input) =>
        Promise.resolve({ id: 'resource-id', ...input }),
      ),
    };

    service = new ResourceService(
      resourcesRepository as Repository<Resource>,
      new ResourceValidationService(),
    );
  });

  it('creates a resource with default lifecycle state and audit metadata', async () => {
    resourcesRepository.findOne?.mockResolvedValue(null);

    await expect(
      service.createResource(
        {
          name: ' Senior Engineer ',
          resourceType: ResourceType.Human,
          roleName: ' Engineering ',
        },
        actor,
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        createdById: actor.userId,
        name: 'Senior Engineer',
        resourceType: ResourceType.Human,
        roleName: 'Engineering',
        status: ResourceStatus.Draft,
        updatedById: actor.userId,
      }),
    );
  });

  it('archives a resource without deleting it', async () => {
    resourcesRepository.findOne?.mockResolvedValue({
      id: 'resource-id',
      status: ResourceStatus.Active,
    });

    await expect(
      service.archiveResource('resource-id', actor),
    ).resolves.toEqual(
      expect.objectContaining({
        status: ResourceStatus.Archived,
        updatedById: actor.userId,
      }),
    );
  });

  it('lists non-archived resources by default', async () => {
    resourcesRepository.find?.mockResolvedValue([]);

    await service.listResources();

    expect(resourcesRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        order: { createdAt: 'ASC', name: 'ASC' },
        where: expect.objectContaining({ status: expect.any(Object) }),
      }),
    );
  });

  it('throws when creating a duplicate active resource name', async () => {
    resourcesRepository.findOne?.mockResolvedValue({ id: 'existing-id' });

    await expect(
      service.createResource({
        name: 'Senior Engineer',
        resourceType: ResourceType.Human,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('throws when the resource is missing', async () => {
    resourcesRepository.findOne?.mockResolvedValue(null);

    await expect(service.findResource('missing-id')).rejects.toThrow(
      NotFoundException,
    );
  });
});
