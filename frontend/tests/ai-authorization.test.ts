import { describe, expect, it } from "vitest";
import {
  AIPlatform,
  type AIContextInput,
  type AIExecutionPlan,
  type AIIntentRequest,
} from "@/lib/ai";
import {
  AuthorizationEngine,
  ConfirmationEngine,
  DEFAULT_AUTHORIZATION_POLICY,
  createExecutionSession,
  createExecutionToken,
  createPolicyConfiguration,
  isExecutionSessionExpired,
  transitionExecutionSession,
  type AuthorizationResult,
} from "@/lib/ai/authorization";
import {
  GovernanceEngine,
  type AIGovernanceResult,
} from "@/lib/ai/governance";

const contextInput: AIContextInput = {
  availableCommands: [
    { id: "workspace.refresh", title: "Refresh workspace" },
    { id: "project.update", title: "Update project" },
    { id: "admin.users.update", title: "Update users" },
  ],
  availableEntities: [
    {
      id: "project:1",
      navigationTarget: "/projects/project-1",
      title: "Customer Upgrade",
    },
  ],
  currentRoute: "/projects/project-1",
  currentWorkspace: "Projects",
  permissions: ["project.read", "project.update"],
  selectedProject: { id: "project-1", name: "Customer Upgrade" },
};

const createdAt = "2026-07-18T09:00:00.000Z";
const expiresAt = "2026-07-18T09:30:00.000Z";

describe("authorization policy configuration", () => {
  it("provides immutable default confirmation and permission mappings", () => {
    expect(DEFAULT_AUTHORIZATION_POLICY).toMatchObject({
      ReadOnly: { confirmationRequired: false },
      Navigation: { confirmationRequired: false },
      WorkspaceMutation: { confirmationRequired: true },
      ProjectMutation: { confirmationRequired: true },
      Administrative: { confirmationRequired: true },
    });
    expect(Object.isFrozen(DEFAULT_AUTHORIZATION_POLICY)).toBe(true);
    expect(Object.isFrozen(DEFAULT_AUTHORIZATION_POLICY.ProjectMutation)).toBe(
      true,
    );
    expect(
      Object.isFrozen(
        DEFAULT_AUTHORIZATION_POLICY.ProjectMutation.requiredPermissions,
      ),
    ).toBe(true);
  });

  it("supports declarative policy overrides without mutating defaults", () => {
    const configured = createPolicyConfiguration({
      Navigation: {
        confirmationRequired: true,
        requiredPermissions: ["workspace.navigate"],
      },
    });

    expect(configured.Navigation).toMatchObject({
      confirmationRequired: true,
      requiredPermissions: ["workspace.navigate"],
    });
    expect(DEFAULT_AUTHORIZATION_POLICY.Navigation).toMatchObject({
      confirmationRequired: false,
      requiredPermissions: ["ai.navigate"],
    });
  });
});

describe("AuthorizationEngine", () => {
  it("authorizes read-only and navigation plans without confirmation", () => {
    const readOnly = authorize(
      { category: "Analyze", input: "Analyze project health" },
      ["ai.read"],
    );
    const navigation = authorize(
      {
        category: "Navigate",
        entityId: "project:1",
        input: "Open project",
        navigationTarget: "/projects/project-1",
      },
      ["ai.navigate"],
    );

    expect(readOnly.decision).toBe("Authorized");
    expect(navigation.decision).toBe("Authorized");
    expect(navigation.requiredPermissionLevel).toBe("Navigate");
  });

  it("requires confirmation for workspace and project mutations", () => {
    const workspace = authorize(
      {
        category: "ExecuteCommand",
        commandId: "workspace.refresh",
        input: "Refresh workspace",
      },
      ["ai.workspace.mutate"],
    );
    const project = authorize(
      {
        category: "ExecuteCommand",
        commandId: "project.update",
        input: "Update project",
      },
      ["ai.project.mutate"],
    );

    expect(workspace.decision).toBe("ConfirmationRequired");
    expect(project.decision).toBe("ConfirmationRequired");
    expect(project.requiredPermissionLevel).toBe("ProjectWrite");
  });

  it("denies users missing required permissions", () => {
    const authorization = authorize(
      {
        category: "ExecuteCommand",
        commandId: "project.update",
        input: "Update project",
      },
      ["ai.read"],
    );

    expect(authorization.decision).toBe("Denied");
    expect(authorization.missingPermissions).toEqual(["ai.project.mutate"]);
  });

  it("denies plans blocked by governance", () => {
    const authorization = authorize(
      {
        category: "ExecuteCommand",
        commandId: "admin.users.update",
        input: "Update users",
      },
      ["ai.administrative"],
    );

    expect(authorization.decision).toBe("Denied");
    expect(authorization.reason).toBe("Governance blocked the execution plan.");
  });

  it("fails safely for malformed plans and governance results", () => {
    const output = governed({ category: "Analyze", input: "Health" });
    const engine = new AuthorizationEngine();

    const malformedPlan = engine.authorize({
      governanceResult: output.governanceResult,
      plan: {} as AIExecutionPlan,
      userPermissions: ["ai.read"],
    });
    const malformedGovernance = engine.authorize({
      governanceResult: {} as AIGovernanceResult,
      plan: output.plan,
      userPermissions: ["ai.read"],
    });

    expect(malformedPlan.decision).toBe("Denied");
    expect(malformedPlan.scope.planSummary).toBe("Invalid execution plan");
    expect(malformedGovernance.decision).toBe("Denied");
  });
});

describe("ConfirmationEngine", () => {
  it("creates an immutable request from confirmation-required authorization", () => {
    const authorization = authorize(
      {
        category: "ExecuteCommand",
        commandId: "project.update",
        entityId: "project:1",
        input: "Update project",
      },
      ["ai.project.mutate"],
    );

    const request = new ConfirmationEngine().createRequest(authorization);

    expect(request).toEqual({
      affectedCommands: ["project.update"],
      affectedEntities: ["project:1"],
      confirmationType: "ProjectMutation",
      requiredPermissionLevel: "ProjectWrite",
      summary: "Confirm execution plan: Prepared a descriptive ExecuteCommand plan.",
    });
    expect(Object.isFrozen(request)).toBe(true);
    expect(Object.isFrozen(request?.affectedCommands)).toBe(true);
    expect(Object.isFrozen(request?.affectedEntities)).toBe(true);
  });

  it("does not create confirmation requests for authorized or denied plans", () => {
    const engine = new ConfirmationEngine();

    expect(
      engine.createRequest(
        authorize({ category: "Search", input: "Find projects" }, ["ai.read"]),
      ),
    ).toBeNull();
    expect(
      engine.createRequest(
        authorize({ category: "Search", input: "Find projects" }, []),
      ),
    ).toBeNull();
  });
});

describe("execution sessions", () => {
  it.each([
    ["Authorized", "Authorized"],
    ["ConfirmationRequired", "AwaitingConfirmation"],
    ["Denied", "Cancelled"],
  ] as const)("maps %s authorization to %s state", (decision, state) => {
    const fixture = sessionFixture(decision);
    const session = createExecutionSession(fixture);

    expect(session?.state).toBe(state);
    expect(Object.isFrozen(session)).toBe(true);
  });

  it("supports explicit immutable Proposed sessions", () => {
    const session = createExecutionSession({
      ...sessionFixture("Authorized"),
      state: "Proposed",
    });

    expect(session?.state).toBe("Proposed");
  });

  it("expires sessions deterministically and rejects malformed timestamps", () => {
    const expired = createExecutionSession({
      ...sessionFixture("Authorized"),
      currentTimestamp: "2026-07-18T10:00:00.000Z",
    });
    const malformed = createExecutionSession({
      ...sessionFixture("Authorized"),
      expiryTimestamp: "not-a-timestamp",
    });

    expect(expired?.state).toBe("Expired");
    expect(
      expired &&
        isExecutionSessionExpired(expired, "2026-07-18T10:00:00.000Z"),
    ).toBe(true);
    expect(malformed).toBeNull();
  });

  it("returns new session snapshots for valid transitions", () => {
    const awaiting = createExecutionSession(
      sessionFixture("ConfirmationRequired"),
    );
    const authorized = awaiting
      ? transitionExecutionSession(
          awaiting,
          "Authorized",
          "2026-07-18T09:05:00.000Z",
        )
      : null;

    expect(authorized?.state).toBe("Authorized");
    expect(awaiting?.state).toBe("AwaitingConfirmation");
    expect(authorized).not.toBe(awaiting);
    expect(
      authorized &&
        transitionExecutionSession(
          authorized,
          "Proposed",
          "2026-07-18T09:06:00.000Z",
        ),
    ).toBeNull();
    expect(
      createExecutionSession({
        ...sessionFixture("ConfirmationRequired"),
        state: "Authorized",
      }),
    ).toBeNull();
  });
});

describe("execution tokens", () => {
  it("creates immutable descriptive tokens for authorized sessions", () => {
    const session = createExecutionSession(sessionFixture("Authorized"));
    const token = session
      ? createExecutionToken({
          expiryTimestamp: "2026-07-18T09:15:00.000Z",
          issuedTimestamp: "2026-07-18T09:05:00.000Z",
          session,
          tokenId: "token-1",
        })
      : null;

    expect(token).toMatchObject({
      expiryTimestamp: "2026-07-18T09:15:00.000Z",
      issuedTimestamp: "2026-07-18T09:05:00.000Z",
      sessionId: "session-1",
      tokenId: "token-1",
    });
    expect(Object.isFrozen(token)).toBe(true);
    expect(Object.isFrozen(token?.authorizationScope)).toBe(true);
    expect(Object.isFrozen(token?.authorizationScope.commandIds)).toBe(true);
  });

  it("rejects tokens for unconfirmed, expired, or overlong sessions", () => {
    const awaiting = createExecutionSession(
      sessionFixture("ConfirmationRequired"),
    );
    const authorized = createExecutionSession(sessionFixture("Authorized"));

    expect(
      awaiting &&
        createExecutionToken({
          expiryTimestamp: "2026-07-18T09:15:00.000Z",
          issuedTimestamp: "2026-07-18T09:05:00.000Z",
          session: awaiting,
          tokenId: "token-awaiting",
        }),
    ).toBeNull();
    expect(
      authorized &&
        createExecutionToken({
          expiryTimestamp: "2026-07-18T10:00:00.000Z",
          issuedTimestamp: "2026-07-18T09:05:00.000Z",
          session: authorized,
          tokenId: "token-overlong",
        }),
    ).toBeNull();
    expect(
      authorized &&
        createExecutionToken({
          expiryTimestamp: "2026-07-18T10:15:00.000Z",
          issuedTimestamp: "2026-07-18T10:00:00.000Z",
          session: authorized,
          tokenId: "token-expired",
        }),
    ).toBeNull();
  });
});

function authorize(
  request: AIIntentRequest,
  userPermissions: readonly string[],
) {
  const output = governed(request);
  return new AuthorizationEngine().authorize({
    ...output,
    userPermissions,
  });
}

function governed(request: AIIntentRequest) {
  const plan = new AIPlatform().orchestrate(request, contextInput).plan;
  return {
    governanceResult: new GovernanceEngine().evaluate(plan),
    plan,
  };
}

function sessionFixture(decision: AuthorizationResult["decision"]) {
  const fixture = authorizationFixture(decision);
  const authorizationResult = new AuthorizationEngine().authorize({
    ...fixture.output,
    userPermissions: fixture.permissions,
  });
  const confirmationRequest = new ConfirmationEngine().createRequest(
    authorizationResult,
  );

  return {
    authorizationResult,
    confirmationRequest,
    creationTimestamp: createdAt,
    expiryTimestamp: expiresAt,
    governanceResult: fixture.output.governanceResult,
    plan: fixture.output.plan,
    sessionId: "session-1",
  };
}

function authorizationFixture(decision: AuthorizationResult["decision"]) {
  if (decision === "Authorized") {
    return {
      output: governed({ category: "Analyze", input: "Analyze health" }),
      permissions: ["ai.read"],
    };
  }

  const output = governed({
    category: "ExecuteCommand",
    commandId: "project.update",
    input: "Update project",
  });
  return {
    output,
    permissions: decision === "Denied" ? [] : ["ai.project.mutate"],
  };
}
