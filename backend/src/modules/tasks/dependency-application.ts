import { TaskDependencyType } from '../../common/enums/task-dependency-type.enum';
import { TaskKind } from '../../common/enums/task-kind.enum';
import { TaskStatus } from '../../common/enums/task-status.enum';
import {
  DependencyHealth,
  DependencyProjection,
  DependencyTraversalPolicy,
} from './dependency-domain';

export type DependencyProjectionEndpointSource = Readonly<{
  actualEndDate?: string | null;
  actualStartDate?: string | null;
  deletedAt?: Date | null;
  id: string;
  plannedEndDate?: string | null;
  plannedStartDate?: string | null;
  projectId: string;
  sequenceNumber?: number | null;
  status: TaskStatus;
  taskKind?: TaskKind | null;
  title: string;
}>;

export type DependencyProjectionSource = Readonly<{
  dependencyId: string;
  dependencyType: TaskDependencyType;
  lagDays: number;
  predecessor: DependencyProjectionEndpointSource;
  successor: DependencyProjectionEndpointSource;
}>;

export type DependencyProjectionCompositionInput = Readonly<{
  dependencies: readonly DependencyProjectionSource[];
  traversalPolicy?: DependencyTraversalPolicy;
}>;

export type DependencySortField =
  | 'predecessor'
  | 'successor'
  | 'health'
  | 'impact'
  | 'dependencyType';

export type DependencyQuery = Readonly<{
  blocked?: boolean;
  dependencyIds?: readonly string[];
  dependencyTypes?: readonly TaskDependencyType[];
  health?: readonly DependencyHealth[];
  page?: number;
  pageSize?: number;
  projectIds?: readonly string[];
  search?: string;
  sortBy?: DependencySortField;
  sortDirection?: 'asc' | 'desc';
  taskIds?: readonly string[];
  traversalPolicy?: DependencyTraversalPolicy;
}>;

export type DependencyProjectionPage = Readonly<{
  items: readonly DependencyProjection[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}>;
