import { ResourceCalendarAssignmentApiService } from '../resource-calendar-assignment-api.service';
import { ResourceCalendarAssignmentController } from '../resource-calendar-assignment.controller';

type AuthenticatedRequest = Parameters<
  ResourceCalendarAssignmentController['putCalendarAssignment']
>[0];

const actor = {
  email: 'admin@example.com',
  roleId: 'admin-role-id',
  userId: '33333333-3333-4333-8333-333333333333',
};

describe('ResourceCalendarAssignmentController', () => {
  let controller: ResourceCalendarAssignmentController;
  let service: Record<keyof ResourceCalendarAssignmentApiService, jest.Mock>;

  beforeEach(() => {
    service = {
      assignCalendar: jest.fn(),
      clearCalendarAssignment: jest.fn(),
      getCalendarAssignment: jest.fn(),
      replaceCalendar: jest.fn(),
    };
    controller = new ResourceCalendarAssignmentController(
      service as unknown as ResourceCalendarAssignmentApiService,
    );
  });

  it('delegates reads exclusively to the API service', async () => {
    await controller.getCalendarAssignment('resource-id');

    expect(service.getCalendarAssignment).toHaveBeenCalledWith('resource-id');
  });

  it('delegates assignment with the authenticated actor', async () => {
    const request = { user: actor } as unknown as AuthenticatedRequest;
    const input = { calendarId: 'calendar-id' };

    await controller.putCalendarAssignment(request, 'resource-id', input);

    expect(service.assignCalendar).toHaveBeenCalledWith(
      'resource-id',
      input,
      actor,
    );
  });

  it('delegates clear and returns no response body', async () => {
    const request = { user: actor } as unknown as AuthenticatedRequest;

    await expect(
      controller.clearCalendarAssignment(request, 'resource-id', {}),
    ).resolves.toBeUndefined();

    expect(service.clearCalendarAssignment).toHaveBeenCalledWith(
      'resource-id',
      {},
      actor,
    );
  });
});
