import { readFileSync } from 'fs';
import { join } from 'path';

type TaskKind = 'standard' | 'summary' | 'milestone';

type TaskRecord = {
  id: string;
  taskKind: TaskKind;
};

type TaskDependencyRecord = {
  id: string;
  predecessorTaskId: string;
  successorTaskId: string;
};

const migrationPath = join(
  __dirname,
  '..',
  'migrations',
  '015_v1_1_1_legacy_summary_dependency_repair.sql',
);

describe('legacy summary dependency repair migration', () => {
  it('removes dependencies when either endpoint is a summary task', () => {
    const result = applyLegacySummaryDependencyRepair(
      [
        task('summary-1', 'summary'),
        task('summary-2', 'summary'),
        task('task-1', 'standard'),
        task('task-2', 'standard'),
      ],
      [
        dependency('dep-summary-predecessor', 'summary-1', 'task-1'),
        dependency('dep-summary-successor', 'task-2', 'summary-2'),
        dependency('dep-valid', 'task-1', 'task-2'),
      ],
    );

    expect(result.removedCount).toBe(2);
    expect(result.dependencies).toEqual([
      dependency('dep-valid', 'task-1', 'task-2'),
    ]);
  });

  it('keeps task-to-task dependencies intact', () => {
    const result = applyLegacySummaryDependencyRepair(
      [task('task-1', 'standard'), task('task-2', 'standard')],
      [dependency('dep-task-task', 'task-1', 'task-2')],
    );

    expect(result.removedCount).toBe(0);
    expect(result.dependencies).toEqual([
      dependency('dep-task-task', 'task-1', 'task-2'),
    ]);
  });

  it('keeps task-to-milestone dependencies intact', () => {
    const result = applyLegacySummaryDependencyRepair(
      [task('task-1', 'standard'), task('milestone-1', 'milestone')],
      [dependency('dep-task-milestone', 'task-1', 'milestone-1')],
    );

    expect(result.removedCount).toBe(0);
    expect(result.dependencies).toEqual([
      dependency('dep-task-milestone', 'task-1', 'milestone-1'),
    ]);
  });

  it('keeps milestone-to-task dependencies intact', () => {
    const result = applyLegacySummaryDependencyRepair(
      [task('milestone-1', 'milestone'), task('task-1', 'standard')],
      [dependency('dep-milestone-task', 'milestone-1', 'task-1')],
    );

    expect(result.removedCount).toBe(0);
    expect(result.dependencies).toEqual([
      dependency('dep-milestone-task', 'milestone-1', 'task-1'),
    ]);
  });

  it('is safe to execute twice', () => {
    const tasks = [
      task('summary-1', 'summary'),
      task('task-1', 'standard'),
      task('milestone-1', 'milestone'),
    ];
    const initialDependencies = [
      dependency('dep-legacy', 'summary-1', 'task-1'),
      dependency('dep-valid', 'task-1', 'milestone-1'),
    ];

    const firstRun = applyLegacySummaryDependencyRepair(
      tasks,
      initialDependencies,
    );
    const secondRun = applyLegacySummaryDependencyRepair(
      tasks,
      firstRun.dependencies,
    );

    expect(firstRun.removedCount).toBe(1);
    expect(firstRun.dependencies).toEqual([
      dependency('dep-valid', 'task-1', 'milestone-1'),
    ]);
    expect(secondRun.removedCount).toBe(0);
    expect(secondRun.dependencies).toEqual(firstRun.dependencies);
  });

  it('logs the removal count and scopes deletion to legacy summary endpoints', () => {
    const migrationSql = readFileSync(migrationPath, 'utf8');

    expect(migrationSql).toContain('DELETE FROM task_dependencies');
    expect(migrationSql).toContain("predecessor_task.task_kind = 'summary'");
    expect(migrationSql).toContain("successor_task.task_kind = 'summary'");
    expect(migrationSql).toContain(
      "RAISE NOTICE 'Removed % legacy dependencies referencing Summary tasks.', removed_count;",
    );
  });
});

function applyLegacySummaryDependencyRepair(
  tasks: TaskRecord[],
  dependencies: TaskDependencyRecord[],
) {
  const taskKindById = new Map(
    tasks.map((taskRecord) => [taskRecord.id, taskRecord.taskKind]),
  );
  const remainingDependencies = dependencies.filter((taskDependency) => {
    const predecessorTaskKind = taskKindById.get(
      taskDependency.predecessorTaskId,
    );
    const successorTaskKind = taskKindById.get(taskDependency.successorTaskId);

    return predecessorTaskKind !== 'summary' && successorTaskKind !== 'summary';
  });

  return {
    dependencies: remainingDependencies,
    removedCount: dependencies.length - remainingDependencies.length,
  };
}

function task(id: string, taskKind: TaskKind): TaskRecord {
  return { id, taskKind };
}

function dependency(
  id: string,
  predecessorTaskId: string,
  successorTaskId: string,
): TaskDependencyRecord {
  return { id, predecessorTaskId, successorTaskId };
}
