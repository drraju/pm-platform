import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MilestoneCategory } from '../../../common/enums/milestone-category.enum';
import { PlanningCalculationStatus } from '../../../common/enums/planning-calculation-status.enum';
import { MilestoneApiState } from './milestone-query.dto';

export class MilestoneOwnerResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Ada Lovelace' })
  name: string;
}

export class MilestoneResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  taskId: string;

  @ApiProperty({ format: 'uuid' })
  projectId: string;

  @ApiProperty({ example: 'Production go-live' })
  title: string;

  @ApiProperty({ enum: MilestoneCategory })
  category: MilestoneCategory;

  @ApiPropertyOptional({ type: MilestoneOwnerResponseDto, nullable: true })
  owner: MilestoneOwnerResponseDto | null;

  @ApiPropertyOptional({ format: 'date', nullable: true })
  plannedDate: string | null;

  @ApiPropertyOptional({ format: 'date', nullable: true })
  forecastDate: string | null;

  @ApiPropertyOptional({ format: 'date', nullable: true })
  actualDate: string | null;

  @ApiPropertyOptional({ format: 'date', nullable: true })
  baselineDate: string | null;

  @ApiPropertyOptional({ nullable: true })
  varianceDays: number | null;

  @ApiProperty()
  critical: boolean;

  @ApiProperty({ enum: MilestoneApiState })
  state: MilestoneApiState;

  @ApiProperty()
  overdue: boolean;

  @ApiPropertyOptional({ nullable: true })
  daysRemaining: number | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  calculatedAt: string | null;

  @ApiProperty({ enum: PlanningCalculationStatus })
  calculationStatus: PlanningCalculationStatus;
}

export class MilestonePaginationDto {
  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  totalPages: number;
}

export class MilestoneListResponseDto extends MilestonePaginationDto {
  @ApiProperty({ type: MilestoneResponseDto, isArray: true })
  items: MilestoneResponseDto[];
}
