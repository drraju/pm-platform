import type { GovernanceActionClass } from "../governance/types";
import type {
  AuthorizationResult,
  ConfirmationRequest,
} from "./types";

const ACTION_RANK: Record<GovernanceActionClass, number> = {
  ReadOnly: 0,
  Navigation: 1,
  WorkspaceMutation: 2,
  ProjectMutation: 3,
  Administrative: 4,
};

export class ConfirmationEngine {
  createRequest(
    authorization: AuthorizationResult,
  ): ConfirmationRequest | null {
    if (authorization.decision !== "ConfirmationRequired") {
      return null;
    }

    const confirmationType = authorization.scope.actionClasses.reduce(
      (highest, actionClass) =>
        ACTION_RANK[actionClass] > ACTION_RANK[highest]
          ? actionClass
          : highest,
      "ReadOnly",
    );

    return Object.freeze({
      affectedCommands: Object.freeze([...authorization.scope.commandIds]),
      affectedEntities: Object.freeze([...authorization.scope.entityIds]),
      confirmationType,
      requiredPermissionLevel: authorization.requiredPermissionLevel,
      summary: `Confirm execution plan: ${authorization.scope.planSummary}`,
    });
  }
}
