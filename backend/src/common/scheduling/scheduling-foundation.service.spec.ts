import { BadRequestException } from '@nestjs/common';
import { TaskKind } from '../enums/task-kind.enum';
import { TaskType } from '../enums/task-type.enum';
import { SchedulingFoundationService } from './scheduling-foundation.service';

describe('SchedulingFoundationService', () => {
  let service: SchedulingFoundationService;

  beforeEach(() => {
    service = new SchedulingFoundationService();
  });

  it('maps the new taskType contract to the existing taskKind storage values', () => {
    expect(service.normalizeTaskKind({ taskType: TaskType.Task })).toBe(
      TaskKind.Standard,
    );
    expect(service.normalizeTaskKind({ taskType: TaskType.Summary })).toBe(
      TaskKind.Summary,
    );
    expect(service.normalizeTaskKind({ taskType: TaskType.Milestone })).toBe(
      TaskKind.Milestone,
    );
  });

  it('keeps backward compatibility for existing taskKind values', () => {
    expect(service.normalizeTaskKind({ taskKind: TaskKind.Standard })).toBe(
      TaskKind.Standard,
    );
    expect(service.toTaskType(TaskKind.Standard)).toBe(TaskType.Task);
  });

  it('normalizes a milestone start change by matching the finish date', () => {
    expect(
      service.normalizeTaskMutation(
        {
          plannedStartDate: '2026-07-10',
          taskType: TaskType.Milestone,
        },
        {
          plannedEndDate: '2026-07-05',
          plannedStartDate: '2026-07-05',
          taskKind: TaskKind.Milestone,
        },
      ),
    ).toEqual(
      expect.objectContaining({
        plannedEndDate: '2026-07-10',
        plannedStartDate: '2026-07-10',
        taskKind: TaskKind.Milestone,
      }),
    );
  });

  it('normalizes a milestone finish change by matching the start date', () => {
    expect(
      service.normalizeScheduleMutation(
        TaskKind.Milestone,
        { plannedFinishDate: '2026-08-01' },
        {
          durationDays: 0,
          plannedEndDate: '2026-07-05',
          plannedStartDate: '2026-07-05',
        },
      ),
    ).toEqual({
      durationDays: 0,
      plannedEndDate: '2026-08-01',
      plannedStartDate: '2026-08-01',
    });
  });

  it('rejects conflicting milestone start and finish dates', () => {
    expect(() =>
      service.normalizeScheduleMutation(
        TaskKind.Milestone,
        {
          plannedFinishDate: '2026-08-02',
          plannedStartDate: '2026-08-01',
        },
        {},
      ),
    ).toThrow(BadRequestException);
  });

  it('rejects manual summary schedule changes', () => {
    expect(() =>
      service.normalizeScheduleMutation(
        TaskKind.Summary,
        { durationDays: 5 },
        {},
      ),
    ).toThrow('Summary task schedule is calculated from child work');
  });
});
