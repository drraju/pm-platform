import { MilestoneCategory } from '../../../common/enums/milestone-category.enum';
import { PlanningCalculationStatus } from '../../../common/enums/planning-calculation-status.enum';
import { TaskKind } from '../../../common/enums/task-kind.enum';
import { TaskStatus } from '../../../common/enums/task-status.enum';
import { PlanningScheduleSnapshot } from '../../planning/entities/planning-schedule-snapshot.entity';
import { PlanningTaskSchedule } from '../../planning/entities/planning-task-schedule.entity';
import { ProjectBaselineTask } from '../../projects/entities/project-baseline-task.entity';
import { User } from '../../users/entities/user.entity';
import { Task } from '../entities/task.entity';
import { MilestoneProjectionComposer } from '../milestone-projection.composer';

describe('MilestoneProjectionComposer', () => {
  const composer = new MilestoneProjectionComposer();
  const task = {
    actualEndDate: null,
    assignee: { firstName: 'Ada', id: 'owner-id', lastName: 'Lovelace' },
    dueDate: '2026-07-20',
    id: 'milestone-id',
    milestoneCategory: MilestoneCategory.Release,
    plannedEndDate: '2026-07-20',
    projectId: 'project-id',
    status: TaskStatus.InProgress,
    taskKind: TaskKind.Milestone,
    title: 'Release ready',
  } as Task;

  it('combines schedule, baseline, owner and calculation state', () => {
    const result = composer.compose(
      {
        baselineTask: {
          plannedEndDate: '2026-07-18',
        } as ProjectBaselineTask,
        schedule: {
          isCritical: true,
          scheduledEndDate: '2026-07-22',
        } as PlanningTaskSchedule,
        snapshot: {
          calculatedAt: new Date('2026-07-15T10:00:00Z'),
          calculationStatus: PlanningCalculationStatus.Calculated,
        } as PlanningScheduleSnapshot,
        task,
      },
      '2026-07-16',
    );

    expect(result).toEqual(
      expect.objectContaining({
        baselineDate: '2026-07-18',
        category: MilestoneCategory.Release,
        critical: true,
        daysRemaining: 6,
        forecastDate: '2026-07-22',
        overdue: false,
        owner: { id: 'owner-id', name: 'Ada Lovelace' },
        state: 'upcoming',
        varianceDays: 4,
      }),
    );
  });

  it('uses assignee email when optional profile names are absent', () => {
    const result = composer.compose({
      task: {
        ...task,
        assignee: {
          email: 'jit@example.com',
          firstName: null,
          id: 'jit-user',
          lastName: null,
        } as User,
      },
    });

    expect(result.owner).toEqual({
      id: 'jit-user',
      name: 'jit@example.com',
    });
  });

  it('derives overdue, completed and unscheduled states without persistence', () => {
    expect(
      composer.compose(
        {
          schedule: {
            scheduledEndDate: '2026-07-20',
          } as PlanningTaskSchedule,
          task,
        },
        '2026-07-21',
      ).state,
    ).toBe('overdue');
    expect(
      composer.compose(
        { task: { ...task, status: TaskStatus.Done } },
        '2026-07-21',
      ).state,
    ).toBe('completed');
    const unscheduled = composer.compose({ task });
    expect(unscheduled.state).toBe('unscheduled');
    expect(unscheduled.forecastDate).toBeNull();
  });
});
