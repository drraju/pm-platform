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
  @ApiProperty({ format: 'uuid', type: String })
  id: string;

  @ApiProperty({ format: 'uuid', type: String })
  projectId: string;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  parentTaskId: string | null;

  @ApiProperty({ type: String })
  title: string;

  @ApiProperty({ type: String })
  taskKind: string;

  @ApiProperty({ nullable: true, type: String })
  milestoneCategory: string | null;

  @ApiProperty({ type: String })
  status: string;

  @ApiProperty({ type: String })
  priority: string;

  @ApiProperty({ type: 'integer' })
  percentComplete: number;

  @ApiProperty({ nullable: true, type: 'integer' })
  sequenceNumber: number | null;

  @ApiProperty({ format: 'date', nullable: true, type: String })
  startDate: string | null;

  @ApiProperty({ format: 'date', nullable: true, type: String })
  dueDate: string | null;

  @ApiProperty({ format: 'date', nullable: true, type: String })
  plannedStartDate: string | null;

  @ApiProperty({ format: 'date', nullable: true, type: String })
  plannedEndDate: string | null;

  @ApiProperty({ format: 'date', nullable: true, type: String })
  actualStartDate: string | null;

  @ApiProperty({ format: 'date', nullable: true, type: String })
  actualEndDate: string | null;

  @ApiProperty({ nullable: true, type: Number })
  estimatedHours: number | null;

  @ApiProperty({ nullable: true, type: Number })
  remainingHours: number | null;

  @ApiProperty({ format: 'date-time', type: String })
  createdAt: string;

  @ApiProperty({ format: 'date-time', type: String })
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
