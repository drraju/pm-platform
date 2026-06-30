import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthzModule } from '../../common/authz/authz.module';
import { SchedulingFoundationService } from '../../common/scheduling/scheduling-foundation.service';
import { ProjectsModule } from '../projects/projects.module';
import { Project } from '../projects/entities/project.entity';
import { Task } from '../tasks/entities/task.entity';
import { User } from '../users/entities/user.entity';
import { PlanningScheduleSnapshot } from './entities/planning-schedule-snapshot.entity';
import { PlanningTaskSchedule } from './entities/planning-task-schedule.entity';
import { PortfolioDependency } from './entities/portfolio-dependency.entity';
import { ResourceAllocation } from './entities/resource-allocation.entity';
import { ResourceCapacity } from './entities/resource-capacity.entity';
import { ResourceWorkloadSnapshot } from './entities/resource-workload-snapshot.entity';
import { PlanningController } from './planning.controller';
import { PlanningService } from './planning.service';

@Module({
  imports: [
    AuthzModule,
    ProjectsModule,
    TypeOrmModule.forFeature([
      PlanningScheduleSnapshot,
      PlanningTaskSchedule,
      PortfolioDependency,
      ResourceAllocation,
      ResourceCapacity,
      ResourceWorkloadSnapshot,
      Project,
      Task,
      User,
    ]),
  ],
  controllers: [PlanningController],
  providers: [SchedulingFoundationService, PlanningService],
  exports: [PlanningService],
})
export class PlanningModule {}
