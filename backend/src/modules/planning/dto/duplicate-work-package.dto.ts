import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PlanningWorkspaceDto } from './planning-workspace.dto';

export class DuplicateWorkPackageDto {
  @ApiProperty({ example: 'Dynatrace Integration - Wave 2' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  newSummaryName: string;

  @ApiProperty({ default: true, required: false })
  @IsBoolean()
  @IsOptional()
  copyChildTasks?: boolean = true;

  @ApiProperty({ default: true, required: false })
  @IsBoolean()
  @IsOptional()
  preserveWbsHierarchy?: boolean = true;

  @ApiProperty({ default: true, required: false })
  @IsBoolean()
  @IsOptional()
  preserveTaskDurations?: boolean = true;

  @ApiProperty({ default: true, required: false })
  @IsBoolean()
  @IsOptional()
  preserveEstimatedEffort?: boolean = true;

  @ApiProperty({ default: true, required: false })
  @IsBoolean()
  @IsOptional()
  preserveInternalPredecessors?: boolean = true;

  @ApiProperty({ default: true, required: false })
  @IsBoolean()
  @IsOptional()
  preserveMilestones?: boolean = true;

  @ApiProperty({ default: true, required: false })
  @IsBoolean()
  @IsOptional()
  preserveNotes?: boolean = true;

  @ApiProperty({ default: true, required: false })
  @IsBoolean()
  @IsOptional()
  preserveChecklists?: boolean = true;

  @ApiProperty({ default: false, required: false })
  @IsBoolean()
  @IsOptional()
  copyResourceAssignments?: boolean = false;

  @ApiProperty({ default: false, required: false })
  @IsBoolean()
  @IsOptional()
  copyPlannedDates?: boolean = false;

  @ApiProperty({ default: false, required: false })
  @IsBoolean()
  @IsOptional()
  copyActualDates?: boolean = false;

  @ApiProperty({ default: false, required: false })
  @IsBoolean()
  @IsOptional()
  copyComments?: boolean = false;

  @ApiProperty({ default: false, required: false })
  @IsBoolean()
  @IsOptional()
  copyAttachments?: boolean = false;
}

export class DuplicateWorkPackageResultDto {
  @ApiProperty({ format: 'uuid' })
  newSummaryTaskId: string;

  @ApiProperty({ format: 'uuid', isArray: true })
  copiedTaskIds: string[];

  @ApiProperty({ type: PlanningWorkspaceDto })
  workspace: PlanningWorkspaceDto;
}
