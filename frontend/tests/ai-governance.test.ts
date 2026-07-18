import { describe, expect, it } from "vitest";
import {
  AIPlatform,
  ContextEngine,
  IntentEngine,
  PlanningEngine,
  type AIContextInput,
  type AIExecutionPlan,
  type AIIntentRequest,
} from "@/lib/ai";
import {
  ConfirmationPolicy,
  GovernanceEngine,
  PolicyEngine,
  ValidationEngine,
} from "@/lib/ai/governance";

const contextInput: AIContextInput = {
  availableCommands: [
    { id: "workspace.refresh", title: "Refresh workspace" },
    { id: "project.update", title: "Update project" },
    { id: "admin.users.update", title: "Update users" },
  ],
  availableEntities: [
    {
      category: "Projects",
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

describe("ConfirmationPolicy", () => {
  it("classifies read-only and navigation actions", () => {
    const policy = new ConfirmationPolicy();

    expect(policy.evaluate(planFor({ category: "Analyze", input: "Health" })))
      .toEqual({
        actions: [{ actionClass: "ReadOnly", stepId: "step-1" }],
        required: false,
      });
    expect(
      policy.evaluate(
        planFor({
          category: "Navigate",
          input: "Open project",
          navigationTarget: "/projects/project-1",
        }),
      ),
    ).toEqual({
      actions: [{ actionClass: "Navigation", stepId: "step-1" }],
      required: true,
    });
  });

  it("supports configured workspace and project mutation classes", () => {
    const policy = new ConfirmationPolicy({
      commandClassifications: {
        "project.update": "ProjectMutation",
        "workspace.refresh": "WorkspaceMutation",
      },
    });

    expect(
      policy.evaluate(
        planFor({
          category: "ExecuteCommand",
          commandId: "workspace.refresh",
          input: "Refresh workspace",
        }),
      ).actions[0]?.actionClass,
    ).toBe("WorkspaceMutation");
    expect(
      policy.evaluate(
        planFor({
          category: "ExecuteCommand",
          commandId: "project.update",
          input: "Update project",
        }),
      ).actions[0]?.actionClass,
    ).toBe("ProjectMutation");
  });

  it("classifies administrative command namespaces conservatively", () => {
    const assessment = new ConfirmationPolicy().evaluate(
      planFor({
        category: "ExecuteCommand",
        commandId: "admin.users.update",
        input: "Update users",
      }),
    );

    expect(assessment.actions[0]?.actionClass).toBe("Administrative");
    expect(assessment.required).toBe(true);
  });
});

describe("ValidationEngine", () => {
  it("accepts immutable plans whose references exist in context", () => {
    const validation = new ValidationEngine().validate(
      planFor({
        category: "Search",
        entityId: "project:1",
        input: "Find project",
      }),
    );

    expect(validation).toEqual({ issues: [], status: "Valid" });
    expect(Object.isFrozen(validation)).toBe(true);
  });

  it("rejects unknown command references", () => {
    const validation = new ValidationEngine().validate(
      planFor({
        category: "ExecuteCommand",
        commandId: "projects.missing",
        input: "Run missing command",
      }),
    );

    expect(validation.status).toBe("Invalid");
    expect(validation.issues).toContainEqual(
      expect.objectContaining({
        code: "UnknownCommand",
        referenceId: "projects.missing",
      }),
    );
  });

  it("rejects unknown entity references", () => {
    const validation = new ValidationEngine().validate(
      planFor({
        category: "Search",
        entityId: "project:missing",
        input: "Find missing project",
      }),
    );

    expect(validation.status).toBe("Invalid");
    expect(validation.issues[0]).toMatchObject({
      code: "UnknownEntity",
      referenceId: "project:missing",
    });
  });

  it("rejects mutable and structurally invalid plans", () => {
    const mutablePlan = { ...planFor({ category: "Explain", input: "Health" }) };
    const validator = new ValidationEngine();

    expect(validator.validate(mutablePlan).issues).toContainEqual(
      expect.objectContaining({ code: "MutablePlan" }),
    );
    expect(validator.validate({}).issues).toEqual([
      expect.objectContaining({ code: "InvalidPlan" }),
    ]);
  });

  it("rejects unsupported action types", () => {
    const plan = planFor({ category: "Analyze", input: "Health" });
    const unsupportedPlan = Object.freeze({
      ...plan,
      steps: Object.freeze([
        Object.freeze({ ...plan.steps[0], type: "UnsupportedMutation" }),
      ]),
    });

    const validation = new ValidationEngine().validate(unsupportedPlan);

    expect(validation.issues).toContainEqual(
      expect.objectContaining({ code: "UnsupportedActionType" }),
    );
  });
});

describe("PolicyEngine", () => {
  it("allows valid read-only plans", () => {
    const governance = new GovernanceEngine().evaluate(
      planFor({ category: "Summarize", input: "Project health" }),
    );

    expect(governance.policy.decision).toBe("Allowed");
    expect(governance.confirmationRequired).toBe(false);
  });

  it("requires confirmation for navigation and mutations", () => {
    const governance = new GovernanceEngine().evaluate(
      planFor({
        category: "ExecuteCommand",
        commandId: "project.update",
        input: "Update project",
      }),
    );

    expect(governance.policy.decision).toBe("RequiresConfirmation");
    expect(governance.confirmationRequired).toBe(true);
  });

  it("blocks administrative actions", () => {
    const governance = new GovernanceEngine().evaluate(
      planFor({
        category: "ExecuteCommand",
        commandId: "admin.users.update",
        input: "Update users",
      }),
    );

    expect(governance.policy.decision).toBe("Blocked");
    expect(governance.confirmationRequired).toBe(false);
  });

  it("blocks invalid plans before confirmation evaluation", () => {
    const validation = new ValidationEngine().validate({});
    const confirmation = Object.freeze({
      actions: Object.freeze([]),
      required: false,
    });

    expect(new PolicyEngine().decide(validation, confirmation).decision).toBe(
      "Blocked",
    );
  });
});

describe("GovernanceEngine", () => {
  it("fails unknown input safely", () => {
    const governance = new GovernanceEngine().evaluate(
      planFor({ input: "Unclassified request" }),
    );

    expect(governance.validation.status).toBe("Invalid");
    expect(governance.validation.issues[0]?.code).toBe("UnknownIntent");
    expect(governance.policy.decision).toBe("Blocked");
    expect(governance.confirmation.actions).toEqual([]);
  });

  it("returns an immutable unified governance result and audit record", () => {
    const governance = new GovernanceEngine().evaluate(
      planFor({ category: "Explain", input: "Delivery health" }),
    );

    expect(governance.auditRecord).toMatchObject({
      confirmationRequired: false,
      intent: { category: "Explain", input: "Delivery health" },
      policyDecision: "Allowed",
      validationIssueCodes: [],
      validationStatus: "Valid",
    });
    expect(Object.isFrozen(governance)).toBe(true);
    expect(Object.isFrozen(governance.auditRecord)).toBe(true);
    expect(Object.isFrozen(governance.auditRecord.intent)).toBe(true);
    expect(Object.isFrozen(governance.auditRecord.plan)).toBe(true);
    expect(Object.isFrozen(governance.auditRecord.plan.steps)).toBe(true);
  });

  it("creates descriptive audit snapshots for invalid plan input", () => {
    const audit = new GovernanceEngine().evaluate(null).auditRecord;

    expect(audit.intent).toEqual({ category: "Unknown", input: "" });
    expect(audit.plan).toEqual({
      steps: [],
      summary: "Invalid execution plan",
    });
    expect(audit.validationIssueCodes).toEqual(["InvalidPlan"]);
  });

  it("composes with AIPlatform output without modifying either layer", () => {
    const orchestration = new AIPlatform().orchestrate(
      { category: "Search", entityId: "project:1", input: "Find project" },
      contextInput,
    );

    const governance = new GovernanceEngine().evaluate(orchestration.plan);

    expect(governance.validation.status).toBe("Valid");
    expect(governance.policy.decision).toBe("Allowed");
    expect(orchestration.status).toBe("Planned");
  });
});

function planFor(request: AIIntentRequest): AIExecutionPlan {
  const intent = new IntentEngine().classify(request);
  const context = new ContextEngine().createContext(contextInput);
  return new PlanningEngine().createPlan(intent, context);
}
