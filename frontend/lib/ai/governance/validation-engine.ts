import { AI_INTENT_CATEGORIES, type AIExecutionPlan } from "../types";
import type {
  PlanValidationResult,
  ValidationIssue,
  ValidationIssueCode,
} from "./types";

const SUPPORTED_ACTION_TYPES = new Set(
  AI_INTENT_CATEGORIES.filter((category) => category !== "Unknown"),
);

export class ValidationEngine {
  validate(candidate: unknown): PlanValidationResult {
    const issues: ValidationIssue[] = [];

    if (!hasPlanStructure(candidate)) {
      issues.push(
        issue("InvalidPlan", "The execution plan structure is invalid."),
      );
      return result(issues);
    }

    if (!isImmutablePlan(candidate)) {
      issues.push(
        issue("MutablePlan", "The execution plan must be deeply immutable."),
      );
    }

    if (candidate.intent.category === "Unknown") {
      issues.push(
        issue("UnknownIntent", "Unknown intent cannot pass governance."),
      );
    } else if (!SUPPORTED_ACTION_TYPES.has(candidate.intent.category)) {
      issues.push(
        issue(
          "UnsupportedActionType",
          `Intent type "${candidate.intent.category}" is unsupported.`,
        ),
      );
    }

    const commandIds = new Set(
      candidate.context.availableCommands.map(({ id }) => id),
    );
    const entityIds = new Set(
      candidate.context.availableEntities.map(({ id }) => id),
    );

    for (const step of candidate.steps) {
      if (!SUPPORTED_ACTION_TYPES.has(step.type)) {
        issues.push(
          issue(
            "UnsupportedActionType",
            `Action type "${step.type}" is unsupported.`,
            { stepId: step.id },
          ),
        );
      }

      if (step.type === "ExecuteCommand" && !step.commandId) {
        issues.push(
          issue("InvalidPlan", "Command actions require a command ID.", {
            stepId: step.id,
          }),
        );
      }

      if (step.type === "Navigate" && !step.navigationTarget) {
        issues.push(
          issue("InvalidPlan", "Navigation actions require a target.", {
            stepId: step.id,
          }),
        );
      }

      if (step.commandId && !commandIds.has(step.commandId)) {
        issues.push(
          issue(
            "UnknownCommand",
            `Command "${step.commandId}" is not available in context.`,
            { referenceId: step.commandId, stepId: step.id },
          ),
        );
      }

      if (step.entityId && !entityIds.has(step.entityId)) {
        issues.push(
          issue(
            "UnknownEntity",
            `Entity "${step.entityId}" is not available in context.`,
            { referenceId: step.entityId, stepId: step.id },
          ),
        );
      }
    }

    return result(issues);
  }
}

function hasPlanStructure(candidate: unknown): candidate is AIExecutionPlan {
  if (!isRecord(candidate)) {
    return false;
  }

  const { context, intent, steps, summary } = candidate;
  if (
    typeof summary !== "string" ||
    !Array.isArray(steps) ||
    !isRecord(intent) ||
    typeof intent.category !== "string" ||
    typeof intent.input !== "string" ||
    !isRecord(context) ||
    !Array.isArray(context.availableCommands) ||
    !Array.isArray(context.availableEntities) ||
    !Array.isArray(context.permissions) ||
    typeof context.currentRoute !== "string"
  ) {
    return false;
  }

  return (
    context.availableCommands.every(isReference) &&
    context.availableEntities.every(isReference) &&
    context.permissions.every((permission) => typeof permission === "string") &&
    steps.every(isStep)
  );
}

function isStep(step: unknown) {
  return (
    isRecord(step) &&
    typeof step.id === "string" &&
    typeof step.description === "string" &&
    typeof step.type === "string" &&
    isOptionalString(step.commandId) &&
    isOptionalString(step.entityId) &&
    isOptionalString(step.navigationTarget)
  );
}

function isReference(reference: unknown) {
  return isRecord(reference) && typeof reference.id === "string";
}

function isOptionalString(value: unknown) {
  return value === undefined || typeof value === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isImmutablePlan(plan: AIExecutionPlan) {
  return (
    Object.isFrozen(plan) &&
    Object.isFrozen(plan.intent) &&
    Object.isFrozen(plan.context) &&
    Object.isFrozen(plan.context.availableCommands) &&
    plan.context.availableCommands.every(Object.isFrozen) &&
    Object.isFrozen(plan.context.availableEntities) &&
    plan.context.availableEntities.every(Object.isFrozen) &&
    Object.isFrozen(plan.context.permissions) &&
    (!plan.context.selectedEntity ||
      Object.isFrozen(plan.context.selectedEntity)) &&
    (!plan.context.selectedProject ||
      Object.isFrozen(plan.context.selectedProject)) &&
    Object.isFrozen(plan.steps) &&
    plan.steps.every(Object.isFrozen)
  );
}

function issue(
  code: ValidationIssueCode,
  message: string,
  references: Pick<ValidationIssue, "referenceId" | "stepId"> = {},
): ValidationIssue {
  return Object.freeze({ code, message, ...references });
}

function result(issues: readonly ValidationIssue[]): PlanValidationResult {
  const immutableIssues = Object.freeze([...issues]);
  return Object.freeze({
    issues: immutableIssues,
    status: immutableIssues.length ? "Invalid" : "Valid",
  });
}
