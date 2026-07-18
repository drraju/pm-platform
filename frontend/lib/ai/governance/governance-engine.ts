import type { AIExecutionPlan } from "../types";
import { createGovernanceAuditRecord } from "./audit-model";
import { ConfirmationPolicy } from "./confirmation-policy";
import { PolicyEngine } from "./policy-engine";
import type {
  AIGovernanceResult,
  ConfirmationAssessment,
} from "./types";
import { ValidationEngine } from "./validation-engine";

export type GovernanceEngineOptions = Readonly<{
  confirmationPolicy?: ConfirmationPolicy;
  policyEngine?: PolicyEngine;
  validationEngine?: ValidationEngine;
}>;

export class GovernanceEngine {
  private readonly confirmationPolicy: ConfirmationPolicy;
  private readonly policyEngine: PolicyEngine;
  private readonly validationEngine: ValidationEngine;

  constructor({
    confirmationPolicy = new ConfirmationPolicy(),
    policyEngine = new PolicyEngine(),
    validationEngine = new ValidationEngine(),
  }: GovernanceEngineOptions = {}) {
    this.confirmationPolicy = confirmationPolicy;
    this.policyEngine = policyEngine;
    this.validationEngine = validationEngine;
  }

  evaluate(plan: unknown): AIGovernanceResult {
    const validation = this.validationEngine.validate(plan);
    const confirmation =
      validation.status === "Valid"
        ? this.confirmationPolicy.evaluate(plan as AIExecutionPlan)
        : emptyConfirmation();
    const policy = this.policyEngine.decide(validation, confirmation);
    const confirmationRequired = policy.decision === "RequiresConfirmation";
    const auditRecord = createGovernanceAuditRecord({
      confirmationRequired,
      plan,
      policy,
      validation,
    });

    return Object.freeze({
      auditRecord,
      confirmation,
      confirmationRequired,
      policy,
      validation,
    });
  }
}

function emptyConfirmation(): ConfirmationAssessment {
  return Object.freeze({ actions: Object.freeze([]), required: false });
}
