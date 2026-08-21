import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from '../projects/entities/project.entity';
import { TaskDependency } from '../tasks/entities/task-dependency.entity';
import { Task } from '../tasks/entities/task.entity';
import { PlanningScheduleSnapshot } from './entities/planning-schedule-snapshot.entity';
import { PlanningTaskSchedule } from './entities/planning-task-schedule.entity';
import { PlanningSnapshotService } from './planning-snapshot.service';
import { PlanningSchedulingEngineModule } from './planning-scheduling-engine.module';

@Module({
  imports: [
    PlanningSchedulingEngineModule,
    TypeOrmModule.forFeature([
      PlanningScheduleSnapshot,
      PlanningTaskSchedule,
      Project,
      Task,
      TaskDependency,
    ]),
  ],
  providers: [PlanningSnapshotService],
  exports: [PlanningSnapshotService],
})
export class PlanningSnapshotModule {}
