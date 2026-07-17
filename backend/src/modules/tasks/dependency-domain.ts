import { TaskDependencyType } from '../../common/enums/task-dependency-type.enum';
import { TaskKind } from '../../common/enums/task-kind.enum';
import { TaskStatus } from '../../common/enums/task-status.enum';

export enum DependencyHealth {
  Satisfied = 'satisfied',
  Blocking = 'blocking',
  AtRisk = 'at_risk',
  Invalid = 'invalid',
  Unknown = 'unknown',
}

export enum DependencyBlockedState {
  Blocked = 'blocked',
  NotBlocked = 'not_blocked',
  Unknown = 'unknown',
}

export type DependencyEndpointSnapshot = Readonly<{
  actualEndDate?: string | null;
  actualStartDate?: string | null;
  deleted?: boolean;
  id: string;
  plannedEndDate?: string | null;
  plannedStartDate?: string | null;
  sequenceNumber?: number | null;
  status: TaskStatus;
  taskKind?: TaskKind | null;
}>;

export type DependencyHealthInput = Readonly<{
  dependencyType: TaskDependencyType;
  lagDays?: number;
  predecessor: DependencyEndpointSnapshot | null;
  successor: DependencyEndpointSnapshot | null;
}>;

export type DependencyHealthEvaluation = Readonly<{
  health: DependencyHealth;
  reason:
    | 'constraint_met'
    | 'constraint_unmet'
    | 'planned_constraint_missed'
    | 'completed_successor'
    | 'legacy_start_to_finish'
    | 'offset_not_evaluated'
    | 'missing_endpoint'
    | 'deleted_endpoint'
    | 'summary_endpoint'
    | 'self_dependency';
}>;

export type DependencyBlockedEvaluation = Readonly<{
  blockingDependencyIds: readonly string[];
  state: DependencyBlockedState;
  unresolvedDependencyIds: readonly string[];
}>;

export type DependencyTraversalPolicy = Readonly<{
  maxDepth: number;
  maxTasks: number;
}>;

export type DependencyTraversalEdge = Readonly<{
  dependencyId: string;
  predecessorTaskId: string;
  successorTaskId: string;
}>;

export type DependencyTraversalNode = Readonly<{
  depth: number;
  taskId: string;
}>;

export type DependencyTraversalResult = Readonly<{
  impactedTaskIds: readonly string[];
  nodes: readonly DependencyTraversalNode[];
  rootTaskId: string;
  traversedDependencyIds: readonly string[];
  truncated: boolean;
}>;

export enum DependencyImpactLevel {
  None = 'none',
  Low = 'low',
  Medium = 'medium',
  High = 'high',
}

export type DependencyImpact = Readonly<{
  directTaskCount: number;
  impactedTaskCount: number;
  level: DependencyImpactLevel;
  maxDepthReached: number;
  traversal: DependencyTraversalResult;
}>;

export type DependencyEndpointProjection = Readonly<{
  id: string;
  projectId: string;
  sequenceNumber: number | null;
  status: TaskStatus;
  taskKind: TaskKind | null;
  title: string;
}>;

export type DependencyProjection = Readonly<{
  blockedState: DependencyBlockedState;
  dependencyId: string;
  dependencyType: TaskDependencyType;
  health: DependencyHealth;
  healthReason: DependencyHealthEvaluation['reason'];
  impact: DependencyImpact;
  lagDays: number;
  predecessor: DependencyEndpointProjection;
  successor: DependencyEndpointProjection;
}>;

export type DependencyHealthRecord = Readonly<{
  dependencyId: string;
  health: DependencyHealth;
}>;
