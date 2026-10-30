import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../../../common/enums/user-role.enum';
import { TaskStatus } from '../../../common/enums/task-status.enum';
import { CommitmentsService } from '../commitments.service';
import { CustomerCommitment } from '../entities/customer-commitment.entity';

describe('CommitmentsService', () => {
  function harness(roleNames: string[]) {
    const rows: CustomerCommitment[] = [];
    const deletedTaskIds: string[] = [];
    const commitmentsRepository = {
      create: (input: Partial<CustomerCommitment>) => input,
      find: async ({ where }: { where: { projectId?: string; status?: { _value?: string[] } } }) =>
        rows.filter((row) => {
          if (where.projectId && row.projectId !== where.projectId) return false;
          return row.status === 'open' || row.status === 'accepted';
        }),
      findOne: async ({ where }: { where: { id: string; projectId?: string; customerId?: string } }) =>
        rows.find((row) => row.id === where.id && (!where.projectId || row.projectId === where.projectId)) ?? null,
      save: async (input: CustomerCommitment) => {
        const existing = rows.find((row) => row.id === input.id);
        const saved = {
          ...input,
          id: input.id ?? 'commitment-1',
          project: input.project ?? { name: 'CapGemini' },
        } as CustomerCommitment;
        if (existing) {
          Object.assign(existing, saved);
          return existing;
        }
        rows.push(saved);
        return saved;
      },
    };
    const projectsRepository = {
      findOne: async () => ({ customerId: 'customer-1', id: 'project-1', name: 'CapGemini' }),
    };
    const tasksService = {
      create: jest.fn(async () => ({ id: 'task-1' })),
      delete: jest.fn(async (id: string) => {
        deletedTaskIds.push(id);
      }),
    };

    const service = new CommitmentsService(
      commitmentsRepository as never,
      projectsRepository as never,
      { get: async () => ({ id: 'customer-1' }) } as never,
      {
        getActorRoleNames: async () => roleNames,
        isExternalActor: async () => roleNames.includes(UserRole.Customer),
      } as never,
      { canViewProject: async () => true } as never,
      tasksService as never,
    );

    return { deletedTaskIds, rows, service, tasksService };
  }

  it('lets a lead accept a commitment once, and dismissing it leaves the work item', async () => {
    const { deletedTaskIds, rows, service, tasksService } = harness([UserRole.PlatformAdmin]);
    rows.push({
      customerId: 'customer-1',
      dueDate: '2026-11-02',
      id: 'commitment-1',
      project: { name: 'CapGemini' },
      projectId: 'project-1',
      status: 'open',
      taskId: null,
      title: 'Renew the workspace',
    } as CustomerCommitment);

    const accepted = await service.accept(
      { roleId: 'role', userId: 'lead-1' },
      'project-1',
      'commitment-1',
    );
    const again = await service.accept(
      { roleId: 'role', userId: 'lead-1' },
      'project-1',
      'commitment-1',
    );

    expect(tasksService.create).toHaveBeenCalledTimes(1);
    expect(tasksService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-1',
        status: TaskStatus.Todo,
        title: 'Renew the workspace',
      }),
      expect.objectContaining({ userId: 'lead-1' }),
    );
    expect(again).toMatchObject({ status: 'accepted', taskId: 'task-1' });
    expect(accepted.taskId).toBe(again.taskId);

    const dismissed = await service.update(
      { roleId: 'role', userId: 'cs-1' },
      'customer-1',
      'commitment-1',
      { status: 'dismissed' },
    );

    expect(dismissed).toMatchObject({ status: 'dismissed', taskId: 'task-1' });
    expect(tasksService.delete).not.toHaveBeenCalled();
    expect(deletedTaskIds).toEqual([]);
    expect(rows[0].taskId).toBe('task-1');
  });

  it('leaves open commitments out of a contact project', async () => {
    const { rows, service } = harness([UserRole.Customer]);
    rows.push({
      customerId: 'customer-1',
      dueDate: '2026-11-02',
      id: 'open-1',
      project: { name: 'CapGemini' },
      projectId: 'project-1',
      status: 'open',
      taskId: null,
      title: 'Still private',
    } as CustomerCommitment);
    rows.push({
      customerId: 'customer-1',
      dueDate: null,
      id: 'accepted-1',
      project: { name: 'CapGemini' },
      projectId: 'project-1',
      status: 'accepted',
      taskId: 'task-9',
      title: 'Already on the plan',
    } as CustomerCommitment);

    const visible = await service.listForProject(
      { roleId: 'role', userId: 'contact-1' },
      'project-1',
    );

    expect(visible.map((row) => row.title)).toEqual(['Already on the plan']);
  });

  it('refuses a sales owner the success book', async () => {
    const { service } = harness([UserRole.Sales]);

    await expect(
      service.listForCustomer({ roleId: 'role', userId: 'sales-1' }, 'customer-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
