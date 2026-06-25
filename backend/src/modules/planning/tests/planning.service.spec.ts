import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationPolicyService } from '../../../common/authz/authorization-policy.service';
import { PlanningCalculationStatus } from '../../../common/enums/planning-calculation-status.enum';
import { ResourceAllocationUnit } from '../../../common/enums/resource-allocation-unit.enum';
import { ProjectBaseline } from '../../projects/entities/project-baseline.entity';
import { Project } from '../../projects/entities/project.entity';
import { ProjectVisibilityService } from '../../projects/project-visibility.service';
import { ProjectsService } from '../../projects/projects.service';
import { TaskDependency } from '../../tasks/entities/task-dependency.entity';
import { Task } from '../../tasks/entities/task.entity';
import { User } from '../../users/entities/user.entity';
import { PlanningScheduleSnapshot } from '../entities/planning-schedule-snapshot.entity';
import { PortfolioDependency } from '../entities/portfolio-dependency.entity';
import { ResourceAllocation } from '../entities/resource-allocation.entity';
import { ResourceCapacity } from '../entities/resource-capacity.entity';
import { ResourceWorkloadSnapshot } from '../entities/resource-workload-snapshot.entity';
import { PlanningService } from '../planning.service';

type MockRepository<T extends object = object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

const actor = {
  email: 'pm@example.com',
  roleId: 'project-manager-role-id',
  userId: '4d136f2c-f4b2-4d33-b351-397de2a93dc3',
};
const projectId = '0f1b74f2-5715-4d1a-91ad-d569d3ecfb60';
const taskId = 'e9f527f1-f645-4aef-b6a2-a88905b8fe8e';
const userId = '9fce3bfb-a20c-4748-ad1c-60a138e66cce';

describe('PlanningService', () => {
  let service: PlanningService;
  let scheduleSnapshotsRepository: MockRepository<PlanningScheduleSnapshot>;
  let resourceAllocationsRepository: MockRepository<ResourceAllocation>;
  let resourceCapacitiesRepository: MockRepository<ResourceCapacity>;
  let workloadSnapshotsRepository: MockRepository<ResourceWorkloadSnapshot>;
  let portfolioDependenciesRepository: MockRepository<PortfolioDependency>;
  let projectsRepository: MockRepository<Project>;
  let tasksRepository: MockRepository<Task>;
  let usersRepository: MockRepository<User>;
  let authorizationPolicyService: { canManageProject: jest.Mock };
  let projectVisibilityService: {
    canViewProject: jest.Mock;
    getVisibleProjectIds: jest.Mock;
  };
  let projectsService: {
    captureProjectBaseline: jest.Mock;
    createProjectTaskDependency: jest.Mock;
    findProjectBaselines: jest.Mock;
    findProjectTaskDependencies: jest.Mock;
    removeProjectTaskDependency: jest.Mock;
    updateProjectTaskDependency: jest.Mock;
  };

  beforeEach(async () => {
    scheduleSnapshotsRepository = {
      create: jest.fn((input) => input),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((input) =>
        Promise.resolve({ id: 'snapshot-id', ...input }),
      ),
    };
    resourceAllocationsRepository = {
      create: jest.fn((input) => input),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((input) =>
        Promise.resolve({ id: 'allocation-id', ...input }),
      ),
      softRemove: jest.fn(),
    };
    resourceCapacitiesRepository = {
      create: jest.fn((input) => input),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((input) =>
        Promise.resolve({ id: 'capacity-id', ...input }),
      ),
      softRemove: jest.fn(),
    };
    workloadSnapshotsRepository = {
      find: jest.fn(),
    };
    portfolioDependenciesRepository = {
      create: jest.fn((input) => input),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((input) =>
        Promise.resolve({ id: 'portfolio-dep-id', ...input }),
      ),
      softRemove: jest.fn(),
    };
    projectsRepository = {
      findOne: jest.fn().mockResolvedValue({ id: projectId }),
    };
    tasksRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    };
    usersRepository = {
      findOne: jest.fn(),
    };
    authorizationPolicyService = {
      canManageProject: jest.fn().mockResolvedValue(true),
    };
    projectVisibilityService = {
      canViewProject: jest.fn().mockResolvedValue(true),
      getVisibleProjectIds: jest.fn().mockResolvedValue('all'),
    };
    projectsService = {
      captureProjectBaseline: jest.fn(),
      createProjectTaskDependency: jest.fn(),
      findProjectBaselines: jest.fn(),
      findProjectTaskDependencies: jest.fn(),
      removeProjectTaskDependency: jest.fn(),
      updateProjectTaskDependency: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PlanningService,
        {
          provide: getRepositoryToken(PlanningScheduleSnapshot),
          useValue: scheduleSnapshotsRepository,
        },
        {
          provide: getRepositoryToken(ResourceAllocation),
          useValue: resourceAllocationsRepository,
        },
        {
          provide: getRepositoryToken(ResourceCapacity),
          useValue: resourceCapacitiesRepository,
        },
        {
          provide: getRepositoryToken(ResourceWorkloadSnapshot),
          useValue: workloadSnapshotsRepository,
        },
        {
          provide: getRepositoryToken(PortfolioDependency),
          useValue: portfolioDependenciesRepository,
        },
        {
          provide: getRepositoryToken(Project),
          useValue: projectsRepository,
        },
        {
          provide: getRepositoryToken(Task),
          useValue: tasksRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: usersRepository,
        },
        {
          provide: AuthorizationPolicyService,
          useValue: authorizationPolicyService,
        },
        {
          provide: ProjectVisibilityService,
          useValue: projectVisibilityService,
        },
        {
          provide: ProjectsService,
          useValue: projectsService,
        },
      ],
    }).compile();

    service = moduleRef.get(PlanningService);
  });

  it('aggregates the planning workspace from thin API contracts', async () => {
    const task = { id: taskId, projectId } as Task;
    const dependency = { id: 'dependency-id' } as TaskDependency;
    const baseline = { id: 'baseline-id' } as ProjectBaseline;
    const allocation = { id: 'allocation-id' } as ResourceAllocation;
    const schedule = {
      id: 'snapshot-id',
      projectId,
      scheduleVersion: 2,
    } as PlanningScheduleSnapshot;

    tasksRepository.find?.mockResolvedValue([task]);
    projectsService.findProjectTaskDependencies.mockResolvedValue([dependency]);
    projectsService.findProjectBaselines.mockResolvedValue([baseline]);
    resourceAllocationsRepository.find?.mockResolvedValue([allocation]);
    scheduleSnapshotsRepository.findOne?.mockResolvedValue(schedule);

    await expect(service.getWorkspace(projectId, actor)).resolves.toEqual({
      baselines: [baseline],
      dependencies: [dependency],
      latestSchedule: schedule,
      resourceAllocations: [allocation],
      tasks: [task],
    });
  });

  it('creates a pending schedule recalculation snapshot with the next version', async () => {
    scheduleSnapshotsRepository.findOne?.mockResolvedValue({
      id: 'previous-snapshot-id',
      scheduleVersion: 4,
    });

    await expect(
      service.requestScheduleRecalculation(projectId, actor),
    ).resolves.toEqual(
      expect.objectContaining({
        calculationStatus: PlanningCalculationStatus.Pending,
        criticalPathTaskIds: [],
        projectId,
        scheduleVersion: 5,
      }),
    );

    expect(scheduleSnapshotsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        createdById: actor.userId,
        projectId,
        scheduleVersion: 5,
        updatedById: actor.userId,
      }),
    );
  });

  it('rejects schedule recalculation without project manager access', async () => {
    authorizationPolicyService.canManageProject.mockResolvedValue(false);

    await expect(
      service.requestScheduleRecalculation(projectId, actor),
    ).rejects.toThrow(ForbiddenException);
  });

  it('creates user resource capacity records', async () => {
    usersRepository.findOne?.mockResolvedValue({ id: userId });

    await service.createResourceCapacity(
      projectId,
      {
        capacityDate: '2026-07-01',
        capacityMinutes: 420,
        resourceUnit: ResourceAllocationUnit.User,
        userId,
      },
      actor,
    );

    expect(resourceCapacitiesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        capacityDate: '2026-07-01',
        capacityMinutes: 420,
        projectId,
        resourceUnit: ResourceAllocationUnit.User,
        timezone: 'UTC',
        userId,
      }),
    );
  });

  it('rejects ambiguous resource targets', async () => {
    await expect(
      service.createResourceCapacity(
        projectId,
        {
          capacityDate: '2026-07-01',
          capacityMinutes: 420,
          resourceUnit: ResourceAllocationUnit.User,
          teamName: 'Architecture',
          userId,
        },
        actor,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects resource allocations with inverted dates', async () => {
    usersRepository.findOne?.mockResolvedValue({ id: userId });

    await expect(
      service.createResourceAllocation(
        projectId,
        {
          allocationPercent: 50,
          endDate: '2026-07-01',
          resourceUnit: ResourceAllocationUnit.User,
          startDate: '2026-07-05',
          userId,
        },
        actor,
      ),
    ).rejects.toThrow('Allocation end date cannot be before start date');
  });
});
