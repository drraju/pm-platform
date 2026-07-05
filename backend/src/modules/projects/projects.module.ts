import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulingFoundationService } from '../../common/scheduling/scheduling-foundation.service';
import { HealthModule } from '../health/health.module';
import { Issue } from '../raid/entities/issue.entity';
import { Risk } from '../raid/entities/risk.entity';
import { TaskDependency } from '../tasks/entities/task-dependency.entity';
import { Task } from '../tasks/entities/task.entity';
import { User } from '../users/entities/user.entity';
import { ProjectBaselineTask } from './entities/project-baseline-task.entity';
import { ProjectBaseline } from './entities/project-baseline.entity';
import { ProjectMember } from './entities/project-member.entity';
import { Project } from './entities/project.entity';
import { ProjectVisibilityService } from './project-visibility.service';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { PlanningSnapshotModule } from '../planning/planning-snapshot.module';

@Module({
  imports: [
    HealthModule,
    PlanningSnapshotModule,
    TypeOrmModule.forFeature([
      Project,
      ProjectBaseline,
      ProjectBaselineTask,
      ProjectMember,
      Task,
      TaskDependency,
      User,
      Risk,
      Issue,
    ]),
  ],
  controllers: [ProjectsController],
  providers: [SchedulingFoundationService, ProjectsService, ProjectVisibilityService],
  exports: [ProjectsService, ProjectVisibilityService],
})
export class ProjectsModule {}
