import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationPolicyService } from '../../../common/authz/authorization-policy.service';
import { TaskDependencyType } from '../../../common/enums/task-dependency-type.enum';
import { TaskKind } from '../../../common/enums/task-kind.enum';
import { ProjectMember } from '../../projects/entities/project-member.entity';
import { Project } from '../../projects/entities/project.entity';
import { ProjectVisibilityService } from '../../projects/project-visibility.service';
import { TaskDependency } from '../../tasks/entities/task-dependency.entity';
import { Task } from '../../tasks/entities/task.entity';
import { User } from '../../users/entities/user.entity';
import { PlanningTaskSchedule } from '../entities/planning-task-schedule.entity';
import { PortfolioDependency } from '../entities/portfolio-dependency.entity';
import { ResourceAllocation } from '../entities/resource-allocation.entity';
import { ResourceCapacity } from '../entities/resource-capacity.entity';
import { ScheduleSnapshot } from '../entities/schedule-snapshot.entity';
import { PlanningService } from '../planning.service';

type MockRepository<T extends object = object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

const projectId = '5c17be9d-8207-4d40-a7a3-14f82c95de6c';
const predecessorTaskId = 'c5f08d23-6622-4e5b-aa0c-2e71ea470e84';
const successorTaskId = '880c310e-95dd-4c32-a749-8d367ee5af52';
const actor = {
  email: 'pm@example.com',
  roleId: 'role-id',
  userId: '7d63baaf-b979-4f21-bfa9-d5432b76329c',
};

describe('PlanningService', () => {
  let service: PlanningService;
  let snapshotsRepository: MockRepository<ScheduleSnapshot>;
  let schedulesRepository: MockRepository<PlanningTaskSchedule>;
  let allocationsRepository: MockRepository<ResourceAllocation>;
  let projectsRepository: MockRepository<Project>;
  let projectMembersRepository: MockRepository<ProjectMember>;
  let tasksRepository: MockRepository<Task>;
  let taskDependenciesRepository: MockRepository<TaskDependency>;
  let usersRepository: MockRepository<User>;

  beforeEach(async () => {
    snapshotsRepository = {
      create: jest.fn((input) => input),
      findOne: jest.fn(),
      save: jest.fn((input) =>
        Promise.resolve({ id: 'snapshot-id', ...input }),
      ),
    };
    schedulesRepository = {
      create: jest.fn((input) => input),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((input) =>
        Promise.resolve({ id: 'schedule-id', ...input }),
      ),
    };
    allocationsRepository = {
      create: jest.fn((input) => input),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn((input) =>
        Promise.resolve({ id: 'allocation-id', ...input }),
      ),
      softRemove: jest.fn(),
    };
    projectsRepository = {
      findOne: jest.fn().mockResolvedValue({ id: projectId, name: 'ERP' }),
    };
    projectMembersRepository = { findOne: jest.fn() };
    tasksRepository = { find: jest.fn(), findOne: jest.fn() };
    taskDependenciesRepository = {
      create: jest.fn((input) => input),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn((input) =>
        Promise.resolve({ id: 'dependency-id', ...input }),
      ),
      softRemove: jest.fn(),
    };
    usersRepository = { findOne: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PlanningService,
        {
          provide: getRepositoryToken(ScheduleSnapshot),
          useValue: snapshotsRepository,
        },
        {
          provide: getRepositoryToken(PlanningTaskSchedule),
          useValue: schedulesRepository,
        },
        {
          provide: getRepositoryToken(ResourceAllocation),
          useValue: allocationsRepository,
        },
        { provide: getRepositoryToken(ResourceCapacity), useValue: {} },
        { provide: getRepositoryToken(PortfolioDependency), useValue: {} },
        { provide: getRepositoryToken(Project), useValue: projectsRepository },
        {
          provide: getRepositoryToken(ProjectMember),
          useValue: projectMembersRepository,
        },
        { provide: getRepositoryToken(Task), useValue: tasksRepository },
        {
          provide: getRepositoryToken(TaskDependency),
          useValue: taskDependenciesRepository,
        },
        { provide: getRepositoryToken(User), useValue: usersRepository },
        {
          provide: AuthorizationPolicyService,
          useValue: { canManageProject: jest.fn().mockResolvedValue(true) },
        },
        {
          provide: ProjectVisibilityService,
          useValue: { canViewProject: jest.fn().mockResolvedValue(true) },
        },
      ],
    }).compile();

    service = moduleRef.get(PlanningService);
  });

  it('seeds a schedule snapshot from existing tasks when opening the workspace', async () => {
    tasksRepository.find?.mockResolvedValue([
      {
        id: predecessorTaskId,
        percentComplete: 20,
        plannedEndDate: '2026-07-05',
        plannedStartDate: '2026-07-01',
        projectId,
        taskKind: TaskKind.Standard,
        title: 'Build',
      },
    ]);
    schedulesRepository.find?.mockResolvedValue([
      {
        durationDays: 4,
        isCritical: false,
        plannedFinishDate: '2026-07-05',
        plannedStartDate: '2026-07-01',
        taskId: predecessorTaskId,
        taskKind: TaskKind.Standard,
      },
    ]);

    await service.getWorkspace(projectId, actor);

    expect(snapshotsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        projectFinishDate: '2026-07-05',
        projectStartDate: '2026-07-01',
        versionNumber: 1,
      }),
    );
    expect(schedulesRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({
        durationDays: 4,
        taskId: predecessorTaskId,
        taskTitle: 'Build',
      }),
    ]);
  });

  it('prevents summary task drag and resize mutations', async () => {
    snapshotsRepository.findOne?.mockResolvedValue({
      id: 'snapshot-id',
      projectId,
    });
    schedulesRepository.findOne?.mockResolvedValue({
      projectId,
      snapshotId: 'snapshot-id',
      taskId: predecessorTaskId,
      taskKind: TaskKind.Summary,
    });

    await expect(
      service.updateTaskSchedule(
        projectId,
        predecessorTaskId,
        { plannedStartDate: '2026-07-02' },
        actor,
      ),
    ).rejects.toThrow('Summary tasks cannot be dragged or resized');
  });

  it('prevents dependency loops', async () => {
    tasksRepository.findOne
      ?.mockResolvedValueOnce({
        id: successorTaskId,
        projectId,
        taskKind: TaskKind.Standard,
      })
      .mockResolvedValueOnce({
        id: predecessorTaskId,
        projectId,
        taskKind: TaskKind.Standard,
      });
    taskDependenciesRepository.find?.mockResolvedValue([
      {
        dependencyType: TaskDependencyType.FinishToStart,
        predecessorTaskId,
        successorTaskId,
      },
    ]);

    await expect(
      service.createDependency(
        projectId,
        {
          dependencyType: TaskDependencyType.FinishToStart,
          predecessorTaskId: successorTaskId,
          successorTaskId: predecessorTaskId,
        },
        actor,
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
