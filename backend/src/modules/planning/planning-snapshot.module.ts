import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulingFoundationService } from '../../common/scheduling/scheduling-foundation.service';
import { Project } from '../projects/entities/project.entity';
import { Task } from '../tasks/entities/task.entity';
import { PlanningScheduleSnapshot } from './entities/planning-schedule-snapshot.entity';
import { PlanningTaskSchedule } from './entities/planning-task-schedule.entity';
import { PlanningSnapshotService } from './planning-snapshot.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlanningScheduleSnapshot,
      PlanningTaskSchedule,
      Project,
      Task,
    ]),
  ],
  providers: [SchedulingFoundationService, PlanningSnapshotService],
  exports: [PlanningSnapshotService],
})
export class PlanningSnapshotModule {}
