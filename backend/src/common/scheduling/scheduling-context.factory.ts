import { Injectable } from '@nestjs/common';
import {
  SchedulingContext,
  SchedulingContextDependency,
  SchedulingContextTask,
} from './scheduling-context';

@Injectable()
export class SchedulingContextFactory {
  create(input: {
    dependencies?: readonly SchedulingContextDependency[];
    scheduleAnchorDate?: string | null;
    tasks: readonly SchedulingContextTask[];
  }): SchedulingContext {
    return Object.freeze({
      dependencies: Object.freeze(
        (input.dependencies ?? []).map((dependency) =>
          Object.freeze({ ...dependency }),
        ),
      ),
      scheduleAnchorDate: input.scheduleAnchorDate ?? null,
      tasks: Object.freeze(
        input.tasks.map((task) => Object.freeze({ ...task })),
      ),
    });
  }
}
