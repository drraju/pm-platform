export const GOVERNANCE_ACTION_CLASSES = Object.freeze([
  "ReadOnly",
  "Navigation",
  "WorkspaceMutation",
  "ProjectMutation",
  "Administrative",
] as const);

export type GovernanceActionClass =
  (typeof GOVERNANCE_ACTION_CLASSES)[number];

export type PolicyDecision = "Allowed" | "RequiresConfirmation" | "Blocked";

export type ValidationIssueCode =
  | "InvalidPlan"
  | "MutablePlan"
  | "UnknownCommand"
  | "UnknownEntity"
  | "UnknownIntent"
  | "UnsupportedActionType";

export type ValidationIssue = Readonly<{
  code: ValidationIssueCode;
  message: string;
  referenceId?: string;
  stepId?: string;
}>;

export type PlanValidationResult = Readonly<{
  issues: readonly ValidationIssue[];
  status: "Valid" | "Invalid";
}>;

export type ActionClassification = Readonly<{
  actionClass: GovernanceActionClass;
  stepId: string;
}>;

export type ConfirmationAssessment = Readonly<{
  actions: readonly ActionClassification[];
  required: boolean;
}>;

export type PolicyEvaluation = Readonly<{
  decision: PolicyDecision;
  reason: string;
}>;

export type AuditIntentSnapshot = Readonly<{
  category: string;
  input: string;
}>;

export type AuditPlanStepSnapshot = Readonly<{
  commandId?: string;
  entityId?: string;
  id: string;
  navigationTarget?: string;
  type: string;
}>;

export type AuditPlanSnapshot = Readonly<{
  steps: readonly AuditPlanStepSnapshot[];
  summary: string;
}>;

export type AIGovernanceAuditRecord = Readonly<{
  confirmationRequired: boolean;
  intent: AuditIntentSnapshot;
  plan: AuditPlanSnapshot;
  policyDecision: PolicyDecision;
  validationIssueCodes: readonly ValidationIssueCode[];
  validationStatus: PlanValidationResult["status"];
}>;

export type AIGovernanceResult = Readonly<{
  auditRecord: AIGovernanceAuditRecord;
  confirmation: ConfirmationAssessment;
  confirmationRequired: boolean;
  policy: PolicyEvaluation;
  validation: PlanValidationResult;
}>;
