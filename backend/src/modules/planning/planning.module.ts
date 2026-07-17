import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthzModule } from '../../common/authz/authz.module';
import { SchedulingContextFactory } from '../../common/scheduling/scheduling-context.factory';
import { SchedulingFoundationService } from '../../common/scheduling/scheduling-foundation.service';
import { ProjectsModule } from '../projects/projects.module';
import { Project } from '../projects/entities/project.entity';
import { Task } from '../tasks/entities/task.entity';
import { TaskDependency } from '../tasks/entities/task-dependency.entity';
import { User } from '../users/entities/user.entity';
import { PlanningScheduleSnapshot } from './entities/planning-schedule-snapshot.entity';
import { PlanningTaskSchedule } from './entities/planning-task-schedule.entity';
import { PortfolioDependency } from './entities/portfolio-dependency.entity';
import { PlanningBackwardPassService } from './planning-backward-pass.service';
import { PlanningCriticalPathService } from './planning-critical-path.service';
import { PlanningFloatService } from './planning-float.service';
import { PlanningForwardPassService } from './planning-forward-pass.service';
import { PlanningGraphBuilderService } from './planning-graph-builder.service';
import { PlanningScheduleEngineService } from './planning-schedule-engine.service';
import { ResourceAllocation } from './entities/resource-allocation.entity';
import { ResourceCapacity } from './entities/resource-capacity.entity';
import { ResourceWorkloadSnapshot } from './entities/resource-workload-snapshot.entity';
import { PlanningController } from './planning.controller';
import { PlanningSnapshotModule } from './planning-snapshot.module';
import { PlanningService } from './planning.service';
import { PlanningWorkPackageDuplicationService } from './planning-work-package-duplication.service';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [
    AuthzModule,
    PlanningSnapshotModule,
    ProjectsModule,
    TasksModule,
    TypeOrmModule.forFeature([
      PlanningScheduleSnapshot,
      PlanningTaskSchedule,
      PortfolioDependency,
      ResourceAllocation,
      ResourceCapacity,
      ResourceWorkloadSnapshot,
      Project,
      Task,
      TaskDependency,
      User,
    ]),
  ],
  controllers: [PlanningController],
  providers: [
    SchedulingFoundationService,
    PlanningBackwardPassService,
    PlanningCriticalPathService,
    PlanningFloatService,
    PlanningForwardPassService,
    PlanningGraphBuilderService,
    PlanningScheduleEngineService,
    PlanningService,
    PlanningWorkPackageDuplicationService,
    SchedulingContextFactory,
  ],
  exports: [
    PlanningService,
    PlanningBackwardPassService,
    PlanningCriticalPathService,
    PlanningFloatService,
    PlanningForwardPassService,
    PlanningGraphBuilderService,
    PlanningScheduleEngineService,
  ],
})
export class PlanningModule {}
