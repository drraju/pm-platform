import { ApiProperty } from '@nestjs/swagger';
import { externalTimestamp } from './external-timestamp';

export type ExternalTaskSource = {
  actualEndDate?: string | null;
  actualStartDate?: string | null;
  createdAt: Date | string;
  dueDate?: string | null;
  estimatedHours?: number | string | null;
  id: string;
  milestoneCategory?: string | null;
  parentTaskId?: string | null;
  percentComplete: number;
  plannedEndDate?: string | null;
  plannedStartDate?: string | null;
  priority: string;
  projectId: string;
  remainingHours?: number | string | null;
  sequenceNumber?: number | null;
  startDate?: string | null;
  status: string;
  taskKind: string;
  title: string;
  updatedAt: Date | string;
};

export class ExternalTaskDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  projectId: string;

  @ApiProperty({ nullable: true })
  parentTaskId: string | null;

  @ApiProperty()
  title: string;

  @ApiProperty()
  taskKind: string;

  @ApiProperty({ nullable: true })
  milestoneCategory: string | null;

  @ApiProperty()
  status: string;

  @ApiProperty()
  priority: string;

  @ApiProperty()
  percentComplete: number;

  @ApiProperty({ nullable: true })
  sequenceNumber: number | null;

  @ApiProperty({ nullable: true })
  startDate: string | null;

  @ApiProperty({ nullable: true })
  dueDate: string | null;

  @ApiProperty({ nullable: true })
  plannedStartDate: string | null;

  @ApiProperty({ nullable: true })
  plannedEndDate: string | null;

  @ApiProperty({ nullable: true })
  actualStartDate: string | null;

  @ApiProperty({ nullable: true })
  actualEndDate: string | null;

  @ApiProperty({ nullable: true })
  estimatedHours: number | null;

  @ApiProperty({ nullable: true })
  remainingHours: number | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt: string;
}

export function toExternalTaskDto(source: ExternalTaskSource): ExternalTaskDto {
  return {
    actualEndDate: source.actualEndDate ?? null,
    actualStartDate: source.actualStartDate ?? null,
    createdAt: externalTimestamp(source.createdAt),
    dueDate: source.dueDate ?? null,
    estimatedHours: externalNullableNumber(source.estimatedHours),
    id: source.id,
    milestoneCategory: source.milestoneCategory ?? null,
    parentTaskId: source.parentTaskId ?? null,
    percentComplete: source.percentComplete,
    plannedEndDate: source.plannedEndDate ?? null,
    plannedStartDate: source.plannedStartDate ?? null,
    priority: source.priority,
    projectId: source.projectId,
    remainingHours: externalNullableNumber(source.remainingHours),
    sequenceNumber: source.sequenceNumber ?? null,
    startDate: source.startDate ?? null,
    status: source.status,
    taskKind: source.taskKind,
    title: source.title,
    updatedAt: externalTimestamp(source.updatedAt),
  };
}

function externalNullableNumber(value?: number | string | null): number | null {
  return value == null ? null : Number(value);
}
