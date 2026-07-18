import type {
  AIGovernanceAuditRecord,
  AuditIntentSnapshot,
  AuditPlanSnapshot,
  AuditPlanStepSnapshot,
  PlanValidationResult,
  PolicyEvaluation,
} from "./types";

export function createGovernanceAuditRecord({
  confirmationRequired,
  plan,
  policy,
  validation,
}: {
  confirmationRequired: boolean;
  plan: unknown;
  policy: PolicyEvaluation;
  validation: PlanValidationResult;
}): AIGovernanceAuditRecord {
  return Object.freeze({
    confirmationRequired,
    intent: snapshotIntent(plan),
    plan: snapshotPlan(plan),
    policyDecision: policy.decision,
    validationIssueCodes: Object.freeze(
      validation.issues.map(({ code }) => code),
    ),
    validationStatus: validation.status,
  });
}

function snapshotIntent(plan: unknown): AuditIntentSnapshot {
  const intent = isRecord(plan) && isRecord(plan.intent) ? plan.intent : {};
  return Object.freeze({
    category: stringValue(intent.category, "Unknown"),
    input: stringValue(intent.input, ""),
  });
}

function snapshotPlan(plan: unknown): AuditPlanSnapshot {
  const record = isRecord(plan) ? plan : {};
  const steps = Array.isArray(record.steps)
    ? record.steps.map(snapshotStep)
    : [];

  return Object.freeze({
    steps: Object.freeze(steps),
    summary: stringValue(record.summary, "Invalid execution plan"),
  });
}

function snapshotStep(step: unknown): AuditPlanStepSnapshot {
  const record = isRecord(step) ? step : {};
  return Object.freeze({
    ...(typeof record.commandId === "string"
      ? { commandId: record.commandId }
      : {}),
    ...(typeof record.entityId === "string"
      ? { entityId: record.entityId }
      : {}),
    id: stringValue(record.id, "unknown-step"),
    ...(typeof record.navigationTarget === "string"
      ? { navigationTarget: record.navigationTarget }
      : {}),
    type: stringValue(record.type, "Unknown"),
  });
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
