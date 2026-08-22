import { ProjectsController } from '../projects.controller';

describe('ProjectsController baseline governance', () => {
  it('delegates the active-baseline command with the authenticated actor', async () => {
    const activatedBaseline = {
      id: '4bb72a6f-1240-4df7-a298-1e0c80701ffc',
      isCurrent: true,
      status: 'approved',
    };
    const projectsService = {
      setActiveProjectBaseline: jest.fn().mockResolvedValue(activatedBaseline),
    };
    const controller = new ProjectsController(
      projectsService as never,
      {} as never,
      {} as never,
    );
    const request = {
      user: {
        email: 'manager@example.com',
        roleId: 'project-manager-role',
        userId: 'c7c7a415-52ee-48b9-a258-3a96f60af56e',
      },
    };

    await expect(
      controller.setActiveProjectBaseline(
        request as never,
        '838dc035-71c4-4797-8b18-d70681ac2f17',
        { baselineId: activatedBaseline.id },
      ),
    ).resolves.toBe(activatedBaseline);
    expect(projectsService.setActiveProjectBaseline).toHaveBeenCalledWith(
      '838dc035-71c4-4797-8b18-d70681ac2f17',
      activatedBaseline.id,
      request.user,
    );
  });
});
