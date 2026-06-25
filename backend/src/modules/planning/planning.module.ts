import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthzModule } from '../../common/authz/authz.module';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { Project } from '../projects/entities/project.entity';
import { ProjectsModule } from '../projects/projects.module';
import { TaskDependency } from '../tasks/entities/task-dependency.entity';
import { Task } from '../tasks/entities/task.entity';
import { User } from '../users/entities/user.entity';
import { PlanningTaskSchedule } from './entities/planning-task-schedule.entity';
import { PortfolioDependency } from './entities/portfolio-dependency.entity';
import { ResourceAllocation } from './entities/resource-allocation.entity';
import { ResourceCapacity } from './entities/resource-capacity.entity';
import { ScheduleSnapshot } from './entities/schedule-snapshot.entity';
import { PlanningController } from './planning.controller';
import { PlanningService } from './planning.service';

@Module({
  imports: [
    AuthzModule,
    ProjectsModule,
    TypeOrmModule.forFeature([
      ScheduleSnapshot,
      PlanningTaskSchedule,
      PortfolioDependency,
      ResourceAllocation,
      ResourceCapacity,
      Project,
      ProjectMember,
      Task,
      TaskDependency,
      User,
    ]),
  ],
  controllers: [PlanningController],
  providers: [PlanningService],
  exports: [PlanningService],
})
export class PlanningModule {}
