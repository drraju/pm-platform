import { PlanningCalculationStatus } from '../../common/enums/planning-calculation-status.enum';
import { MilestoneCategory } from '../../common/enums/milestone-category.enum';
import { TaskStatus } from '../../common/enums/task-status.enum';

export type MilestoneState =
  | 'unscheduled'
  | 'upcoming'
  | 'overdue'
  | 'completed'
  | 'cancelled';

export type MilestoneOwnerProjection = {
  id: string;
  name: string;
} | null;

export type MilestoneProjection = {
  actualDate: string | null;
  baselineDate: string | null;
  calculatedAt: Date | null;
  calculationStatus: PlanningCalculationStatus;
  category: MilestoneCategory;
  critical: boolean;
  daysRemaining: number | null;
  forecastDate: string | null;
  id: string;
  overdue: boolean;
  owner: MilestoneOwnerProjection;
  plannedDate: string | null;
  projectId: string;
  state: MilestoneState;
  taskId: string;
  taskStatus: TaskStatus;
  title: string;
  varianceDays: number | null;
};

export type MilestoneProjectionPage = {
  items: MilestoneProjection[];
  page: number;
  pageSize: number;
  total: number;
};
