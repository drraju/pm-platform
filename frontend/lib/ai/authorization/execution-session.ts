import type { AIExecutionPlan } from "../types";
import type { AIGovernanceResult } from "../governance/types";
import type {
  AuthorizationResult,
  ConfirmationRequest,
  ExecutionSession,
  ExecutionSessionState,
} from "./types";

export type CreateExecutionSessionInput = Readonly<{
  authorizationResult: AuthorizationResult;
  confirmationRequest: ConfirmationRequest | null;
  creationTimestamp: string;
  currentTimestamp?: string;
  expiryTimestamp: string;
  governanceResult: AIGovernanceResult;
  plan: AIExecutionPlan;
  sessionId: string;
  state?: ExecutionSessionState;
}>;

const SESSION_TRANSITIONS: Readonly<
  Record<ExecutionSessionState, readonly ExecutionSessionState[]>
> = Object.freeze({
  Proposed: Object.freeze([
    "AwaitingConfirmation",
    "Authorized",
    "Cancelled",
  ] as const),
  AwaitingConfirmation: Object.freeze(["Authorized", "Cancelled"] as const),
  Authorized: Object.freeze(["Cancelled"] as const),
  Expired: Object.freeze([]),
  Cancelled: Object.freeze([]),
});

export function createExecutionSession(
  input: CreateExecutionSessionInput,
): ExecutionSession | null {
  const created = timestamp(input.creationTimestamp);
  const expires = timestamp(input.expiryTimestamp);
  const current = timestamp(input.currentTimestamp ?? input.creationTimestamp);

  if (
    !input.sessionId ||
    created === null ||
    expires === null ||
    current === null ||
    expires <= created ||
    !hasImmutableInputs(input) ||
    !hasValidConfirmation(input) ||
    (input.state !== undefined &&
      !isValidInitialState(input.authorizationResult, input.state))
  ) {
    return null;
  }

  const state =
    current >= expires
      ? "Expired"
      : input.state ?? stateFor(input.authorizationResult);

  return Object.freeze({
    authorizationResult: input.authorizationResult,
    confirmationRequest: input.confirmationRequest,
    creationTimestamp: input.creationTimestamp,
    expiryTimestamp: input.expiryTimestamp,
    governanceResult: input.governanceResult,
    plan: input.plan,
    sessionId: input.sessionId,
    state,
  });
}

export function transitionExecutionSession(
  session: ExecutionSession,
  nextState: ExecutionSessionState,
  currentTimestamp: string,
): ExecutionSession | null {
  const current = timestamp(currentTimestamp);
  const expires = timestamp(session.expiryTimestamp);
  if (!Object.isFrozen(session) || current === null || expires === null) {
    return null;
  }

  if (current >= expires) {
    return Object.freeze({ ...session, state: "Expired" });
  }

  if (!isAllowedTransition(session.state, nextState)) {
    return null;
  }

  return Object.freeze({ ...session, state: nextState });
}

export function isExecutionSessionExpired(
  session: ExecutionSession,
  currentTimestamp: string,
) {
  const current = timestamp(currentTimestamp);
  const expires = timestamp(session.expiryTimestamp);
  return current === null || expires === null || current >= expires;
}

function stateFor(authorization: AuthorizationResult): ExecutionSessionState {
  switch (authorization.decision) {
    case "Authorized":
      return "Authorized";
    case "ConfirmationRequired":
      return "AwaitingConfirmation";
    case "Denied":
      return "Cancelled";
  }
}

function hasImmutableInputs(input: CreateExecutionSessionInput) {
  return (
    Object.isFrozen(input.plan) &&
    Object.isFrozen(input.governanceResult) &&
    Object.isFrozen(input.authorizationResult) &&
    (!input.confirmationRequest || Object.isFrozen(input.confirmationRequest))
  );
}

function hasValidConfirmation(input: CreateExecutionSessionInput) {
  return input.authorizationResult.decision === "ConfirmationRequired"
    ? input.confirmationRequest !== null
    : input.confirmationRequest === null;
}

function isValidInitialState(
  authorization: AuthorizationResult,
  state: ExecutionSessionState,
) {
  if (state === "Proposed" || state === "Cancelled") {
    return true;
  }

  if (state === "AwaitingConfirmation") {
    return authorization.decision === "ConfirmationRequired";
  }

  if (state === "Authorized") {
    return authorization.decision === "Authorized";
  }

  return false;
}

function isAllowedTransition(
  current: ExecutionSessionState,
  next: ExecutionSessionState,
) {
  return SESSION_TRANSITIONS[current].includes(next);
}

function timestamp(value: string) {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}
