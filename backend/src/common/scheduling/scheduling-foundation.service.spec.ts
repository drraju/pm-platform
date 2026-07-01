import { BadRequestException } from '@nestjs/common';
import { MilestoneCategory } from '../enums/milestone-category.enum';
import { TaskKind } from '../enums/task-kind.enum';
import { TaskStatus } from '../enums/task-status.enum';
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

  it.each([
    [undefined, MilestoneCategory.Standard],
    [MilestoneCategory.Standard, MilestoneCategory.Standard],
    [MilestoneCategory.Release, MilestoneCategory.Release],
    [MilestoneCategory.Drop, MilestoneCategory.Drop],
    ['Go Live', MilestoneCategory.GoLive],
    [MilestoneCategory.Decision, MilestoneCategory.Decision],
  ])('normalizes milestone category %s', (inputCategory, expectedCategory) => {
    expect(
      service.normalizeTaskMutation({
        milestoneCategory: inputCategory,
        taskType: TaskType.Milestone,
      }),
    ).toEqual(
      expect.objectContaining({
        milestoneCategory: expectedCategory,
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
      milestoneCategory: MilestoneCategory.Standard,
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

  it('rejects unsupported milestone categories', () => {
    expect(() =>
      service.normalizeTaskMutation({
        milestoneCategory: 'launch',
        taskType: TaskType.Milestone,
      }),
    ).toThrow('Unsupported milestone category launch');
  });

  it('rejects milestone category on non-milestone tasks', () => {
    expect(() =>
      service.normalizeTaskMutation({
        milestoneCategory: MilestoneCategory.Release,
        taskType: TaskType.Task,
      }),
    ).toThrow('Milestone category can only be set on milestone tasks');
  });

  it('rejects direct milestone-to-summary conversion without a conversion workflow', () => {
    expect(() =>
      service.normalizeTaskMutation(
        { taskType: TaskType.Summary },
        { taskKind: TaskKind.Milestone },
      ),
    ).toThrow(
      'Milestone-to-summary conversion requires a validated summary conversion workflow',
    );
  });

  it('rejects negative milestone duration before persistence', () => {
    expect(() =>
      service.normalizeScheduleMutation(
        TaskKind.Milestone,
        { durationDays: -1 },
        {},
      ),
    ).toThrow('Milestone duration cannot be negative');
  });

  it('rejects manual milestone progress changes', () => {
    expect(() =>
      service.normalizeScheduleMutation(
        TaskKind.Milestone,
        { percentComplete: 100 },
        {},
      ),
    ).toThrow('Milestone progress is determined by scheduling state');
  });

  it('rejects manual milestone workflow status changes', () => {
    expect(() =>
      service.normalizeTaskMutation({
        status: TaskStatus.Done,
        taskType: TaskType.Milestone,
      }),
    ).toThrow('Milestone status is determined by scheduling state');
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

  it('rolls up a single-level summary from descendant executable work', () => {
    const schedules = [
      {
        durationDays: 99,
        parentTaskId: null,
        percentComplete: 0,
        plannedEndDate: '2026-07-20',
        plannedStartDate: '2026-07-20',
        task: {
          percentComplete: 0,
          plannedEndDate: '2026-07-20',
          plannedStartDate: '2026-07-20',
          status: TaskStatus.Todo,
        },
        taskId: 'summary',
        taskKind: TaskKind.Summary,
      },
      {
        durationDays: 2,
        parentTaskId: 'summary',
        percentComplete: 50,
        plannedEndDate: '2026-07-03',
        plannedStartDate: '2026-07-01',
        task: { status: TaskStatus.InProgress },
        taskId: 'task-a',
        taskKind: TaskKind.Standard,
      },
      {
        durationDays: 4,
        parentTaskId: 'summary',
        percentComplete: 100,
        plannedEndDate: '2026-07-10',
        plannedStartDate: '2026-07-06',
        task: { status: TaskStatus.Done },
        taskId: 'task-b',
        taskKind: TaskKind.Standard,
      },
    ];

    const result = service.rollupSummarySchedules(schedules);

    expect(result.changedSummaries).toEqual([schedules[0]]);
    expect(schedules[0]).toEqual(
      expect.objectContaining({
        durationDays: 9,
        percentComplete: 83,
        plannedEndDate: '2026-07-10',
        plannedStartDate: '2026-07-01',
      }),
    );
    expect(schedules[0].task).toEqual(
      expect.objectContaining({
        percentComplete: 83,
        plannedEndDate: '2026-07-10',
        plannedStartDate: '2026-07-01',
        status: TaskStatus.InProgress,
      }),
    );
  });

  it('rolls up nested summaries recursively', () => {
    const schedules = [
      {
        parentTaskId: null,
        task: { status: TaskStatus.Todo },
        taskId: 'project',
        taskKind: TaskKind.Summary,
      },
      {
        parentTaskId: 'project',
        task: { status: TaskStatus.Todo },
        taskId: 'phase',
        taskKind: TaskKind.Summary,
      },
      {
        durationDays: 4,
        parentTaskId: 'phase',
        percentComplete: 25,
        plannedEndDate: '2026-07-05',
        plannedStartDate: '2026-07-01',
        task: { status: TaskStatus.InProgress },
        taskId: 'task-a',
        taskKind: TaskKind.Standard,
      },
      {
        durationDays: 2,
        parentTaskId: 'project',
        percentComplete: 100,
        plannedEndDate: '2026-07-12',
        plannedStartDate: '2026-07-10',
        task: { status: TaskStatus.Done },
        taskId: 'task-b',
        taskKind: TaskKind.Standard,
      },
    ];

    service.rollupSummarySchedules(schedules);

    expect(schedules[1]).toEqual(
      expect.objectContaining({
        durationDays: 4,
        percentComplete: 25,
        plannedEndDate: '2026-07-05',
        plannedStartDate: '2026-07-01',
      }),
    );
    expect(schedules[1].task?.status).toBe(TaskStatus.InProgress);
    expect(schedules[0]).toEqual(
      expect.objectContaining({
        durationDays: 11,
        percentComplete: 50,
        plannedEndDate: '2026-07-12',
        plannedStartDate: '2026-07-01',
      }),
    );
    expect(schedules[0].task?.status).toBe(TaskStatus.InProgress);
  });

  it('weights summary progress by planned duration instead of averaging tasks', () => {
    const schedules = [
      {
        parentTaskId: null,
        task: {},
        taskId: 'summary',
        taskKind: TaskKind.Summary,
      },
      {
        durationDays: 1,
        parentTaskId: 'summary',
        percentComplete: 100,
        plannedEndDate: '2026-07-02',
        plannedStartDate: '2026-07-01',
        taskId: 'task-a',
        taskKind: TaskKind.Standard,
      },
      {
        durationDays: 100,
        parentTaskId: 'summary',
        percentComplete: 0,
        plannedEndDate: '2026-10-09',
        plannedStartDate: '2026-07-01',
        taskId: 'task-b',
        taskKind: TaskKind.Standard,
      },
    ];

    service.rollupSummarySchedules(schedules);

    expect(schedules[0].percentComplete).toBe(1);
  });

  it('includes milestones in summary date rollups without progress weight', () => {
    const schedules = [
      {
        parentTaskId: null,
        task: {},
        taskId: 'summary',
        taskKind: TaskKind.Summary,
      },
      {
        durationDays: 0,
        parentTaskId: 'summary',
        percentComplete: 100,
        plannedEndDate: '2026-07-01',
        plannedStartDate: '2026-07-01',
        taskId: 'release-milestone',
        taskKind: TaskKind.Milestone,
      },
      {
        durationDays: 4,
        parentTaskId: 'summary',
        percentComplete: 50,
        plannedEndDate: '2026-07-10',
        plannedStartDate: '2026-07-06',
        taskId: 'execution-task',
        taskKind: TaskKind.Standard,
      },
    ];

    service.rollupSummarySchedules(schedules);

    expect(schedules[0]).toEqual(
      expect.objectContaining({
        durationDays: 9,
        percentComplete: 50,
        plannedEndDate: '2026-07-10',
        plannedStartDate: '2026-07-01',
      }),
    );
  });

  it('ignores missing descendant dates when deriving summary dates', () => {
    const schedules = [
      {
        parentTaskId: null,
        task: {},
        taskId: 'summary',
        taskKind: TaskKind.Summary,
      },
      {
        durationDays: null,
        parentTaskId: 'summary',
        percentComplete: 100,
        plannedEndDate: null,
        plannedStartDate: null,
        taskId: 'undated-task',
        taskKind: TaskKind.Standard,
      },
      {
        durationDays: 3,
        parentTaskId: 'summary',
        percentComplete: 50,
        plannedEndDate: '2026-07-04',
        plannedStartDate: '2026-07-01',
        taskId: 'dated-task',
        taskKind: TaskKind.Standard,
      },
    ];

    service.rollupSummarySchedules(schedules);

    expect(schedules[0]).toEqual(
      expect.objectContaining({
        durationDays: 3,
        plannedEndDate: '2026-07-04',
        plannedStartDate: '2026-07-01',
      }),
    );
  });

  it('leaves empty summaries unchanged', () => {
    const schedules = [
      {
        durationDays: 2,
        parentTaskId: null,
        percentComplete: 10,
        plannedEndDate: '2026-07-03',
        plannedStartDate: '2026-07-01',
        task: {
          percentComplete: 10,
          plannedEndDate: '2026-07-03',
          plannedStartDate: '2026-07-01',
          status: TaskStatus.Todo,
        },
        taskId: 'summary',
        taskKind: TaskKind.Summary,
      },
    ];

    const result = service.rollupSummarySchedules(schedules);

    expect(result.changedSummaries).toEqual([]);
    expect(schedules[0]).toEqual(
      expect.objectContaining({
        durationDays: 2,
        percentComplete: 10,
        plannedEndDate: '2026-07-03',
        plannedStartDate: '2026-07-01',
      }),
    );
  });
});
