import type {
  ConfirmationAssessment,
  PlanValidationResult,
  PolicyEvaluation,
} from "./types";

export class PolicyEngine {
  decide(
    validation: PlanValidationResult,
    confirmation: ConfirmationAssessment,
  ): PolicyEvaluation {
    if (validation.status === "Invalid") {
      return decision("Blocked", "The execution plan failed validation.");
    }

    if (
      confirmation.actions.some(
        ({ actionClass }) => actionClass === "Administrative",
      )
    ) {
      return decision(
        "Blocked",
        "Administrative actions are blocked by the foundation policy.",
      );
    }

    if (confirmation.required) {
      return decision(
        "RequiresConfirmation",
        "The plan contains actions requiring explicit confirmation.",
      );
    }

    return decision("Allowed", "The plan contains read-only actions only.");
  }
}

function decision(
  policyDecision: PolicyEvaluation["decision"],
  reason: string,
): PolicyEvaluation {
  return Object.freeze({ decision: policyDecision, reason });
}
