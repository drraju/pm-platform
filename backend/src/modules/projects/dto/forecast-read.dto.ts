import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MilestoneCategory } from '../../../common/enums/milestone-category.enum';
import { PlanningCalculationStatus } from '../../../common/enums/planning-calculation-status.enum';
import { TaskKind } from '../../../common/enums/task-kind.enum';

export enum WorkingOutputState {
  NotRequested = 'not_requested',
}

export class ForecastUserSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;
}

export class BaselineSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  projectId: string;

  @ApiProperty()
  versionNumber: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  isCurrent: boolean;

  @ApiProperty({ format: 'date-time' })
  capturedAt: string;

  @ApiPropertyOptional({ type: ForecastUserSummaryDto, nullable: true })
  capturedBy: ForecastUserSummaryDto | null;

  @ApiPropertyOptional({ format: 'date', nullable: true })
  projectStartDate: string | null;

  @ApiPropertyOptional({ format: 'date', nullable: true })
  projectFinishDate: string | null;

  @ApiProperty()
  taskCount: number;

  @ApiProperty()
  milestoneCount: number;

  @ApiProperty()
  unscheduledExecutableTaskCount: number;
}

export class ForecastSummaryDto {
  @ApiProperty({ format: 'uuid' })
  snapshotId: string;

  @ApiProperty({ format: 'uuid' })
  projectId: string;

  @ApiProperty()
  scheduleVersion: number;

  @ApiProperty({ enum: PlanningCalculationStatus })
  calculationStatus: PlanningCalculationStatus;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  calculatedAt: string | null;

  @ApiPropertyOptional({ type: ForecastUserSummaryDto, nullable: true })
  generatedBy: ForecastUserSummaryDto | null;

  @ApiPropertyOptional({ format: 'date', nullable: true })
  scheduleAnchorDate: string | null;

  @ApiPropertyOptional({ format: 'date', nullable: true })
  projectStartDate: string | null;

  @ApiPropertyOptional({ format: 'date', nullable: true })
  projectFinishDate: string | null;

  @ApiProperty()
  taskCount: number;

  @ApiProperty()
  milestoneCount: number;

  @ApiProperty()
  criticalTaskCount: number;

  @ApiProperty()
  unscheduledExecutableTaskCount: number;

  @ApiProperty()
  isCurrent: boolean;
}

export class ForecastAvailabilityDto {
  @ApiProperty()
  activeBaseline: boolean;

  @ApiProperty()
  originalBaseline: boolean;

  @ApiProperty()
  currentForecast: boolean;

  @ApiProperty()
  previousForecast: boolean;
}

export class ForecastOverviewDto {
  @ApiProperty({ format: 'uuid' })
  projectId: string;

  @ApiPropertyOptional({ type: BaselineSummaryDto, nullable: true })
  activeBaseline: BaselineSummaryDto | null;

  @ApiPropertyOptional({ type: BaselineSummaryDto, nullable: true })
  originalBaseline: BaselineSummaryDto | null;

  @ApiPropertyOptional({ type: ForecastSummaryDto, nullable: true })
  currentForecast: ForecastSummaryDto | null;

  @ApiPropertyOptional({ type: ForecastSummaryDto, nullable: true })
  previousForecast: ForecastSummaryDto | null;

  @ApiPropertyOptional({ nullable: true })
  finishVarianceFromPreviousDays: number | null;

  @ApiPropertyOptional({ nullable: true })
  finishVarianceFromCurrentActiveBaselineDays: number | null;

  @ApiProperty({ type: ForecastAvailabilityDto })
  availability: ForecastAvailabilityDto;

  @ApiProperty({ enum: WorkingOutputState })
  workingOutputState: WorkingOutputState;

  @ApiProperty({ type: String, isArray: true })
  warnings: string[];
}

export class ForecastHistoryItemDto {
  @ApiProperty({ format: 'uuid' })
  snapshotId: string;

  @ApiProperty()
  scheduleVersion: number;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  calculatedAt: string | null;

  @ApiPropertyOptional({ type: ForecastUserSummaryDto, nullable: true })
  generatedBy: ForecastUserSummaryDto | null;

  @ApiPropertyOptional({ format: 'date', nullable: true })
  projectStartDate: string | null;

  @ApiPropertyOptional({ format: 'date', nullable: true })
  projectFinishDate: string | null;

  @ApiProperty()
  taskCount: number;

  @ApiProperty()
  milestoneCount: number;

  @ApiProperty()
  criticalTaskCount: number;

  @ApiProperty()
  unscheduledExecutableTaskCount: number;

  @ApiProperty()
  isCurrent: boolean;

  @ApiPropertyOptional({ nullable: true })
  finishVarianceFromPreviousDays: number | null;

  @ApiPropertyOptional({ nullable: true })
  finishVarianceFromCurrentActiveBaselineDays: number | null;
}

export class ForecastHistoryResponseDto {
  @ApiProperty({ type: ForecastHistoryItemDto, isArray: true })
  items: ForecastHistoryItemDto[];

  @ApiPropertyOptional({ nullable: true })
  nextCursor: number | null;

  @ApiProperty()
  hasMore: boolean;
}

export class ForecastSnapshotTaskScheduleDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  taskId: string | null;

  @ApiProperty()
  taskTitle: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  parentTaskId: string | null;

  @ApiProperty({ enum: TaskKind })
  taskKind: TaskKind;

  @ApiPropertyOptional({ enum: MilestoneCategory, nullable: true })
  milestoneCategory: MilestoneCategory | null;

  @ApiPropertyOptional({ format: 'date', nullable: true })
  scheduledStartDate: string | null;

  @ApiPropertyOptional({ format: 'date', nullable: true })
  scheduledEndDate: string | null;

  @ApiPropertyOptional({ nullable: true })
  durationDays: number | null;

  @ApiProperty()
  isCritical: boolean;

  @ApiPropertyOptional({ nullable: true })
  sequenceNumber: number | null;
}

export class ForecastSnapshotDetailDto {
  @ApiProperty({ type: ForecastSummaryDto })
  snapshot: ForecastSummaryDto;

  @ApiProperty({ type: ForecastSnapshotTaskScheduleDto, isArray: true })
  taskSchedules: ForecastSnapshotTaskScheduleDto[];
}
