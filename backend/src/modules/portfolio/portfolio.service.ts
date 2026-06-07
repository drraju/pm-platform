import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectHealthStatus } from '../health/dto/project-health.dto';
import { ProjectHealthService } from '../health/project-health.service';
import { Project } from '../projects/entities/project.entity';
import { Risk } from '../raid/entities/risk.entity';
import {
  OpenRisksBySeverityDto,
  PortfolioProjectAttentionDto,
  PortfolioSummaryDto,
} from './dto/portfolio-summary.dto';

@Injectable()
export class PortfolioService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(Risk)
    private readonly risksRepository: Repository<Risk>,
    private readonly projectHealthService: ProjectHealthService,
  ) {}

  async getSummary(): Promise<PortfolioSummaryDto> {
    const [projects, risks] = await Promise.all([
      this.projectsRepository.find({
        relations: { issues: true, risks: true, tasks: true },
      }),
      this.risksRepository.find(),
    ]);

    const summary = projects.reduce<PortfolioSummaryDto>(
      (summary, project) => {
        const health = this.projectHealthService.calculate({
          issues: project.issues,
          risks: project.risks,
          tasks: project.tasks,
        });

        if (health.status === ProjectHealthStatus.Red) {
          summary.redProjects += 1;
          summary.projectsRequiringAttention.push(
            this.toProjectAttention(project, health.status, health.reasons),
          );
        } else if (health.status === ProjectHealthStatus.Amber) {
          summary.amberProjects += 1;
          summary.projectsRequiringAttention.push(
            this.toProjectAttention(project, health.status, health.reasons),
          );
        } else {
          summary.greenProjects += 1;
        }

        return summary;
      },
      {
        totalProjects: projects.length,
        greenProjects: 0,
        amberProjects: 0,
        redProjects: 0,
        projectsRequiringAttention: [],
        openRisksBySeverity: this.emptyOpenRisksBySeverity(),
      },
    );

    summary.openRisksBySeverity = this.countOpenRisksBySeverity(risks);

    return summary;
  }

  private toProjectAttention(
    project: Project,
    healthStatus: ProjectHealthStatus,
    reasons: string[],
  ): PortfolioProjectAttentionDto {
    return {
      id: project.id,
      name: project.name,
      healthStatus,
      reasons,
    };
  }

  private countOpenRisksBySeverity(risks: Risk[]): OpenRisksBySeverityDto {
    return risks.reduce<OpenRisksBySeverityDto>((counts, risk) => {
      if (!this.isOpen(risk.status)) {
        return counts;
      }

      const severity = risk.impact?.toLowerCase();
      if (severity === 'critical') {
        counts.critical += 1;
      } else if (severity === 'high') {
        counts.high += 1;
      } else if (severity === 'low') {
        counts.low += 1;
      } else {
        counts.medium += 1;
      }

      return counts;
    }, this.emptyOpenRisksBySeverity());
  }

  private emptyOpenRisksBySeverity(): OpenRisksBySeverityDto {
    return {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };
  }

  private isOpen(status?: string | null): boolean {
    if (!status) {
      return true;
    }

    return !['cancelled', 'closed', 'complete', 'completed', 'done', 'resolved'].includes(
      status.toLowerCase(),
    );
  }
}
