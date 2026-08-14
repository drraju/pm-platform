import { ForbiddenException } from '@nestjs/common';
import { PermissionKey } from '../../common/authz/permissions';
import { AiPlaygroundController } from './ai-playground.controller';

describe('AiPlaygroundController', () => {
  const actor = {
    email: 'pm@example.com',
    roleId: 'project-manager-role',
    userId: 'pm-1',
  };
  const capabilityExecution = { execute: jest.fn() };
  const authorizationPolicyService = {
    getActorRoleName: jest.fn(),
    getGrantedPermissionKeys: jest.fn(),
    isExternalActor: jest.fn(),
  };
  const projectVisibilityService = { canViewProject: jest.fn() };
  const projectsService = {
    findMembers: jest.fn(),
    findOne: jest.fn(),
    findProjectTasks: jest.fn(),
  };
  const controller = new AiPlaygroundController(
    {} as never,
    {} as never,
    capabilityExecution as never,
    authorizationPolicyService as never,
    projectVisibilityService as never,
    projectsService as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    capabilityExecution.execute.mockResolvedValue({ status: 'completed' });
    authorizationPolicyService.getGrantedPermissionKeys.mockResolvedValue(
      new Set([PermissionKey.ProjectRead]),
    );
    authorizationPolicyService.getActorRoleName.mockResolvedValue(
      'PROJECT_MANAGER',
    );
    authorizationPolicyService.isExternalActor.mockResolvedValue(false);
    projectVisibilityService.canViewProject.mockResolvedValue(true);
    projectsService.findOne.mockResolvedValue({
      description: 'Approved context',
      id: 'project-1',
      name: 'Project One',
      status: 'active',
    });
    projectsService.findProjectTasks.mockResolvedValue([]);
    projectsService.findMembers.mockResolvedValue([]);
  });

  it('rejects client-requested project scope the actor cannot view', async () => {
    projectVisibilityService.canViewProject.mockResolvedValueOnce(false);

    await expect(
      controller.executeCapability(
        'project-summary',
        { input: {}, projectIds: ['hidden-project'] },
        { user: actor } as never,
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(capabilityExecution.execute).not.toHaveBeenCalled();
  });

  it('uses server authority and ignores caller-built enterprise context', async () => {
    await controller.executeCapability(
      'project-summary',
      {
        contextSourceData: {
          projects: [{ id: 'hidden-project', name: 'Injected' }],
        },
        input: { question: 'Summarize this project' },
        projectIds: ['project-1'],
        requestId: 'request-1',
        workspaceId: 'attacker-workspace',
      },
      { user: actor } as never,
    );

    expect(capabilityExecution.execute).toHaveBeenCalledWith({
      actorId: actor.userId,
      capabilityId: 'project-summary',
      contextAuthorization: {
        allowedProjectIds: ['project-1'],
        allowSensitiveContext: true,
      },
      contextSourceData: {
        execution: [],
        project: [
          {
            description: 'Approved context',
            id: 'project-1',
            name: 'Project One',
            ownerId: undefined,
            status: 'active',
          },
        ],
        raid: [],
        task: [],
        team: [],
        user: [
          {
            email: actor.email,
            id: actor.userId,
            role: 'PROJECT_MANAGER',
          },
        ],
      },
      correlationId: 'request-1:correlation',
      input: { question: 'Summarize this project' },
      permissions: [PermissionKey.ProjectRead],
      projectIds: ['project-1'],
      requestId: 'request-1',
      roles: ['PROJECT_MANAGER'],
    });
  });

  it('disables sensitive context for external actors', async () => {
    authorizationPolicyService.isExternalActor.mockResolvedValueOnce(true);

    await controller.executeCapability(
      'project-summary',
      { input: {}, projectIds: ['project-1'], requestId: 'request-2' },
      { user: actor } as never,
    );

    expect(capabilityExecution.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        contextAuthorization: {
          allowedProjectIds: ['project-1'],
          allowSensitiveContext: false,
        },
      }),
    );
  });
});
