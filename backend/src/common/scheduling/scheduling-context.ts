import { TaskDependencyType } from '../enums/task-dependency-type.enum';
import { TaskKind } from '../enums/task-kind.enum';

export type SchedulingContextTask = Readonly<{
  durationDays?: number | null;
  id?: string;
  parentTaskId?: string | null;
  taskId?: string;
  taskKind?: TaskKind | string | null;
}>;

export type SchedulingContextDependency = Readonly<{
  dependencyType: TaskDependencyType | string;
  id?: string;
  predecessorTaskId?: string | null;
  successorTaskId?: string | null;
}>;

export type SchedulingContext = Readonly<{
  dependencies?: readonly SchedulingContextDependency[];
  tasks: readonly SchedulingContextTask[];
}>;
