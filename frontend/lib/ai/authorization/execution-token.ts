import type {
  AuthorizationScope,
  ExecutionSession,
  ExecutionToken,
} from "./types";
import { isExecutionSessionExpired } from "./execution-session";

export type CreateExecutionTokenInput = Readonly<{
  expiryTimestamp: string;
  issuedTimestamp: string;
  session: ExecutionSession;
  tokenId: string;
}>;

export function createExecutionToken({
  expiryTimestamp,
  issuedTimestamp,
  session,
  tokenId,
}: CreateExecutionTokenInput): ExecutionToken | null {
  const issued = timestamp(issuedTimestamp);
  const expires = timestamp(expiryTimestamp);
  const sessionCreated = timestamp(session.creationTimestamp);
  const sessionExpiry = timestamp(session.expiryTimestamp);

  if (
    !tokenId ||
    !Object.isFrozen(session) ||
    session.state !== "Authorized" ||
    issued === null ||
    expires === null ||
    sessionCreated === null ||
    sessionExpiry === null ||
    issued < sessionCreated ||
    expires <= issued ||
    expires > sessionExpiry ||
    isExecutionSessionExpired(session, issuedTimestamp)
  ) {
    return null;
  }

  return Object.freeze({
    authorizationScope: snapshotScope(session.authorizationResult.scope),
    expiryTimestamp,
    issuedTimestamp,
    sessionId: session.sessionId,
    tokenId,
  });
}

function snapshotScope(scope: AuthorizationScope): AuthorizationScope {
  return Object.freeze({
    actionClasses: Object.freeze([...scope.actionClasses]),
    commandIds: Object.freeze([...scope.commandIds]),
    entityIds: Object.freeze([...scope.entityIds]),
    navigationTargets: Object.freeze([...scope.navigationTargets]),
    planSummary: scope.planSummary,
  });
}

function timestamp(value: string) {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}
