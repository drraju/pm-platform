import { Injectable } from '@nestjs/common';
import {
  OpenIssuesByPriorityDto,
  OpenRisksBySeverityDto,
} from '../portfolio/dto/portfolio-summary.dto';
import { PortfolioService } from '../portfolio/portfolio.service';
import { ExecutiveSummaryDto } from './dto/executive-summary.dto';

type CountSummary = OpenRisksBySeverityDto | OpenIssuesByPriorityDto;

@Injectable()
export class ExecutiveService {
  constructor(private readonly portfolioService: PortfolioService) {}

  async getSummary(): Promise<ExecutiveSummaryDto> {
    const portfolioSummary = await this.portfolioService.getSummary();

    return {
      portfolioHealth: {
        totalProjects: portfolioSummary.totalProjects,
        greenProjects: portfolioSummary.greenProjects,
        amberProjects: portfolioSummary.amberProjects,
        redProjects: portfolioSummary.redProjects,
      },
      delivery: {
        overdueTasks: portfolioSummary.overdueTasks.total,
        upcomingMilestones: portfolioSummary.upcomingMilestones.length,
      },
      governance: {
        openRisks: this.sumCounts(portfolioSummary.openRisksBySeverity),
        openIssues: this.sumCounts(portfolioSummary.openIssuesByPriority),
      },
      projectsRequiringAttention: portfolioSummary.projectsRequiringAttention,
    };
  }

  private sumCounts(counts: CountSummary): number {
    return counts.critical + counts.high + counts.medium + counts.low;
  }
}
