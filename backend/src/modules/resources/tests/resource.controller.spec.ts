import { ResourceController } from '../resource.controller';
import { ResourceApiService } from '../resource-api.service';
import { ResourceStatus } from '../enums/resource-status.enum';
import { ResourceType } from '../enums/resource-type.enum';

describe('ResourceController', () => {
  let controller: ResourceController;
  let service: Record<keyof ResourceApiService, jest.Mock>;

  beforeEach(() => {
    service = {
      createResource: jest.fn(),
      deleteResource: jest.fn(),
      getResource: jest.fn(),
      listResources: jest.fn(),
      updateResource: jest.fn(),
    };

    controller = new ResourceController(
      service as unknown as ResourceApiService,
    );
  });

  it('forwards authenticated write operations to the API service', async () => {
    const request = {
      user: {
        email: 'admin@example.com',
        roleId: 'admin-role-id',
        userId: '4d136f2c-f4b2-4d33-b351-397de2a93dc3',
      },
    } as any;

    await controller.createResource(request, {
      name: 'Senior Engineer',
      resourceType: ResourceType.Human,
      status: ResourceStatus.Active,
    });
    await controller.updateResource(request, 'resource-id', {
      roleName: 'Architecture',
    });
    await controller.deleteResource(request, 'resource-id');

    expect(service.createResource).toHaveBeenCalledWith(
      {
        name: 'Senior Engineer',
        resourceType: ResourceType.Human,
        status: ResourceStatus.Active,
      },
      request.user,
    );
    expect(service.updateResource).toHaveBeenCalledWith(
      'resource-id',
      { roleName: 'Architecture' },
      request.user,
    );
    expect(service.deleteResource).toHaveBeenCalledWith(
      'resource-id',
      request.user,
    );
  });

  it('forwards read operations and query filters to the API service', async () => {
    await controller.listResources({
      includeArchived: true,
      resourceType: ResourceType.Team,
      search: 'delivery',
      status: ResourceStatus.Inactive,
    });
    await controller.getResource('resource-id');

    expect(service.listResources).toHaveBeenCalledWith({
      includeArchived: true,
      resourceType: ResourceType.Team,
      search: 'delivery',
      status: ResourceStatus.Inactive,
    });
    expect(service.getResource).toHaveBeenCalledWith('resource-id');
  });
});
