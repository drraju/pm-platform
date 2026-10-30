import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '../../../common/enums/user-role.enum';
import { countWork } from '../../tasks/work-count';
import { programOverdueCount, ProgramsService } from '../programs.service';

describe('ProgramsService', () => {
  const actor = { roleId: 'role-1', userId: 'user-1' };

  function build(roleNames: string[]) {
    const requestsRepository = {
      create: jest.fn((value) => value),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(async (value) => ({ id: 'request-1', ...value })),
    };
    const programsRepository = {
      findOne: jest.fn(),
      save: jest.fn(async (value) => value),
    };
    const projectsRepository = {
      findOne: jest.fn(),
      save: jest.fn(async (value) => value),
      update: jest.fn(),
    };
    const projectsService = { create: jest.fn() };
    const customersService = { get: jest.fn(async () => ({ id: 'customer-1' })) };
    const authorizationPolicyService = {
      getActorRoleNames: jest.fn(async () => roleNames),
      hasAnyPermission: jest.fn(async () => roleNames.includes(UserRole.ProgramManager)),
      hasPermission: jest.fn(async () => false),
    };
    const service = new ProgramsService(
      programsRepository as never,
      projectsRepository as never,
      {} as never,
      requestsRepository as never,
      { findOne: jest.fn() } as never,
      authorizationPolicyService as never,
      projectsService as never,
      customersService as never,
    );
    return { customersService, programsRepository, projectsRepository, projectsService, requestsRepository, service };
  }

  it('keeps a requested project off the plan until a lead is assigned', async () => {
    const { projectsService, requestsRepository, service } = build([UserRole.Sales]);

    const created = await service.createRequest(actor, 'customer-1', {
      name: 'Northwind rollout',
      note: 'They asked for May',
      targetFinish: '2026-05-01',
    });

    expect(projectsService.create).not.toHaveBeenCalled();
    expect(created).toMatchObject({
      customerId: 'customer-1',
      name: 'Northwind rollout',
      status: 'open',
    });
    expect(requestsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 'customer-1', status: 'open' }),
    );
  });

  it('creates the project on the same customer when a lead is assigned', async () => {
    const { projectsService, requestsRepository, service } = build([UserRole.ProgramManager]);
    requestsRepository.findOne.mockResolvedValue({
      customerId: 'customer-1',
      id: 'request-1',
      name: 'Northwind rollout',
      status: 'open',
      targetFinish: '2026-05-01',
    });
    projectsService.create.mockResolvedValue({ id: 'project-1' });

    const accepted = await service.acceptRequest(actor, 'request-1', { leadUserId: 'lead-1' });

    expect(projectsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'customer-1',
        leadUserId: 'lead-1',
        name: 'Northwind rollout',
        targetEndDate: '2026-05-01',
      }),
      actor,
    );
    expect(accepted).toEqual({
      customerId: 'customer-1',
      projectId: 'project-1',
      requestId: 'request-1',
    });
    expect(requestsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'project-1', status: 'closed' }),
    );
  });

  it('hides the request note from customer success', async () => {
    const { requestsRepository, service } = build([UserRole.CustomerSuccessManager]);
    requestsRepository.find.mockResolvedValue([
      {
        customerId: 'customer-1',
        id: 'request-1',
        name: 'Northwind rollout',
        note: 'Commercial timing',
        status: 'open',
      },
    ]);

    const rows = await service.listCustomerRequests(actor, 'customer-1');

    expect(rows[0]).not.toHaveProperty('note');
    expect(rows[0]).toMatchObject({ name: 'Northwind rollout' });
  });

  it('refuses an executive edit and a project that already has a program', async () => {
    const executive = build([UserRole.Executive]);
    await expect(
      executive.service.create(actor, { name: 'Delivery' }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const manager = build([UserRole.ProgramManager]);
    manager.programsRepository.findOne.mockResolvedValue({
      id: 'program-1',
      ownerId: actor.userId,
    });
    manager.projectsRepository.findOne.mockResolvedValue({
      id: 'project-1',
      programId: 'program-2',
    });

    await expect(
      manager.service.attachProject(actor, 'program-1', { projectId: 'project-1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(manager.projectsService.create).not.toHaveBeenCalled();
  });

  it('counts overdue the same way Today does', () => {
    const work = [
      { dueDate: '2026-10-01', id: 'leaf', parentTaskId: null, status: 'todo', taskKind: 'task' },
      { dueDate: '2026-10-01', id: 'done', parentTaskId: null, status: 'done', taskKind: 'task' },
      { dueDate: '2026-10-01', id: 'box', parentTaskId: null, status: 'todo', taskKind: 'summary' },
    ];
    const today = '2026-10-29';

    expect(programOverdueCount([{ work }], today)).toBe(countWork(work, today).overdue);
    expect(countWork(work, today).line).toBe('1 of 2 overdue');
  });
});
