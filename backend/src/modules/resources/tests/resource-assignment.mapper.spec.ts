import { ResourceAssignmentMapper } from '../resource-assignment.mapper';
import { ResourceAssignment } from '../entities/resource-assignment.entity';
import { ResourceAssignmentStatus } from '../enums/resource-assignment-status.enum';

describe('ResourceAssignmentMapper', () => {
  it('maps create dto to entity', () => {
    const assignment = ResourceAssignmentMapper.fromCreateDto({
      allocationPercent: 50,
      endDate: '2026-07-18',
      plannedMinutesPerDay: null,
      projectId: 'project-id',
      resourceId: 'resource-id',
      startDate: '2026-07-11',
      status: ResourceAssignmentStatus.Active,
      taskId: 'task-id',
    });

    expect(assignment).toMatchObject({
      allocationPercent: 50,
      endDate: '2026-07-18',
      plannedMinutesPerDay: null,
      projectId: 'project-id',
      resourceId: 'resource-id',
      startDate: '2026-07-11',
      status: ResourceAssignmentStatus.Active,
      taskId: 'task-id',
    });
  });

  it('maps update dto without mutating unrelated fields', () => {
    const existing = Object.assign(new ResourceAssignment(), {
      allocationPercent: 50,
      createdAt: new Date('2026-07-10T00:00:00.000Z'),
      endDate: '2026-07-18',
      id: 'assignment-id',
      plannedMinutesPerDay: null,
      projectId: 'project-id',
      resourceId: 'resource-id',
      startDate: '2026-07-11',
      status: ResourceAssignmentStatus.Active,
      taskId: 'task-id',
      updatedAt: new Date('2026-07-10T00:00:00.000Z'),
    });

    const updated = ResourceAssignmentMapper.fromUpdateDto(existing, {
      plannedMinutesPerDay: 240,
      taskId: null,
    });

    expect(updated).toMatchObject({
      allocationPercent: 50,
      plannedMinutesPerDay: 240,
      taskId: null,
    });
    expect(existing.plannedMinutesPerDay).toBeNull();
    expect(existing.taskId).toBe('task-id');
  });

  it('maps entity to response dto', () => {
    const assignment = Object.assign(new ResourceAssignment(), {
      allocationPercent: 50,
      createdAt: new Date('2026-07-10T00:00:00.000Z'),
      endDate: '2026-07-18',
      id: 'assignment-id',
      plannedMinutesPerDay: 240,
      projectId: 'project-id',
      resourceId: 'resource-id',
      startDate: '2026-07-11',
      status: ResourceAssignmentStatus.Active,
      taskId: 'task-id',
      updatedAt: new Date('2026-07-11T00:00:00.000Z'),
    });

    expect(ResourceAssignmentMapper.toResponse(assignment)).toMatchObject({
      allocationPercent: 50,
      endDate: '2026-07-18',
      id: 'assignment-id',
      plannedMinutesPerDay: 240,
      projectId: 'project-id',
      resourceId: 'resource-id',
      startDate: '2026-07-11',
      status: ResourceAssignmentStatus.Active,
      taskId: 'task-id',
    });
  });
});
