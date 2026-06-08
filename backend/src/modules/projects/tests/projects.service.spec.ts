import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectRole } from '../../../common/enums/project-role.enum';
import { ProjectVisibilityLevel } from '../../../common/enums/project-visibility-level.enum';
import { TaskStatus } from '../../../common/enums/task-status.enum';
import { AuthorizationService } from '../../authorization/authorization.service';
import { ProjectHealthStatus } from '../../health/dto/project-health.dto';
import { ProjectHealthService } from '../../health/project-health.service';
import { Task } from '../../tasks/entities/task.entity';
import { User } from '../../users/entities/user.entity';
import { ProjectMember } from '../entities/project-member.entity';
import { Project } from '../entities/project.entity';
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
  let authorizationService: {
    getEffectiveUser: jest.Mock;
    isExternalUser: jest.Mock;
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
          provide: AuthorizationService,
          useValue: (authorizationService = {
            getEffectiveUser: jest.fn(),
            isExternalUser: jest.fn().mockReturnValue(false),
          }),
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
    projectsRepository.find?.mockResolvedValue([{ id: projectId }]);

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
    expect(projectsRepository.find).toHaveBeenCalledWith({
      order: { createdAt: 'DESC' },
      relations: { issues: true, owner: true, risks: true, tasks: true },
    });
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
        dependencies: { owner: true },
        issues: { owner: true },
        members: { user: true },
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

  it('filters project details for external users', async () => {
    const externalUserId = 'external-user';
    authorizationService.getEffectiveUser.mockResolvedValue({
      roleName: 'Customer',
      userId: externalUserId,
    });
    authorizationService.isExternalUser.mockReturnValue(true);
    projectsRepository.findOne?.mockResolvedValue({
      id: projectId,
      assumptions: [{ id: 'assumption-1' }],
      dependencies: [{ id: 'dependency-1' }],
      issues: [{ id: 'issue-1' }],
      members: [
        {
          userId: externalUserId,
          visibilityLevel: ProjectVisibilityLevel.Customer,
        },
      ],
      owner: { id: 'owner-1' },
      risks: [{ id: 'risk-1' }],
      tasks: [
        { id: 'assigned-task', assigneeId: externalUserId, type: 'task' },
        { id: 'milestone-task', assigneeId: null, type: 'milestone' },
        { id: 'internal-task', assigneeId: 'internal-user', type: 'task' },
      ],
    });
    projectMembersRepository.findOne?.mockResolvedValue({
      visibilityLevel: ProjectVisibilityLevel.Customer,
    });

    const result = await service.findOneForUser(
      {
        email: 'customer@example.com',
        roleId: 'role-1',
        userId: externalUserId,
      },
      projectId,
    );

    expect(result.assumptions).toEqual([]);
    expect(result.dependencies).toEqual([]);
    expect(result.issues).toEqual([]);
    expect(result.members).toEqual([]);
    expect(result.owner).toBeNull();
    expect(result.risks).toEqual([]);
    expect(result.tasks).toEqual([
      expect.objectContaining({ id: 'assigned-task' }),
      expect.objectContaining({ id: 'milestone-task' }),
    ]);
  });

  it('filters project tasks for external users', async () => {
    const externalUserId = 'external-user';
    authorizationService.getEffectiveUser.mockResolvedValue({
      roleName: 'Partner',
      userId: externalUserId,
    });
    authorizationService.isExternalUser.mockReturnValue(true);
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    tasksRepository.find?.mockResolvedValue([
      { id: 'assigned-task', assigneeId: externalUserId, type: 'task' },
      { id: 'milestone-task', assigneeId: null, type: 'milestone' },
      { id: 'internal-task', assigneeId: 'internal-user', type: 'task' },
    ]);

    await expect(
      service.findProjectTasksForUser(
        {
          email: 'partner@example.com',
          roleId: 'role-1',
          userId: externalUserId,
        },
        projectId,
      ),
    ).resolves.toEqual([
      expect.objectContaining({ id: 'assigned-task' }),
      expect.objectContaining({ id: 'milestone-task' }),
    ]);
  });

  it('returns timeline foundation data for tasks, milestones, and dependencies', async () => {
    const sourceTaskId = 'a6cfbdff-31ef-4b58-830a-5c7562b432a6';
    const targetTaskId = 'fef07ef2-93df-4b57-9845-92034b8f8c11';
    projectsRepository.findOne?.mockResolvedValue({
      id: projectId,
      name: 'Customer Experience Platform Upgrade',
      tasks: [
        {
          id: sourceTaskId,
          title: 'Complete design',
          status: TaskStatus.InProgress,
          startDate: '2026-06-10',
          dueDate: '2026-06-20',
          type: 'task',
          assignee: {
            firstName: 'Marcus',
            lastName: 'Shah',
          },
        },
        {
          id: targetTaskId,
          title: 'Readiness checkpoint',
          status: TaskStatus.Todo,
          startDate: null,
          dueDate: '2026-06-30',
          type: 'milestone',
          assignee: null,
        },
      ],
      dependencies: [
        {
          sourceTaskId,
          targetTaskId,
          dependencyType: 'finish_to_start',
        },
        {
          sourceTaskId,
          targetTaskId: null,
          dependencyType: 'finish_to_start',
        },
      ],
    });

    await expect(service.findTimeline(projectId)).resolves.toEqual({
      projectId,
      projectName: 'Customer Experience Platform Upgrade',
      tasks: [
        {
          id: sourceTaskId,
          title: 'Complete design',
          status: TaskStatus.InProgress,
          startDate: '2026-06-10',
          dueDate: '2026-06-20',
          assignee: 'Marcus Shah',
        },
      ],
      milestones: [
        {
          id: targetTaskId,
          title: 'Readiness checkpoint',
          targetDate: '2026-06-30',
        },
      ],
      dependencies: [
        {
          sourceTaskId,
          targetTaskId,
          type: 'finish_to_start',
        },
      ],
    });
    expect(projectsRepository.findOne).toHaveBeenCalledWith({
      where: { id: projectId },
      relations: {
        dependencies: { sourceTask: true, targetTask: true },
        tasks: { assignee: true },
      },
    });
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
        dependencies: { owner: true },
        issues: { owner: true },
        members: { user: true },
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
    projectMembersRepository.findOne?.mockResolvedValue(null);

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
      visibilityLevel: ProjectVisibilityLevel.Internal,
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: 'member-id',
        projectId,
        userId,
        role: ProjectRole.Manager,
        visibilityLevel: ProjectVisibilityLevel.Internal,
      }),
    );
  });

  it('defaults new project members to contributor', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    usersRepository.findOne?.mockResolvedValue({ id: userId });
    projectMembersRepository.findOne?.mockResolvedValue(null);

    await service.addMember(projectId, { userId });

    expect(projectMembersRepository.create).toHaveBeenCalledWith({
      projectId,
      userId,
      role: ProjectRole.Contributor,
      visibilityLevel: ProjectVisibilityLevel.Internal,
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
        visibilityLevel: ProjectVisibilityLevel.Internal,
        user: {
          id: userId,
          email: 'jane.doe@example.com',
          firstName: 'Jane',
          lastName: 'Doe',
          passwordHash: 'hashed-password',
        },
      },
    ]);

    await expect(service.findMembers(projectId)).resolves.toEqual([
      {
        id: 'member-id',
        projectId,
        userId,
        role: ProjectRole.Manager,
        visibilityLevel: ProjectVisibilityLevel.Internal,
        user: {
          id: userId,
          email: 'jane.doe@example.com',
          firstName: 'Jane',
          lastName: 'Doe',
        },
      },
    ]);
    expect(projectMembersRepository.find).toHaveBeenCalledWith({
      order: { createdAt: 'ASC' },
      relations: { user: true },
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
    projectMembersRepository.findOne?.mockResolvedValue(member);

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
