import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateResourceAssignmentDto,
  UpdateResourceAssignmentDto,
} from '../dto/resource-assignment.dto';
import { ResourceAssignmentStatus } from '../enums/resource-assignment-status.enum';

describe('ResourceAssignment DTO validation', () => {
  it('accepts a valid create resource assignment payload', async () => {
    const dto = plainToInstance(CreateResourceAssignmentDto, {
      allocationPercent: 50,
      endDate: '2026-07-18',
      projectId: '3e9e5d92-b2e4-4f13-9d66-c8b39536bb4d',
      resourceId: '4d136f2c-f4b2-4d33-b351-397de2a93dc3',
      startDate: '2026-07-11',
      status: ResourceAssignmentStatus.Active,
      taskId: '750f3af5-4693-4ed4-bf57-814d3fa08881',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('accepts partial update payloads', async () => {
    const dto = plainToInstance(UpdateResourceAssignmentDto, {
      plannedMinutesPerDay: 240,
      status: ResourceAssignmentStatus.Archived,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects invalid uuids, dates, enums, and allocation values', async () => {
    const dto = plainToInstance(CreateResourceAssignmentDto, {
      allocationPercent: 120,
      endDate: 'not-a-date',
      projectId: 'invalid-project',
      resourceId: 'invalid-resource',
      startDate: 'also-not-a-date',
      status: 'unsupported',
      taskId: 'invalid-task',
    });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining([
        'allocationPercent',
        'endDate',
        'projectId',
        'resourceId',
        'startDate',
        'status',
        'taskId',
      ]),
    );
  });
});
