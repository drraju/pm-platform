import { Injectable } from '@nestjs/common';
import {
  AiExecutionEngineState,
  AiExecutionStateMachineSnapshot,
  AiExecutionTransition,
} from './execution-engine.types';

const allowedTransitions: ReadonlyMap<
  AiExecutionEngineState,
  readonly AiExecutionEngineState[]
> = new Map([
  ['Created', ['Validated', 'Failed', 'Cancelled', 'TimedOut']],
  ['Validated', ['Planned', 'Failed', 'Cancelled', 'TimedOut']],
  ['Planned', ['ContextResolved', 'Failed', 'Cancelled', 'TimedOut']],
  ['ContextResolved', ['PromptResolved', 'Failed', 'Cancelled', 'TimedOut']],
  ['PromptResolved', ['SkillResolved', 'Failed', 'Cancelled', 'TimedOut']],
  ['SkillResolved', ['ProviderSelected', 'Failed', 'Cancelled', 'TimedOut']],
  ['ProviderSelected', ['Executing', 'Failed', 'Cancelled', 'TimedOut']],
  ['Executing', ['Completed', 'Failed', 'Cancelled', 'TimedOut']],
  ['Completed', []],
  ['Failed', []],
  ['Cancelled', []],
  ['TimedOut', []],
]);

@Injectable()
export class AiExecutionStateMachineService {
  create(
    executionId: string,
    at = new Date().toISOString(),
  ): AiExecutionStateMachineSnapshot {
    return this.freezeSnapshot({
      currentState: 'Created',
      executionId,
      history: [
        this.freezeTransition({
          at,
          metadata: {},
          reason: 'Execution state machine initialized.',
          sequence: 1,
          to: 'Created',
        }),
      ],
    });
  }

  transition(
    snapshot: AiExecutionStateMachineSnapshot,
    to: AiExecutionEngineState,
    reason: string,
    metadata: Readonly<Record<string, unknown>> = {},
    at = new Date().toISOString(),
  ): AiExecutionStateMachineSnapshot {
    const allowedTargets = allowedTransitions.get(snapshot.currentState) ?? [];

    if (!allowedTargets.includes(to)) {
      throw new Error(
        `Invalid AI execution transition: ${snapshot.currentState} -> ${to}`,
      );
    }

    return this.freezeSnapshot({
      currentState: to,
      executionId: snapshot.executionId,
      history: [
        ...snapshot.history,
        this.freezeTransition({
          at,
          from: snapshot.currentState,
          metadata,
          reason,
          sequence: snapshot.history.length + 1,
          to,
        }),
      ],
    });
  }

  private freezeSnapshot(
    snapshot: AiExecutionStateMachineSnapshot,
  ): AiExecutionStateMachineSnapshot {
    return Object.freeze({
      ...snapshot,
      history: Object.freeze([...snapshot.history]),
    });
  }

  private freezeTransition(
    transition: AiExecutionTransition,
  ): AiExecutionTransition {
    return Object.freeze({
      ...transition,
      metadata: Object.freeze({ ...transition.metadata }),
    });
  }
}
