import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulingFoundationService } from '../../common/scheduling/scheduling-foundation.service';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { ProjectsModule } from '../projects/projects.module';
import { PlanningScheduleSnapshot } from '../planning/entities/planning-schedule-snapshot.entity';
import { ProjectBaseline } from '../projects/entities/project-baseline.entity';
import { TaskDependency } from './entities/task-dependency.entity';
import { Task } from './entities/task.entity';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { MilestoneProjectionComposer } from './milestone-projection.composer';
import { MilestoneQueryService } from './milestone-query.service';
import { MilestoneResponseMapper } from './milestone-response.mapper';
import { DependencyHealthEvaluator } from './dependency-health.evaluator';
import { DependencyImpactAnalyzer } from './dependency-impact.analyzer';
import { DependencyOrderingPolicy } from './dependency-ordering.policy';
import { DependencyProjectionComposer } from './dependency-projection.composer';
import { DependencyQueryService } from './dependency-query.service';
import {
  DependenciesController,
  ProjectDependenciesController,
} from './dependencies.controller';
import { DependencyResponseMapper } from './dependency-response.mapper';

@Module({
  imports: [
    forwardRef(() => ProjectsModule),
    TypeOrmModule.forFeature([
      Task,
      TaskDependency,
      ProjectMember,
      PlanningScheduleSnapshot,
      ProjectBaseline,
    ]),
  ],
  controllers: [
    DependenciesController,
    ProjectDependenciesController,
    TasksController,
  ],
  providers: [
    DependencyHealthEvaluator,
    DependencyImpactAnalyzer,
    DependencyOrderingPolicy,
    DependencyProjectionComposer,
    DependencyQueryService,
    DependencyResponseMapper,
    SchedulingFoundationService,
    MilestoneProjectionComposer,
    MilestoneQueryService,
    MilestoneResponseMapper,
    TasksService,
  ],
  exports: [
    DependencyProjectionComposer,
    DependencyQueryService,
    DependencyResponseMapper,
    MilestoneProjectionComposer,
    MilestoneQueryService,
    MilestoneResponseMapper,
    TasksService,
  ],
})
export class TasksModule {}
