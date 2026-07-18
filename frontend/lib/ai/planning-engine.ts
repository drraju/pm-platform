import { snapshotAIContext } from "./context-engine";
import { createImmutableIntent } from "./intent-engine";
import type {
  AIContext,
  AIExecutionPlan,
  AIExecutionStep,
  AIIntent,
} from "./types";

export class PlanningEngine {
  createPlan(intent: AIIntent, context: AIContext): AIExecutionPlan {
    return createImmutableExecutionPlan(intent, context);
  }
}

export function createImmutableExecutionPlan(
  intent: AIIntent,
  context: AIContext,
): AIExecutionPlan {
  const immutableIntent = createImmutableIntent(intent);
  const immutableContext = snapshotAIContext(context);
  const steps = Object.freeze(createSteps(immutableIntent));
  const summary =
    immutableIntent.category === "Unknown"
      ? immutableIntent.reason ?? "The intent is unknown."
      : `Prepared a descriptive ${immutableIntent.category} plan.`;

  return Object.freeze({
    context: immutableContext,
    intent: immutableIntent,
    steps,
    summary,
  });
}

function createSteps(intent: AIIntent): readonly AIExecutionStep[] {
  if (intent.category === "Unknown") {
    return [];
  }

  return [
    Object.freeze({
      ...(intent.commandId ? { commandId: intent.commandId } : {}),
      description: `Describe ${intent.category}: ${intent.input}`,
      ...(intent.entityId ? { entityId: intent.entityId } : {}),
      id: "step-1",
      ...(intent.navigationTarget
        ? { navigationTarget: intent.navigationTarget }
        : {}),
      type: intent.category,
    }),
  ];
}
