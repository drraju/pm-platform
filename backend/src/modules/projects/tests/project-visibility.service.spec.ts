import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationPolicyService } from '../../../common/authz/authorization-policy.service';
import { PermissionKey } from '../../../common/authz/permissions';
import { Task } from '../../tasks/entities/task.entity';
import { ProjectMember } from '../entities/project-member.entity';
import { Project } from '../entities/project.entity';
import { ProjectVisibilityService } from '../project-visibility.service';

type MockRepository<T extends object = object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

describe('ProjectVisibilityService', () => {
  let service: ProjectVisibilityService;
  let projectsRepository: MockRepository<Project>;
  let projectMembersRepository: MockRepository<ProjectMember>;
  let tasksRepository: MockRepository<Task>;
  let authorizationPolicyService: {
    canViewExecutive: jest.Mock;
    canViewPortfolio: jest.Mock;
    canViewProject: jest.Mock;
    hasAnyPermission: jest.Mock;
  };

  beforeEach(async () => {
    projectsRepository = {
      find: jest.fn(),
    };
    projectMembersRepository = {
      find: jest.fn(),
    };
    tasksRepository = {
      find: jest.fn(),
    };
    authorizationPolicyService = {
      canViewExecutive: jest.fn().mockResolvedValue(false),
      canViewPortfolio: jest.fn().mockResolvedValue(false),
      canViewProject: jest.fn().mockResolvedValue(false),
      hasAnyPermission: jest.fn().mockResolvedValue(false),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProjectVisibilityService,
        { provide: getRepositoryToken(Project), useValue: projectsRepository },
        {
          provide: getRepositoryToken(ProjectMember),
          useValue: projectMembersRepository,
        },
        { provide: getRepositoryToken(Task), useValue: tasksRepository },
        {
          provide: AuthorizationPolicyService,
          useValue: authorizationPolicyService,
        },
      ],
    }).compile();

    service = moduleRef.get(ProjectVisibilityService);
  });

  it('returns all projects for users with portfolio or executive visibility', async () => {
    authorizationPolicyService.canViewPortfolio.mockResolvedValue(true);

    await expect(
      service.getVisibleProjectIds({ roleId: 'role-1', userId: 'user-1' }),
    ).resolves.toBe('all');

    authorizationPolicyService.canViewPortfolio.mockResolvedValue(false);
    authorizationPolicyService.canViewExecutive.mockResolvedValue(true);

    await expect(
      service.getVisibleProjectIds({ roleId: 'role-1', userId: 'user-1' }),
    ).resolves.toBe('all');
  });

  it('returns owned, member, and task-assigned projects when task visibility expansion is allowed', async () => {
    projectsRepository.find?.mockResolvedValue([{ id: 'owned-project' }]);
    projectMembersRepository.find?.mockResolvedValue([
      { projectId: 'member-project' },
    ]);
    tasksRepository.find?.mockResolvedValue([
      { projectId: 'task-project' },
      { projectId: 'member-project' },
    ]);
    authorizationPolicyService.hasAnyPermission.mockImplementation(
      async (_actor, permissions: PermissionKey[]) =>
        permissions.includes(PermissionKey.TaskUpdate),
    );

    await expect(
      service.getVisibleProjectIds({ roleId: 'role-1', userId: 'user-1' }),
    ).resolves.toEqual(['owned-project', 'member-project', 'task-project']);
  });

  it('returns only owned and member projects when task-assigned expansion is not allowed', async () => {
    projectsRepository.find?.mockResolvedValue([{ id: 'owned-project' }]);
    projectMembersRepository.find?.mockResolvedValue([
      { projectId: 'member-project' },
    ]);
    tasksRepository.find?.mockResolvedValue([{ projectId: 'task-project' }]);

    await expect(
      service.getVisibleProjectIds({ roleId: 'role-1', userId: 'user-1' }),
    ).resolves.toEqual(['owned-project', 'member-project']);
    expect(tasksRepository.find).not.toHaveBeenCalled();
  });

  it('delegates point-in-time project visibility checks to the policy service', async () => {
    authorizationPolicyService.canViewProject.mockResolvedValue(true);

    await expect(
      service.canViewProject('project-1', { roleId: 'role-1', userId: 'user-1' }),
    ).resolves.toBe(true);
    expect(authorizationPolicyService.canViewProject).toHaveBeenCalledWith(
      'project-1',
      { roleId: 'role-1', userId: 'user-1' },
    );
  });
});
