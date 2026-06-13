import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationPolicyService } from '../../../common/authz/authorization-policy.service';
import { ProjectRole } from '../../../common/enums/project-role.enum';
import { TaskStatus } from '../../../common/enums/task-status.enum';
import { ProjectHealthStatus } from '../../health/dto/project-health.dto';
import { ProjectHealthService } from '../../health/project-health.service';
import { Task } from '../../tasks/entities/task.entity';
import { User } from '../../users/entities/user.entity';
import { ProjectMember } from '../entities/project-member.entity';
import { Project } from '../entities/project.entity';
import { ProjectVisibilityService } from '../project-visibility.service';
import { ProjectsService } from '../projects.service';

type MockRepository<T extends object = object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

const projectId = '2bbca1cb-1be2-4a04-b857-f1f8c7a26800';
const userId = 'f308d314-4cf3-4bc0-9607-e7ad88f264b8';
const taskId = '32b10c65-8a4b-4e03-a58c-ffea2ec860e6';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let projectsRepository: MockRepository<Project>;
  let projectMembersRepository: MockRepository<ProjectMember>;
  let tasksRepository: MockRepository<Task>;
  let usersRepository: MockRepository<User>;
  let authorizationPolicyService: {
    canDeleteProject: jest.Mock;
    canManageProject: jest.Mock;
    canManageTask: jest.Mock;
    hasPermission: jest.Mock;
  };
  let projectVisibilityService: {
    canViewProject: jest.Mock;
    getVisibleProjects: jest.Mock;
  };

  beforeEach(async () => {
    projectsRepository = {
      create: jest.fn((input) => input),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((input) => Promise.resolve({ id: projectId, ...input })),
      softRemove: jest.fn(() => Promise.resolve()),
    };
    projectMembersRepository = {
      create: jest.fn((input) => input),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((input) => Promise.resolve({ id: 'member-id', ...input })),
      softRemove: jest.fn(() => Promise.resolve()),
    };
    tasksRepository = {
      create: jest.fn((input) => input),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((input) => Promise.resolve({ id: taskId, ...input })),
      softRemove: jest.fn(() => Promise.resolve()),
    };
    usersRepository = {
      findOne: jest.fn(),
    };
    authorizationPolicyService = {
      canDeleteProject: jest.fn().mockResolvedValue(true),
      canManageProject: jest.fn().mockResolvedValue(true),
      canManageTask: jest.fn().mockResolvedValue(true),
      hasPermission: jest.fn().mockResolvedValue(true),
    };
    projectVisibilityService = {
      canViewProject: jest.fn().mockResolvedValue(true),
      getVisibleProjects: jest.fn().mockResolvedValue([{ id: projectId }]),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getRepositoryToken(Project),
          useValue: projectsRepository,
        },
        {
          provide: getRepositoryToken(ProjectMember),
          useValue: projectMembersRepository,
        },
        {
          provide: getRepositoryToken(Task),
          useValue: tasksRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: usersRepository,
        },
        ProjectHealthService,
        {
          provide: AuthorizationPolicyService,
          useValue: authorizationPolicyService,
        },
        {
          provide: ProjectVisibilityService,
          useValue: projectVisibilityService,
        },
      ],
    }).compile();

    service = moduleRef.get(ProjectsService);
  });

  it('creates a project from the existing DTO shape', async () => {
    const result = await service.create({
      name: 'ERP Modernization',
      description: 'Finance platform delivery',
      status: 'active',
      targetEndDate: '2026-09-30',
    });

    expect(projectsRepository.create).toHaveBeenCalledWith({
      name: 'ERP Modernization',
      description: 'Finance platform delivery',
      status: 'active',
      targetEndDate: '2026-09-30',
    });
    expect(projectsRepository.save).toHaveBeenCalledWith({
      name: 'ERP Modernization',
      description: 'Finance platform delivery',
      status: 'active',
      targetEndDate: '2026-09-30',
    });
    expect(result).toEqual(
      expect.objectContaining({ id: projectId, name: 'ERP Modernization' }),
    );
  });

  it('lists projects with owner details newest first', async () => {
    projectVisibilityService.getVisibleProjects.mockResolvedValue([
      { id: projectId },
    ]);

    await expect(service.findAll()).resolves.toEqual([
      {
        health: {
          reasons: [
            'No critical issues, high risks, or overdue task threshold breaches',
          ],
          status: ProjectHealthStatus.Green,
        },
        id: projectId,
      },
    ]);
    expect(projectVisibilityService.getVisibleProjects).toHaveBeenCalledWith(
      undefined,
    );
  });

  it('loads project details with members, tasks, and RAID context', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });

    await expect(service.findOne(projectId)).resolves.toEqual({
      health: {
        reasons: [
          'No critical issues, high risks, or overdue task threshold breaches',
        ],
        status: ProjectHealthStatus.Green,
      },
      id: projectId,
    });
    expect(projectsRepository.findOne).toHaveBeenCalledWith({
      where: { id: projectId },
      relations: {
        assumptions: { owner: true },
        businessOwner: true,
        dependencies: { owner: true },
        deliveryLead: true,
        executiveSponsor: true,
        issues: { owner: true },
        members: { user: { role: true } },
        owner: true,
        risks: { owner: true },
        tasks: { assignee: true },
      },
    });
  });

  it('throws when project details are missing', async () => {
    projectsRepository.findOne?.mockResolvedValue(null);

    await expect(service.findOne(projectId)).rejects.toThrow(NotFoundException);
  });

  it('lists project RAID collections from project details', async () => {
    const project = {
      id: projectId,
      assumptions: [{ id: 'assumption-id', projectId }],
      dependencies: [{ id: 'dependency-id', projectId }],
      issues: [{ id: 'issue-id', projectId }],
      risks: [{ id: 'risk-id', projectId }],
    };
    projectsRepository.findOne?.mockResolvedValue(project);

    await expect(service.findProjectRisks(projectId)).resolves.toEqual(
      project.risks,
    );
    await expect(service.findProjectIssues(projectId)).resolves.toEqual(
      project.issues,
    );
    await expect(service.findProjectAssumptions(projectId)).resolves.toEqual(
      project.assumptions,
    );
    await expect(service.findProjectDependencies(projectId)).resolves.toEqual(
      project.dependencies,
    );
    expect(projectsRepository.findOne).toHaveBeenCalledWith({
      where: { id: projectId },
      relations: {
        assumptions: { owner: true },
        businessOwner: true,
        dependencies: { owner: true },
        deliveryLead: true,
        executiveSponsor: true,
        issues: { owner: true },
        members: { user: { role: true } },
        owner: true,
        risks: { owner: true },
        tasks: { assignee: true },
      },
    });
  });

  it('updates an existing project', async () => {
    const project = { id: projectId, name: 'Original', status: 'active' };
    projectsRepository.findOne?.mockResolvedValue(project);

    await service.update(projectId, { name: 'Updated', status: 'at_risk' });

    expect(projectsRepository.save).toHaveBeenCalledWith({
      id: projectId,
      name: 'Updated',
      status: 'at_risk',
    });
  });

  it('soft deletes an existing project', async () => {
    const project = { id: projectId, name: 'ERP Modernization' };
    projectsRepository.findOne?.mockResolvedValue(project);

    await service.remove(projectId);

    expect(projectsRepository.softRemove).toHaveBeenCalledWith(project);
  });

  it('adds a project member when the project and user exist', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    usersRepository.findOne?.mockResolvedValue({ id: userId });
    projectMembersRepository.findOne
      ?.mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'member-id',
        projectId,
        userId,
        role: ProjectRole.Manager,
      });

    const result = await service.addMember(projectId, {
      userId,
      role: ProjectRole.Manager,
    });

    expect(projectsRepository.findOne).toHaveBeenCalledWith({
      select: { id: true },
      where: { id: projectId },
    });
    expect(usersRepository.findOne).toHaveBeenCalledWith({
      select: { id: true },
      where: { id: userId },
    });
    expect(projectMembersRepository.create).toHaveBeenCalledWith({
      projectId,
      userId,
      role: ProjectRole.Manager,
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: 'member-id',
        projectId,
        userId,
        role: ProjectRole.Manager,
      }),
    );
  });

  it('defaults new project members to contributor', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    usersRepository.findOne?.mockResolvedValue({ id: userId });
    projectMembersRepository.findOne
      ?.mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'member-id',
        projectId,
        userId,
        role: ProjectRole.Contributor,
      });

    await service.addMember(projectId, { userId });

    expect(projectMembersRepository.create).toHaveBeenCalledWith({
      projectId,
      userId,
      role: ProjectRole.Contributor,
    });
  });

  it('rejects duplicate project membership', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    usersRepository.findOne?.mockResolvedValue({ id: userId });
    projectMembersRepository.findOne?.mockResolvedValue({
      id: 'existing-member-id',
      projectId,
      userId,
    });

    await expect(service.addMember(projectId, { userId })).rejects.toThrow(
      ConflictException,
    );
  });

  it('rejects membership creation when the project is missing', async () => {
    projectsRepository.findOne?.mockResolvedValue(null);

    await expect(service.addMember(projectId, { userId })).rejects.toThrow(
      NotFoundException,
    );
    expect(usersRepository.findOne).not.toHaveBeenCalled();
  });

  it('rejects membership creation when the user is missing', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    usersRepository.findOne?.mockResolvedValue(null);

    await expect(service.addMember(projectId, { userId })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('lists project members after validating the project exists', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    projectMembersRepository.find?.mockResolvedValue([
      {
        id: 'member-id',
        projectId,
        userId,
        role: ProjectRole.Manager,
        user: {
          id: userId,
          email: 'jane.doe@example.com',
          firstName: 'Jane',
          lastName: 'Doe',
          passwordHash: 'hashed-password',
          role: {
            name: 'Project Manager',
          },
        },
      },
    ]);

    await expect(service.findMembers(projectId)).resolves.toEqual([
      {
        id: 'member-id',
        projectId,
        userId,
        role: ProjectRole.Manager,
        user: {
          id: userId,
          email: 'jane.doe@example.com',
          firstName: 'Jane',
          lastName: 'Doe',
          displayName: 'Jane Doe',
          role: 'Project Manager',
        },
      },
    ]);
    expect(projectMembersRepository.find).toHaveBeenCalledWith({
      order: { createdAt: 'ASC' },
      relations: { user: { role: true } },
      where: { projectId },
    });
  });

  it('updates a project member role', async () => {
    const member = {
      id: 'member-id',
      projectId,
      userId,
      role: ProjectRole.Viewer,
    };
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    usersRepository.findOne?.mockResolvedValue({ id: userId });
    projectMembersRepository.findOne
      ?.mockResolvedValueOnce(member)
      .mockResolvedValueOnce({ ...member, role: ProjectRole.Owner });

    await service.updateMember(projectId, userId, {
      role: ProjectRole.Owner,
    });

    expect(projectMembersRepository.save).toHaveBeenCalledWith({
      id: 'member-id',
      projectId,
      userId,
      role: ProjectRole.Owner,
    });
  });

  it('throws when updating a missing project member', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    usersRepository.findOne?.mockResolvedValue({ id: userId });
    projectMembersRepository.findOne?.mockResolvedValue(null);

    await expect(
      service.updateMember(projectId, userId, { role: ProjectRole.Owner }),
    ).rejects.toThrow(NotFoundException);
  });

  it('removes a project member with soft delete', async () => {
    const member = {
      id: 'member-id',
      projectId,
      userId,
      role: ProjectRole.Viewer,
    };
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    usersRepository.findOne?.mockResolvedValue({ id: userId });
    projectMembersRepository.findOne?.mockResolvedValue(member);

    await service.removeMember(projectId, userId);

    expect(projectMembersRepository.softRemove).toHaveBeenCalledWith(member);
  });

  it('lists project tasks with optional filters', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    tasksRepository.find?.mockResolvedValue([{ id: taskId, projectId }]);

    await expect(
      service.findProjectTasks(projectId, {
        assigneeId: userId,
        priority: 'high',
        status: TaskStatus.InProgress,
      }),
    ).resolves.toEqual([{ id: taskId, projectId }]);

    expect(tasksRepository.find).toHaveBeenCalledWith({
      order: { createdAt: 'DESC' },
      relations: { assignee: true, project: true },
      where: {
        projectId,
        assigneeId: userId,
        priority: 'high',
        status: TaskStatus.InProgress,
      },
    });
  });

  it('creates a project task when the assignee is a project member', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    usersRepository.findOne?.mockResolvedValue({ id: userId });
    projectMembersRepository.findOne?.mockResolvedValue({ id: 'member-id' });

    const result = await service.createProjectTask(projectId, {
      assigneeId: userId,
      priority: 'high',
      status: TaskStatus.Todo,
      title: 'Complete steering committee readout',
    });

    expect(tasksRepository.create).toHaveBeenCalledWith({
      projectId,
      assigneeId: userId,
      priority: 'high',
      status: TaskStatus.Todo,
      title: 'Complete steering committee readout',
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: taskId,
        projectId,
        assigneeId: userId,
        title: 'Complete steering committee readout',
      }),
    );
  });

  it('creates an unassigned project task without assignee validation', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });

    await service.createProjectTask(projectId, {
      title: 'Prepare cutover checklist',
    });

    expect(usersRepository.findOne).not.toHaveBeenCalled();
    expect(projectMembersRepository.findOne).not.toHaveBeenCalled();
    expect(tasksRepository.create).toHaveBeenCalledWith({
      projectId,
      title: 'Prepare cutover checklist',
    });
  });

  it('rejects project task creation when the assignee does not exist', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    usersRepository.findOne?.mockResolvedValue(null);

    await expect(
      service.createProjectTask(projectId, {
        assigneeId: userId,
        title: 'Prepare test evidence',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects project task creation when the assignee is not a project member', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    usersRepository.findOne?.mockResolvedValue({ id: userId });
    projectMembersRepository.findOne?.mockResolvedValue(null);

    await expect(
      service.createProjectTask(projectId, {
        assigneeId: userId,
        title: 'Prepare test evidence',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('updates a project-scoped task and validates a changed assignee', async () => {
    const task = {
      id: taskId,
      projectId,
      title: 'Original task',
      status: TaskStatus.Backlog,
    };
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    usersRepository.findOne?.mockResolvedValue({ id: userId });
    projectMembersRepository.findOne?.mockResolvedValue({ id: 'member-id' });
    tasksRepository.findOne?.mockResolvedValue(task);

    await service.updateProjectTask(projectId, taskId, {
      assigneeId: userId,
      status: TaskStatus.Done,
      title: 'Updated task',
    });

    expect(tasksRepository.findOne).toHaveBeenCalledWith({
      relations: { assignee: true, project: true },
      where: { id: taskId, projectId },
    });
    expect(tasksRepository.save).toHaveBeenCalledWith({
      id: taskId,
      projectId,
      title: 'Updated task',
      status: TaskStatus.Done,
      assigneeId: userId,
    });
  });

  it('throws when updating a task outside the project scope', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    tasksRepository.findOne?.mockResolvedValue(null);

    await expect(
      service.updateProjectTask(projectId, taskId, {
        title: 'Updated task',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('soft deletes a project-scoped task', async () => {
    const task = { id: taskId, projectId, title: 'Task to delete' };
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    tasksRepository.findOne?.mockResolvedValue(task);

    await service.removeProjectTask(projectId, taskId);

    expect(tasksRepository.softRemove).toHaveBeenCalledWith(task);
  });
});
