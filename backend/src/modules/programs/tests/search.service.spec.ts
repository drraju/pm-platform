import { UserRole } from '../../../common/enums/user-role.enum';
import { SearchService } from '../search.service';

describe('SearchService', () => {
  const actor = { roleId: 'role-1', userId: 'user-1' };

  function build(roleNames: string[], permissions = false) {
    const customersService = { list: jest.fn(async () => []) };
    const projectVisibilityService = { getVisibleProjectIds: jest.fn(async () => []) };
    const projectsRepository = { find: jest.fn(async () => []) };
    const tasksRepository = { find: jest.fn(async () => []) };
    const authorizationPolicyService = {
      getActorRoleNames: jest.fn(async () => roleNames),
      hasAnyPermission: jest.fn(async () => permissions),
      isExternalActor: jest.fn(
        async () =>
          roleNames.length > 0 &&
          roleNames.every(
            (name) => name === UserRole.Customer || name === UserRole.Partner,
          ),
      ),
    };
    const service = new SearchService(
      customersService as never,
      projectVisibilityService as never,
      authorizationPolicyService as never,
      projectsRepository as never,
      tasksRepository as never,
    );
    return { customersService, projectVisibilityService, projectsRepository, service, tasksRepository };
  }

  it('opens a customer the person can read', async () => {
    const { customersService, service } = build([UserRole.Sales]);
    customersService.list.mockResolvedValue([
      { domain: 'northwind.example', id: 'customer-1', name: 'Northwind' },
    ]);

    const result = await service.search(actor, 'north');

    expect(result.customers).toEqual([
      {
        href: '/customers/customer-1',
        id: 'customer-1',
        name: 'Northwind',
        parent: null,
      },
    ]);
    expect(result.work).toEqual([]);
  });

  it('returns no work titles to customer success', async () => {
    const { service, tasksRepository } = build([UserRole.CustomerSuccessManager]);

    const result = await service.search(actor, 'Test2');

    expect(result.work).toEqual([]);
    expect(tasksRepository.find).not.toHaveBeenCalled();
  });

  it('returns nothing when the work item is outside the visible projects', async () => {
    const { projectVisibilityService, service, tasksRepository } = build(
      [UserRole.TeamMember],
      true,
    );
    projectVisibilityService.getVisibleProjectIds.mockResolvedValue(['mine']);
    tasksRepository.find.mockResolvedValue([]);

    const result = await service.search(actor, 'Secret plan');

    expect(result.work).toEqual([]);
    expect(result.projects).toEqual([]);
    const where = tasksRepository.find.mock.calls[0][0].where;
    expect(where.projectId._value).toEqual(['mine']);
    expect(where.projectId._value).not.toContain('other-project');
  });

  it('does not offer a program manager a project outside their program', async () => {
    const { customersService, projectVisibilityService, projectsRepository, service } = build([
      UserRole.ProgramManager,
    ]);
    customersService.list.mockResolvedValue([
      { domain: null, id: 'customer-1', name: 'Northwind' },
    ]);
    projectVisibilityService.getVisibleProjectIds.mockResolvedValue(['in-program']);

    await service.search(actor, 'Outside');

    const where = projectsRepository.find.mock.calls[0][0].where;
    expect(where).toEqual([
      expect.objectContaining({
        id: expect.objectContaining({ _value: ['in-program'] }),
      }),
    ]);
  });

  it('does not search until there are two characters', async () => {
    const { customersService, service } = build([UserRole.TeamMember], true);

    await expect(service.search(actor, 'a')).resolves.toEqual({
      customers: [],
      projects: [],
      work: [],
    });
    expect(customersService.list).not.toHaveBeenCalled();
  });

  it('does not open the customer book for a contact', async () => {
    const { customersService, service } = build([UserRole.Customer]);
    customersService.list.mockResolvedValue([
      { domain: 'northwind.example', id: 'customer-1', name: 'Northwind' },
    ]);

    const result = await service.search(actor, 'north');

    expect(customersService.list).not.toHaveBeenCalled();
    expect(result.customers).toEqual([]);
    expect(result.work).toEqual([]);
  });
});
