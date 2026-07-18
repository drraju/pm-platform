import type { AIExecutionPlan } from "../types";
import { ValidationEngine } from "../governance/validation-engine";
import type {
  AIGovernanceResult,
  GovernanceActionClass,
} from "../governance/types";
import { DEFAULT_AUTHORIZATION_POLICY } from "./policy-configuration";
import type {
  AuthorizationPolicyConfiguration,
  AuthorizationResult,
  AuthorizationScope,
  RequiredPermissionLevel,
} from "./types";

export type AuthorizationInput = Readonly<{
  governanceResult: AIGovernanceResult;
  plan: AIExecutionPlan;
  userPermissions: readonly string[];
}>;

const PERMISSION_LEVEL_RANK: Record<RequiredPermissionLevel, number> = {
  Read: 0,
  Navigate: 1,
  WorkspaceWrite: 2,
  ProjectWrite: 3,
  Administrative: 4,
};

const VALIDATION_ENGINE = new ValidationEngine();

export class AuthorizationEngine {
  constructor(
    private readonly policy: AuthorizationPolicyConfiguration =
      DEFAULT_AUTHORIZATION_POLICY,
  ) {}

  authorize({
    governanceResult,
    plan,
    userPermissions,
  }: AuthorizationInput): AuthorizationResult {
    if (!isValidInput(plan, governanceResult)) {
      return result({
        decision: "Denied",
        reason: "The plan or governance result is invalid.",
        requiredPermissionLevel: "Read",
        requiredPermissions: [],
        scope: emptyScope(plan),
      });
    }

    const scope = createScope(plan, governanceResult);
    const rules = scope.actionClasses.map((actionClass) =>
      this.policy[actionClass],
    );
    const requiredPermissions = unique(
      rules.flatMap(({ requiredPermissions: permissions }) => permissions),
    );
    const requiredPermissionLevel = highestPermissionLevel(rules);

    if (governanceResult.policy.decision === "Blocked") {
      return result({
        decision: "Denied",
        reason: "Governance blocked the execution plan.",
        requiredPermissionLevel,
        requiredPermissions,
        scope,
      });
    }

    const permissionSet = new Set(userPermissions);
    const missingPermissions = requiredPermissions.filter(
      (permission) => !permissionSet.has(permission),
    );
    if (missingPermissions.length) {
      return result({
        decision: "Denied",
        missingPermissions,
        reason: "The user does not have all required permissions.",
        requiredPermissionLevel,
        requiredPermissions,
        scope,
      });
    }

    const confirmationRequired = rules.some(
      ({ confirmationRequired: required }) => required,
    );
    return result({
      decision: confirmationRequired
        ? "ConfirmationRequired"
        : "Authorized",
      reason: confirmationRequired
        ? "Explicit confirmation is required by authorization policy."
        : "The plan is authorized by policy and permissions.",
      requiredPermissionLevel,
      requiredPermissions,
      scope,
    });
  }
}

function isValidInput(
  plan: AIExecutionPlan,
  governance: AIGovernanceResult,
) {
  const validation = VALIDATION_ENGINE.validate(plan);
  if (
    validation.status !== "Valid" ||
    !hasGovernanceStructure(governance) ||
    !isImmutableGovernanceResult(governance) ||
    governance.validation.status !== "Valid" ||
    governance.auditRecord.validationStatus !== "Valid" ||
    governance.auditRecord.policyDecision !== governance.policy.decision ||
    governance.auditRecord.plan.summary !== plan.summary ||
    governance.auditRecord.intent.category !== plan.intent.category ||
    governance.auditRecord.intent.input !== plan.intent.input ||
    governance.auditRecord.plan.steps.length !== plan.steps.length ||
    governance.confirmation.actions.length !== plan.steps.length
  ) {
    return false;
  }

  return plan.steps.every((step, index) => {
    const auditStep = governance.auditRecord.plan.steps[index];
    const action = governance.confirmation.actions[index];
    return (
      auditStep?.id === step.id &&
      auditStep.type === step.type &&
      auditStep.commandId === step.commandId &&
      auditStep.entityId === step.entityId &&
      auditStep.navigationTarget === step.navigationTarget &&
      action?.stepId === step.id
    );
  });
}

function hasGovernanceStructure(
  value: unknown,
): value is AIGovernanceResult {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isRecord(value.validation) &&
    Array.isArray(value.validation.issues) &&
    typeof value.validation.status === "string" &&
    isRecord(value.policy) &&
    typeof value.policy.decision === "string" &&
    isRecord(value.confirmation) &&
    Array.isArray(value.confirmation.actions) &&
    isRecord(value.auditRecord) &&
    isRecord(value.auditRecord.intent) &&
    isRecord(value.auditRecord.plan) &&
    Array.isArray(value.auditRecord.plan.steps)
  );
}

function isImmutableGovernanceResult(governance: AIGovernanceResult) {
  return (
    Object.isFrozen(governance) &&
    Object.isFrozen(governance.validation) &&
    Object.isFrozen(governance.validation.issues) &&
    Object.isFrozen(governance.policy) &&
    Object.isFrozen(governance.confirmation) &&
    Object.isFrozen(governance.confirmation.actions) &&
    governance.confirmation.actions.every(Object.isFrozen) &&
    Object.isFrozen(governance.auditRecord)
  );
}

function createScope(
  plan: AIExecutionPlan,
  governance: AIGovernanceResult,
): AuthorizationScope {
  return Object.freeze({
    actionClasses: Object.freeze(
      unique(
        governance.confirmation.actions.map(({ actionClass }) => actionClass),
      ),
    ),
    commandIds: Object.freeze(
      unique(plan.steps.flatMap(({ commandId }) => (commandId ? [commandId] : []))),
    ),
    entityIds: Object.freeze(
      unique(plan.steps.flatMap(({ entityId }) => (entityId ? [entityId] : []))),
    ),
    navigationTargets: Object.freeze(
      unique(
        plan.steps.flatMap(({ navigationTarget }) =>
          navigationTarget ? [navigationTarget] : [],
        ),
      ),
    ),
    planSummary: plan.summary,
  });
}

function emptyScope(plan: unknown): AuthorizationScope {
  const planSummary =
    isRecord(plan) && typeof plan.summary === "string"
      ? plan.summary
      : "Invalid execution plan";
  return Object.freeze({
    actionClasses: Object.freeze([]),
    commandIds: Object.freeze([]),
    entityIds: Object.freeze([]),
    navigationTargets: Object.freeze([]),
    planSummary,
  });
}

function highestPermissionLevel(
  rules: readonly AuthorizationPolicyConfiguration[GovernanceActionClass][],
): RequiredPermissionLevel {
  return rules.reduce<RequiredPermissionLevel>(
    (highest, { requiredPermissionLevel }) =>
      PERMISSION_LEVEL_RANK[requiredPermissionLevel] >
      PERMISSION_LEVEL_RANK[highest]
        ? requiredPermissionLevel
        : highest,
    "Read",
  );
}

function result({
  decision,
  missingPermissions = [],
  reason,
  requiredPermissionLevel,
  requiredPermissions,
  scope,
}: Omit<AuthorizationResult, "missingPermissions"> & {
  missingPermissions?: readonly string[];
}): AuthorizationResult {
  return Object.freeze({
    decision,
    missingPermissions: Object.freeze([...missingPermissions]),
    reason,
    requiredPermissionLevel,
    requiredPermissions: Object.freeze([...requiredPermissions]),
    scope,
  });
}

function unique<T>(values: readonly T[]) {
  return [...new Set(values)];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
