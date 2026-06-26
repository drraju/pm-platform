import { ApiProperty } from '@nestjs/swagger';
import { PlanningCalculationStatus } from '../../../common/enums/planning-calculation-status.enum';

export class CriticalPathDto {
  @ApiProperty({ format: 'uuid' })
  projectId: string;

  @ApiProperty({ enum: PlanningCalculationStatus })
  calculationStatus: PlanningCalculationStatus;

  @ApiProperty({ type: String, isArray: true })
  taskIds: string[];
}
