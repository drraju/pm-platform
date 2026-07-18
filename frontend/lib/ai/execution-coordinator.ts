import type {
  AIExecutionPlan,
  AIOrchestrationResult,
} from "./types";

export class ExecutionCoordinator {
  coordinate(plan: AIExecutionPlan): AIOrchestrationResult {
    const commandIds = collectReferences(plan, "commandId");
    const entityIds = collectReferences(plan, "entityId");
    const navigationTargets = collectReferences(plan, "navigationTarget");

    return Object.freeze({
      plan,
      references: Object.freeze({
        commandIds: Object.freeze(commandIds),
        entityIds: Object.freeze(entityIds),
        navigationTargets: Object.freeze(navigationTargets),
      }),
      status: plan.steps.length ? "Planned" : "NoAction",
    });
  }
}

function collectReferences(
  plan: AIExecutionPlan,
  key: "commandId" | "entityId" | "navigationTarget",
) {
  return plan.steps.flatMap((step) => (step[key] ? [step[key]] : []));
}
