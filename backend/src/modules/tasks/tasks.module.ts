import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulingFoundationService } from '../../common/scheduling/scheduling-foundation.service';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { ProjectsModule } from '../projects/projects.module';
import { TaskDependency } from './entities/task-dependency.entity';
import { Task } from './entities/task.entity';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [
    ProjectsModule,
    TypeOrmModule.forFeature([Task, TaskDependency, ProjectMember]),
  ],
  controllers: [TasksController],
  providers: [SchedulingFoundationService, TasksService],
  exports: [TasksService],
})
export class TasksModule {}
