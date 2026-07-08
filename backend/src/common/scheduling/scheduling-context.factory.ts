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
    tasks: readonly SchedulingContextTask[];
  }): SchedulingContext {
    return Object.freeze({
      dependencies: Object.freeze([...(input.dependencies ?? [])]),
      tasks: Object.freeze([...input.tasks]),
    });
  }
}
