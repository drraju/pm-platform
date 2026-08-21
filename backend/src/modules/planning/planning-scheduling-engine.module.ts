import { Module } from '@nestjs/common';
import { SchedulingContextFactory } from '../../common/scheduling/scheduling-context.factory';
import { PlanningBackwardPassService } from './planning-backward-pass.service';
import { PlanningCriticalPathService } from './planning-critical-path.service';
import { PlanningFloatService } from './planning-float.service';
import { PlanningForwardPassService } from './planning-forward-pass.service';
import { PlanningGraphBuilderService } from './planning-graph-builder.service';
import { PlanningScheduleEngineService } from './planning-schedule-engine.service';

const providers = [
  PlanningBackwardPassService,
  PlanningCriticalPathService,
  PlanningFloatService,
  PlanningForwardPassService,
  PlanningGraphBuilderService,
  PlanningScheduleEngineService,
  SchedulingContextFactory,
];

@Module({
  exports: providers,
  providers,
})
export class PlanningSchedulingEngineModule {}
