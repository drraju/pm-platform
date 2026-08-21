import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulingFoundationService } from '../../common/scheduling/scheduling-foundation.service';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { ProjectsModule } from '../projects/projects.module';
import { PlanningSnapshotModule } from '../planning/planning-snapshot.module';
import { ProjectBaseline } from '../projects/entities/project-baseline.entity';
import { TaskDependency } from './entities/task-dependency.entity';
import { TaskExecutionUpdate } from './entities/task-execution-update.entity';
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
    PlanningSnapshotModule,
    TypeOrmModule.forFeature([
      Task,
      TaskDependency,
      TaskExecutionUpdate,
      ProjectMember,
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
