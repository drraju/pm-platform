import { ResourceAssignmentController } from '../resource-assignment.controller';
import { ResourceAssignmentApiService } from '../resource-assignment-api.service';
import { ResourceAssignmentStatus } from '../enums/resource-assignment-status.enum';

describe('ResourceAssignmentController', () => {
  let controller: ResourceAssignmentController;
  let service: Record<keyof ResourceAssignmentApiService, jest.Mock>;

  beforeEach(() => {
    service = {
      createAssignment: jest.fn(),
      deleteAssignment: jest.fn(),
      getAssignmentById: jest.fn(),
      listAssignmentsByProject: jest.fn(),
      listAssignmentsByResource: jest.fn(),
      updateAssignment: jest.fn(),
    };

    controller = new ResourceAssignmentController(
      service as unknown as ResourceAssignmentApiService,
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

    await controller.createAssignment(request, {
      allocationPercent: 50,
      endDate: '2026-07-18',
      projectId: 'project-id',
      resourceId: 'resource-id',
      startDate: '2026-07-11',
      status: ResourceAssignmentStatus.Active,
      taskId: 'task-id',
    });
    await controller.updateAssignment(request, 'assignment-id', {
      plannedMinutesPerDay: 240,
      taskId: null,
    });
    await controller.deleteAssignment(request, 'assignment-id');

    expect(service.createAssignment).toHaveBeenCalledWith(
      {
        allocationPercent: 50,
        endDate: '2026-07-18',
        projectId: 'project-id',
        resourceId: 'resource-id',
        startDate: '2026-07-11',
        status: ResourceAssignmentStatus.Active,
        taskId: 'task-id',
      },
      request.user,
    );
    expect(service.updateAssignment).toHaveBeenCalledWith(
      'assignment-id',
      {
        plannedMinutesPerDay: 240,
        taskId: null,
      },
      request.user,
    );
    expect(service.deleteAssignment).toHaveBeenCalledWith(
      'assignment-id',
      request.user,
    );
  });

  it('forwards read operations to the API service', async () => {
    await controller.getAssignmentById('assignment-id');
    await controller.listAssignmentsByProject('project-id');
    await controller.listAssignmentsByResource('resource-id');

    expect(service.getAssignmentById).toHaveBeenCalledWith('assignment-id');
    expect(service.listAssignmentsByProject).toHaveBeenCalledWith('project-id');
    expect(service.listAssignmentsByResource).toHaveBeenCalledWith(
      'resource-id',
    );
  });
});
