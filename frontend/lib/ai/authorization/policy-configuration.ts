import type { GovernanceActionClass } from "../governance/types";
import type {
  AuthorizationPolicyConfiguration,
  AuthorizationPolicyOverrides,
  AuthorizationPolicyRule,
} from "./types";

const BASE_POLICY: Record<GovernanceActionClass, AuthorizationPolicyRule> = {
  ReadOnly: {
    confirmationRequired: false,
    requiredPermissionLevel: "Read",
    requiredPermissions: ["ai.read"],
  },
  Navigation: {
    confirmationRequired: false,
    requiredPermissionLevel: "Navigate",
    requiredPermissions: ["ai.navigate"],
  },
  WorkspaceMutation: {
    confirmationRequired: true,
    requiredPermissionLevel: "WorkspaceWrite",
    requiredPermissions: ["ai.workspace.mutate"],
  },
  ProjectMutation: {
    confirmationRequired: true,
    requiredPermissionLevel: "ProjectWrite",
    requiredPermissions: ["ai.project.mutate"],
  },
  Administrative: {
    confirmationRequired: true,
    requiredPermissionLevel: "Administrative",
    requiredPermissions: ["ai.administrative"],
  },
};

export const DEFAULT_AUTHORIZATION_POLICY = createPolicyConfiguration();

export function createPolicyConfiguration(
  overrides: AuthorizationPolicyOverrides = {},
): AuthorizationPolicyConfiguration {
  return Object.freeze({
    ReadOnly: rule("ReadOnly", overrides),
    Navigation: rule("Navigation", overrides),
    WorkspaceMutation: rule("WorkspaceMutation", overrides),
    ProjectMutation: rule("ProjectMutation", overrides),
    Administrative: rule("Administrative", overrides),
  });
}

function rule(
  actionClass: GovernanceActionClass,
  overrides: AuthorizationPolicyOverrides,
): AuthorizationPolicyRule {
  const base = BASE_POLICY[actionClass];
  const override = overrides[actionClass];
  return Object.freeze({
    confirmationRequired:
      override?.confirmationRequired ?? base.confirmationRequired,
    requiredPermissionLevel:
      override?.requiredPermissionLevel ?? base.requiredPermissionLevel,
    requiredPermissions: Object.freeze(
      [...(override?.requiredPermissions ?? base.requiredPermissions)],
    ),
  });
}
