import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthorizationPolicyService } from '../../../common/authz/authorization-policy.service';
import { UserIdentityType } from '../../../common/enums/user-identity-type.enum';
import { Repository } from 'typeorm';
import {
  CreateResourceAssignmentCommand,
  UpdateResourceAssignmentCommand,
} from '../resource-assignment.commands';
import { ResourceAssignment } from '../entities/resource-assignment.entity';
import { ResourceAssignmentStatus } from '../enums/resource-assignment-status.enum';
import { ResourceAssignmentService } from '../resource-assignment.service';

type MockRepository<T extends object = object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
> & {
  manager: {
    findOne: jest.Mock;
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

describe('ResourceAssignmentService', () => {
  let service: ResourceAssignmentService;
  let assignmentsRepository: MockRepository<ResourceAssignment>;
  let validationService: {
    ensureAssignmentNotDuplicated: jest.Mock;
    ensureProjectExists: jest.Mock;
    ensureResourceExists: jest.Mock;
    validateResolvedAssignment: jest.Mock;
  };
  let authorizationPolicyService: {
    canMutateProjectDomain: jest.Mock;
  };

  const existingAssignment = Object.assign(new ResourceAssignment(), {
    allocationPercent: 50,
    createdAt: new Date('2026-07-10T00:00:00.000Z'),
    endDate: '2026-07-18',
    id: 'assignment-id',
    plannedMinutesPerDay: null,
    projectId: 'project-id',
    resourceId: 'resource-id',
    startDate: '2026-07-11',
    status: ResourceAssignmentStatus.Active,
    taskId: 'task-id',
    updatedAt: new Date('2026-07-10T00:00:00.000Z'),
  });

  beforeEach(() => {
    assignmentsRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      manager: {
        findOne: jest.fn(),
        save: jest.fn(async (_entity, input) => input),
        softRemove: jest.fn(async (_entity, input) => input),
        transaction: jest.fn(async (callback) =>
          callback(assignmentsRepository.manager),
        ),
      },
    };

    validationService = {
      ensureAssignmentNotDuplicated: jest.fn(),
      ensureProjectExists: jest.fn(),
      ensureResourceExists: jest.fn(),
      validateResolvedAssignment: jest.fn(),
    };
    authorizationPolicyService = {
      canMutateProjectDomain: jest.fn().mockResolvedValue(true),
    };

    service = new ResourceAssignmentService(
      assignmentsRepository as Repository<ResourceAssignment>,
      validationService as never,
      authorizationPolicyService as unknown as AuthorizationPolicyService,
    );
  });

  it.each(['create', 'update', 'remove'] as const)(
    'denies Executive %s even when the route permission was deliberately granted',
    async (operation) => {
      const executiveActor = {
        email: 'executive@example.com',
        roleId: 'role-EXECUTIVE',
        userId: 'executive-id',
      };
      authorizationPolicyService.canMutateProjectDomain.mockResolvedValue(
        false,
      );
      const createInput: CreateResourceAssignmentCommand = {
        allocationPercent: 50,
        endDate: '2026-07-18',
        projectId: 'project-id',
        resourceId: 'resource-id',
        startDate: '2026-07-11',
        status: ResourceAssignmentStatus.Active,
        taskId: 'task-id',
      };

      const mutation =
        operation === 'create'
          ? service.createAssignment(createInput, executiveActor)
          : operation === 'update'
            ? service.updateAssignment(
                existingAssignment.id,
                { plannedMinutesPerDay: 240 },
                executiveActor,
              )
            : service.removeAssignment(existingAssignment.id, executiveActor);

      await expect(mutation).rejects.toMatchObject({
        response: expect.objectContaining({
          reasonCode: 'MISSING_PERMISSION',
        }),
      });
      await expect(mutation).rejects.toBeInstanceOf(ForbiddenException);
      expect(assignmentsRepository.manager.transaction).not.toHaveBeenCalled();
    },
  );

  it('denies a SERVICE assignment mutation at the explicit project-domain ceiling', async () => {
    const serviceActor = {
      email: 'service@example.com',
      identityType: UserIdentityType.Service,
      roleId: 'role-PLATFORM_ADMIN',
      userId: 'service-id',
    };
    authorizationPolicyService.canMutateProjectDomain.mockResolvedValue(false);

    await expect(
      service.createAssignment(
        {
          allocationPercent: 50,
          endDate: '2026-07-18',
          projectId: 'project-id',
          resourceId: 'resource-id',
          startDate: '2026-07-11',
          status: ResourceAssignmentStatus.Active,
          taskId: 'task-id',
        },
        serviceActor,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(
      authorizationPolicyService.canMutateProjectDomain,
    ).toHaveBeenCalledWith(serviceActor);
    expect(assignmentsRepository.manager.transaction).not.toHaveBeenCalled();
  });

  it('creates an assignment in a transaction with audit metadata', async () => {
    const input: CreateResourceAssignmentCommand = {
      allocationPercent: 50,
      endDate: '2026-07-18',
      projectId: 'project-id',
      resourceId: 'resource-id',
      startDate: '2026-07-11',
      status: ResourceAssignmentStatus.Active,
      taskId: 'task-id',
    };

    const created = await service.createAssignment(input, actor);

    expect(assignmentsRepository.manager.transaction).toHaveBeenCalled();
    expect(validationService.validateResolvedAssignment).toHaveBeenCalledWith(
      input,
      assignmentsRepository.manager,
    );
    expect(
      validationService.ensureAssignmentNotDuplicated,
    ).toHaveBeenCalledWith(input, undefined, assignmentsRepository.manager);
    expect(created).toEqual(
      expect.objectContaining({
        allocationPercent: 50,
        createdById: actor.userId,
        projectId: 'project-id',
        resourceId: 'resource-id',
        updatedById: actor.userId,
      }),
    );
  });

  it('updates an assignment using merged state validation', async () => {
    assignmentsRepository.manager.findOne.mockResolvedValue(existingAssignment);
    const input: UpdateResourceAssignmentCommand = {
      plannedMinutesPerDay: 240,
      taskId: null,
    };

    const updated = await service.updateAssignment(
      existingAssignment.id,
      input,
      actor,
    );

    expect(validationService.validateResolvedAssignment).toHaveBeenCalledWith(
      expect.objectContaining({
        allocationPercent: 50,
        plannedMinutesPerDay: 240,
        taskId: null,
      }),
      assignmentsRepository.manager,
    );
    expect(
      validationService.ensureAssignmentNotDuplicated,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        id: existingAssignment.id,
        projectId: existingAssignment.projectId,
        resourceId: existingAssignment.resourceId,
      }),
      existingAssignment.id,
      assignmentsRepository.manager,
    );
    expect(updated).toEqual(
      expect.objectContaining({
        plannedMinutesPerDay: 240,
        taskId: null,
        updatedById: actor.userId,
      }),
    );
  });

  it('soft deletes an assignment in a transaction', async () => {
    assignmentsRepository.manager.findOne.mockResolvedValue(existingAssignment);

    await service.removeAssignment(existingAssignment.id, actor);

    expect(assignmentsRepository.manager.transaction).toHaveBeenCalled();
    expect(assignmentsRepository.manager.save).toHaveBeenCalledWith(
      ResourceAssignment,
      expect.objectContaining({
        deletedById: actor.userId,
        updatedById: actor.userId,
      }),
    );
    expect(assignmentsRepository.manager.softRemove).toHaveBeenCalledWith(
      ResourceAssignment,
      expect.objectContaining({ id: existingAssignment.id }),
    );
  });

  it('lists assignments by project after validating project existence', async () => {
    assignmentsRepository.find?.mockResolvedValue([existingAssignment]);

    await expect(
      service.getAssignmentsByProject(existingAssignment.projectId),
    ).resolves.toEqual([existingAssignment]);

    expect(validationService.ensureProjectExists).toHaveBeenCalledWith(
      existingAssignment.projectId,
    );
    expect(assignmentsRepository.find).toHaveBeenCalledWith({
      order: { createdAt: 'ASC', startDate: 'ASC' },
      where: { projectId: existingAssignment.projectId },
    });
  });

  it('lists assignments by resource after validating resource existence', async () => {
    assignmentsRepository.find?.mockResolvedValue([existingAssignment]);

    await expect(
      service.getAssignmentsByResource(existingAssignment.resourceId),
    ).resolves.toEqual([existingAssignment]);

    expect(validationService.ensureResourceExists).toHaveBeenCalledWith(
      existingAssignment.resourceId,
    );
    expect(assignmentsRepository.find).toHaveBeenCalledWith({
      order: { createdAt: 'ASC', startDate: 'ASC' },
      where: { resourceId: existingAssignment.resourceId },
    });
  });

  it('throws when updating a missing assignment', async () => {
    assignmentsRepository.manager.findOne.mockResolvedValue(null);

    await expect(
      service.updateAssignment('missing-assignment-id', {}),
    ).rejects.toThrow(NotFoundException);
  });
});
