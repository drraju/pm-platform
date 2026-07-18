import type { AIExecutionPlan, AIExecutionStep } from "../types";
import type {
  ConfirmationAssessment,
  GovernanceActionClass,
} from "./types";

export type ConfirmationPolicyOptions = Readonly<{
  commandClassifications?: Readonly<Record<string, GovernanceActionClass>>;
}>;

const READ_ONLY_TYPES = new Set([
  "Search",
  "Summarize",
  "Explain",
  "Recommend",
  "Analyze",
  "Plan",
]);

export class ConfirmationPolicy {
  private readonly commandClassifications: Readonly<
    Record<string, GovernanceActionClass>
  >;

  constructor({ commandClassifications = {} }: ConfirmationPolicyOptions = {}) {
    this.commandClassifications = { ...commandClassifications };
  }

  evaluate(plan: AIExecutionPlan): ConfirmationAssessment {
    const actions = Object.freeze(
      plan.steps.map((step) =>
        Object.freeze({
          actionClass: this.classify(step),
          stepId: step.id,
        }),
      ),
    );

    return Object.freeze({
      actions,
      required: actions.some(({ actionClass }) => actionClass !== "ReadOnly"),
    });
  }

  classify(step: AIExecutionStep): GovernanceActionClass {
    if (READ_ONLY_TYPES.has(step.type)) {
      return "ReadOnly";
    }

    if (step.type === "Navigate") {
      return "Navigation";
    }

    return this.classifyCommand(step.commandId);
  }

  private classifyCommand(commandId?: string): GovernanceActionClass {
    if (!commandId) {
      return "Administrative";
    }

    const configured = this.commandClassifications[commandId];
    if (configured) {
      return configured;
    }

    if (/^(?:admin|administration)[.:]/i.test(commandId)) {
      return "Administrative";
    }

    if (
      /^(?:projects?|planning|raid|risks?|issues?|actions?|decisions?|tasks?)[.:]/i.test(
        commandId,
      )
    ) {
      return "ProjectMutation";
    }

    return "WorkspaceMutation";
  }
}
