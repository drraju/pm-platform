import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationPolicyService } from '../../../common/authz/authorization-policy.service';
import { CanonicalCapabilityResolverService } from '../../../common/authz/canonical-capability-resolver.service';
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
  let canonicalCapabilityResolver: CanonicalCapabilityResolverService;
  let projectsRepository: MockRepository<Project>;
  let projectMembersRepository: MockRepository<ProjectMember>;
  let tasksRepository: MockRepository<Task>;
  let authorizationPolicyService: {
    canViewExecutive: jest.Mock;
    canViewPortfolio: jest.Mock;
    canViewProject: jest.Mock;
    hasAnyPermission: jest.Mock;
    hasPermission: jest.Mock;
    isExternalActor: jest.Mock;
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
      hasPermission: jest.fn().mockResolvedValue(true),
      isExternalActor: jest.fn().mockResolvedValue(false),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProjectVisibilityService,
        CanonicalCapabilityResolverService,
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
    canonicalCapabilityResolver = moduleRef.get(
      CanonicalCapabilityResolverService,
    );
  });

  it('returns no projects when actor context is missing', async () => {
    await expect(service.getVisibleProjectIds()).resolves.toEqual([]);
    expect(projectsRepository.find).not.toHaveBeenCalled();
  });

  it('requires project.read before returning any scoped list visibility', async () => {
    authorizationPolicyService.hasPermission.mockResolvedValue(false);
    projectsRepository.find?.mockResolvedValue([{ id: 'owned-project' }]);
    projectMembersRepository.find?.mockResolvedValue([
      { projectId: 'member-project' },
    ]);

    await expect(
      service.getVisibleProjectIds({ roleId: 'role-1', userId: 'user-1' }),
    ).resolves.toEqual([]);

    expect(projectsRepository.find).not.toHaveBeenCalled();
    expect(projectMembersRepository.find).not.toHaveBeenCalled();
    expect(tasksRepository.find).not.toHaveBeenCalled();
  });

  it('returns all projects for users with portfolio or executive visibility', async () => {
    authorizationPolicyService.canViewPortfolio.mockResolvedValue(true);

    await expect(
      service.getVisibleProjectIds({ roleId: 'role-1', userId: 'user-1' }),
    ).resolves.toBe('all');

    expect(authorizationPolicyService.hasPermission).toHaveBeenCalledWith(
      { roleId: 'role-1', userId: 'user-1' },
      PermissionKey.ProjectRead,
    );

    authorizationPolicyService.canViewPortfolio.mockResolvedValue(false);
    authorizationPolicyService.canViewExecutive.mockResolvedValue(true);

    await expect(
      service.getVisibleProjectIds({ roleId: 'role-1', userId: 'user-1' }),
    ).resolves.toBe('all');
  });

  it('loads the global visible-project list for an Executive without memberships', async () => {
    const executiveActor = {
      roleId: 'role-EXECUTIVE',
      userId: 'executive-1',
    };
    authorizationPolicyService.canViewExecutive.mockResolvedValue(true);
    projectsRepository.find?.mockResolvedValue([{ id: 'project-1' }]);

    await expect(service.getVisibleProjects(executiveActor)).resolves.toEqual([
      { id: 'project-1' },
    ]);

    expect(projectsRepository.find).toHaveBeenCalledWith({
      order: { createdAt: 'DESC' },
      relations: { issues: true, owner: true, risks: true, tasks: true },
    });
    expect(projectMembersRepository.find).not.toHaveBeenCalled();
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
    expect(projectsRepository.find).toHaveBeenCalledWith({
      select: { id: true },
      where: [
        { ownerId: 'user-1' },
        { businessOwnerId: 'user-1' },
        { deliveryLeadId: 'user-1' },
        { executiveSponsorId: 'user-1' },
      ],
    });
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

  it('aligns project list, direct project access, and canonical project.view for a formal governor without membership', async () => {
    const actor = { roleId: 'role-1', userId: 'governor-1' };
    projectsRepository.find?.mockResolvedValue([{ id: 'governed-project' }]);
    projectMembersRepository.find?.mockResolvedValue([]);
    authorizationPolicyService.canViewProject.mockResolvedValue(true);

    await expect(service.getVisibleProjectIds(actor)).resolves.toEqual([
      'governed-project',
    ]);
    await expect(
      service.canViewProject('governed-project', actor),
    ).resolves.toBe(true);
    await expect(
      canonicalCapabilityResolver.resolve({
        actor,
        capability: 'project.view',
        resource: { projectId: 'governed-project', type: 'project' },
      }),
    ).resolves.toEqual({
      allowed: true,
      audience: 'internal',
      reasonCode: 'GRANTED',
    });
  });

  it('preserves assigned-task project visibility for external actors with qualifying task permissions', async () => {
    const actor = { roleId: 'partner-role', userId: 'partner-1' };
    authorizationPolicyService.hasAnyPermission.mockImplementation(
      async (_actor, permissions: PermissionKey[]) =>
        permissions.includes(PermissionKey.TaskUpdate),
    );
    authorizationPolicyService.isExternalActor.mockResolvedValue(true);
    authorizationPolicyService.canViewProject.mockResolvedValue(true);
    projectsRepository.find?.mockResolvedValue([]);
    projectMembersRepository.find?.mockResolvedValue([]);
    tasksRepository.find?.mockResolvedValue([{ projectId: 'task-project' }]);

    await expect(service.getVisibleProjectIds(actor)).resolves.toEqual([
      'task-project',
    ]);
    await expect(
      canonicalCapabilityResolver.resolve({
        actor,
        capability: 'project.view',
        resource: { projectId: 'task-project', type: 'project' },
      }),
    ).resolves.toEqual({
      allowed: true,
      audience: 'external',
      reasonCode: 'GRANTED',
    });
  });

  it('delegates point-in-time project visibility checks to the policy service and shadows canonical project.view', async () => {
    authorizationPolicyService.canViewProject.mockResolvedValue(true);
    const compareSpy = jest.spyOn(
      canonicalCapabilityResolver,
      'compareWithLegacy',
    );
    const actor = {
      roleId: 'role-1',
      userId: 'user-1',
    };

    await expect(service.canViewProject('project-1', actor)).resolves.toBe(
      true,
    );
    expect(authorizationPolicyService.canViewProject).toHaveBeenCalledWith(
      'project-1',
      actor,
    );
    expect(compareSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        legacyAllowed: true,
        resolverInput: {
          actor,
          capability: 'project.view',
          resource: { projectId: 'project-1', type: 'project' },
        },
      }),
    );
  });
});
