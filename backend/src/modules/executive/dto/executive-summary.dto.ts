import { ApiProperty } from '@nestjs/swagger';
import { PortfolioProjectAttentionDto } from '../../portfolio/dto/portfolio-summary.dto';

export class ExecutivePortfolioHealthDto {
  @ApiProperty({ example: 12 })
  totalProjects: number;

  @ApiProperty({ example: 7 })
  greenProjects: number;

  @ApiProperty({ example: 3 })
  amberProjects: number;

  @ApiProperty({ example: 2 })
  redProjects: number;
}

export class ExecutiveDeliveryDto {
  @ApiProperty({ example: 12 })
  overdueTasks: number;

  @ApiProperty({ example: 10 })
  upcomingMilestones: number;
}

export class ExecutiveGovernanceDto {
  @ApiProperty({ example: 8 })
  openRisks: number;

  @ApiProperty({ example: 5 })
  openIssues: number;
}

export class ExecutiveSummaryDto {
  @ApiProperty({ type: ExecutivePortfolioHealthDto })
  portfolioHealth: ExecutivePortfolioHealthDto;

  @ApiProperty({ type: ExecutiveDeliveryDto })
  delivery: ExecutiveDeliveryDto;

  @ApiProperty({ type: ExecutiveGovernanceDto })
  governance: ExecutiveGovernanceDto;

  @ApiProperty({ type: PortfolioProjectAttentionDto, isArray: true })
  projectsRequiringAttention: PortfolioProjectAttentionDto[];
}
