import type { AIExecutionPlan } from "../types";
import type {
  AIGovernanceResult,
  GovernanceActionClass,
} from "../governance/types";

export type AuthorizationDecision =
  | "Authorized"
  | "ConfirmationRequired"
  | "Denied";

export type RequiredPermissionLevel =
  | "Read"
  | "Navigate"
  | "WorkspaceWrite"
  | "ProjectWrite"
  | "Administrative";

export type AuthorizationPolicyRule = Readonly<{
  confirmationRequired: boolean;
  requiredPermissionLevel: RequiredPermissionLevel;
  requiredPermissions: readonly string[];
}>;

export type AuthorizationPolicyConfiguration = Readonly<
  Record<GovernanceActionClass, AuthorizationPolicyRule>
>;

export type AuthorizationPolicyOverrides = Partial<
  Record<GovernanceActionClass, Partial<AuthorizationPolicyRule>>
>;

export type AuthorizationScope = Readonly<{
  actionClasses: readonly GovernanceActionClass[];
  commandIds: readonly string[];
  entityIds: readonly string[];
  navigationTargets: readonly string[];
  planSummary: string;
}>;

export type AuthorizationResult = Readonly<{
  decision: AuthorizationDecision;
  missingPermissions: readonly string[];
  reason: string;
  requiredPermissionLevel: RequiredPermissionLevel;
  requiredPermissions: readonly string[];
  scope: AuthorizationScope;
}>;

export type ConfirmationRequest = Readonly<{
  affectedCommands: readonly string[];
  affectedEntities: readonly string[];
  confirmationType: GovernanceActionClass;
  requiredPermissionLevel: RequiredPermissionLevel;
  summary: string;
}>;

export type ExecutionSessionState =
  | "Proposed"
  | "AwaitingConfirmation"
  | "Authorized"
  | "Expired"
  | "Cancelled";

export type ExecutionSession = Readonly<{
  authorizationResult: AuthorizationResult;
  confirmationRequest: ConfirmationRequest | null;
  creationTimestamp: string;
  expiryTimestamp: string;
  governanceResult: AIGovernanceResult;
  plan: AIExecutionPlan;
  sessionId: string;
  state: ExecutionSessionState;
}>;

export type ExecutionToken = Readonly<{
  authorizationScope: AuthorizationScope;
  expiryTimestamp: string;
  issuedTimestamp: string;
  sessionId: string;
  tokenId: string;
}>;
