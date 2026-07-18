import { describe, expect, it, vi } from "vitest";
import {
  AI_INTENT_CATEGORIES,
  AIPlatform,
  ContextEngine,
  ExecutionCoordinator,
  IntentEngine,
  PlanningEngine,
  type AIContextInput,
  type AIIntent,
  type AIProvider,
} from "@/lib/ai";

const contextInput: AIContextInput = {
  availableCommands: [
    {
      id: "projects.new",
      navigationTarget: "/projects/new",
      title: "New Project",
    },
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
  permissions: ["project.read"],
  selectedEntity: {
    category: "Projects",
    id: "project:1",
    title: "Customer Upgrade",
  },
  selectedProject: { id: "project-1", name: "Customer Upgrade" },
};

describe("IntentEngine", () => {
  it("exposes every Stage 5.7 intent category", () => {
    expect(AI_INTENT_CATEGORIES).toEqual([
      "Search",
      "Navigate",
      "ExecuteCommand",
      "Summarize",
      "Explain",
      "Recommend",
      "Analyze",
      "Plan",
      "Unknown",
    ]);
    expect(Object.isFrozen(AI_INTENT_CATEGORIES)).toBe(true);
  });

  it.each(AI_INTENT_CATEGORIES.slice(0, -1))(
    "creates an immutable %s intent from an explicit category",
    (category) => {
      const intent = new IntentEngine().classify({
        category,
        input: "Review delivery health",
      });

      expect(intent).toEqual({
        category,
        input: "Review delivery health",
      });
      expect(Object.isFrozen(intent)).toBe(true);
    },
  );

  it("uses placeholder Unknown classification instead of parsing language", () => {
    const intent = new IntentEngine().classify({
      input: "navigate to the portfolio",
    });

    expect(intent).toEqual({
      category: "Unknown",
      input: "navigate to the portfolio",
      reason: "No intent category was supplied.",
    });
  });
});

describe("ContextEngine", () => {
  it("constructs an immutable, React-independent context snapshot", () => {
    const context = new ContextEngine().createContext(contextInput);

    expect(context).toEqual(contextInput);
    expect(Object.isFrozen(context)).toBe(true);
    expect(Object.isFrozen(context.permissions)).toBe(true);
    expect(Object.isFrozen(context.availableCommands)).toBe(true);
    expect(Object.isFrozen(context.availableCommands[0])).toBe(true);
    expect(Object.isFrozen(context.availableEntities)).toBe(true);
    expect(Object.isFrozen(context.availableEntities[0])).toBe(true);
    expect(Object.isFrozen(context.selectedProject)).toBe(true);
    expect(Object.isFrozen(context.selectedEntity)).toBe(true);
  });

  it("isolates context from subsequent input mutations", () => {
    const permissions = ["project.read"];
    const availableCommands = [{ id: "projects.open" }];
    const context = new ContextEngine().createContext({
      availableCommands,
      currentRoute: "/projects",
      permissions,
    });

    permissions.push("project.write");
    availableCommands[0].id = "changed";

    expect(context.permissions).toEqual(["project.read"]);
    expect(context.availableCommands[0]?.id).toBe("projects.open");
  });
});

describe("PlanningEngine", () => {
  it("consumes an intent and context to create a descriptive plan", () => {
    const context = new ContextEngine().createContext(contextInput);
    const intent = new IntentEngine().classify({
      category: "ExecuteCommand",
      commandId: "projects.new",
      input: "Create a project",
      navigationTarget: "/projects/new",
    });

    const plan = new PlanningEngine().createPlan(intent, context);

    expect(plan.steps).toEqual([
      {
        commandId: "projects.new",
        description: "Describe ExecuteCommand: Create a project",
        id: "step-1",
        navigationTarget: "/projects/new",
        type: "ExecuteCommand",
      },
    ]);
    expect(plan.summary).toBe("Prepared a descriptive ExecuteCommand plan.");
  });

  it("creates deeply immutable execution plans", () => {
    const context = new ContextEngine().createContext(contextInput);
    const intent = new IntentEngine().classify({
      category: "Navigate",
      entityId: "project:1",
      input: "Open the selected project",
      navigationTarget: "/projects/project-1",
    });

    const plan = new PlanningEngine().createPlan(intent, context);

    expect(Object.isFrozen(plan)).toBe(true);
    expect(Object.isFrozen(plan.intent)).toBe(true);
    expect(Object.isFrozen(plan.context)).toBe(true);
    expect(Object.isFrozen(plan.steps)).toBe(true);
    expect(Object.isFrozen(plan.steps[0])).toBe(true);
  });

  it("produces no executable steps for an unknown intent", () => {
    const context = new ContextEngine().createContext(contextInput);
    const intent = new IntentEngine().classify({ input: "Unclassified" });

    const plan = new PlanningEngine().createPlan(intent, context);

    expect(plan.steps).toEqual([]);
    expect(plan.summary).toBe("No intent category was supplied.");
  });
});

describe("ExecutionCoordinator", () => {
  it("returns references from a plan without executing capabilities", () => {
    const action = vi.fn();
    const navigate = vi.fn();
    const plan = planFor({
      category: "ExecuteCommand",
      commandId: "projects.new",
      input: "Create a project",
      navigationTarget: "/projects/new",
    });

    const result = new ExecutionCoordinator().coordinate(plan);

    expect(result.status).toBe("Planned");
    expect(result.references).toEqual({
      commandIds: ["projects.new"],
      entityIds: [],
      navigationTargets: ["/projects/new"],
    });
    expect(action).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("returns an immutable NoAction result for an empty plan", () => {
    const result = new ExecutionCoordinator().coordinate(
      planFor({ input: "Unclassified" }),
    );

    expect(result.status).toBe("NoAction");
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.references)).toBe(true);
    expect(Object.isFrozen(result.references.commandIds)).toBe(true);
  });
});

describe("AIPlatform", () => {
  it("coordinates intent, context, planning, and execution engines", () => {
    const intentEngine = new IntentEngine();
    const contextEngine = new ContextEngine();
    const planningEngine = new PlanningEngine();
    const executionCoordinator = new ExecutionCoordinator();
    const classify = vi.spyOn(intentEngine, "classify");
    const createContext = vi.spyOn(contextEngine, "createContext");
    const createPlan = vi.spyOn(planningEngine, "createPlan");
    const coordinate = vi.spyOn(executionCoordinator, "coordinate");
    const platform = new AIPlatform({
      contextEngine,
      executionCoordinator,
      intentEngine,
      planningEngine,
    });
    const request = {
      category: "Search" as const,
      entityId: "project:1",
      input: "Find the selected project",
    };

    const result = platform.orchestrate(request, contextInput);

    expect(classify).toHaveBeenCalledWith(request);
    expect(createContext).toHaveBeenCalledWith(contextInput);
    expect(createPlan).toHaveBeenCalledWith(result.plan.intent, result.plan.context);
    expect(coordinate).toHaveBeenCalledWith(result.plan);
    expect(result.references.entityIds).toEqual(["project:1"]);
  });

  it("does not call the future AI provider abstraction", () => {
    const context = new ContextEngine().createContext(contextInput);
    const plan = planFor({ category: "Explain", input: "Delivery health" });
    const provider = providerStub(plan);
    const platform = new AIPlatform();

    platform.orchestrate(
      { category: "Explain", input: "Delivery health" },
      context,
    );

    expect(provider.resolveIntent).not.toHaveBeenCalled();
    expect(provider.createPlan).not.toHaveBeenCalled();
    expect(provider.summarize).not.toHaveBeenCalled();
    expect(provider.explain).not.toHaveBeenCalled();
    expect(provider.analyze).not.toHaveBeenCalled();
  });
});

function planFor(request: Parameters<IntentEngine["classify"]>[0]) {
  const intent = new IntentEngine().classify(request);
  const context = new ContextEngine().createContext(contextInput);
  return new PlanningEngine().createPlan(intent, context);
}

function providerStub(plan: ReturnType<PlanningEngine["createPlan"]>): AIProvider {
  const response = Object.freeze({ content: "Future provider response" });
  return {
    analyze: vi.fn(() => response),
    createPlan: vi.fn(() => plan),
    explain: vi.fn(() => response),
    id: "future-provider",
    resolveIntent: vi.fn(
      (): AIIntent =>
        Object.freeze({ category: "Unknown", input: "", reason: "Stub" }),
    ),
    summarize: vi.fn(() => response),
  };
}
