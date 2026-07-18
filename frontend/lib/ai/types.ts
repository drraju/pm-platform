export const AI_INTENT_CATEGORIES = Object.freeze([
  "Search",
  "Navigate",
  "ExecuteCommand",
  "Summarize",
  "Explain",
  "Recommend",
  "Analyze",
  "Plan",
  "Unknown",
] as const);

export type AIIntentCategory = (typeof AI_INTENT_CATEGORIES)[number];

export type AIIntentRequest = Readonly<{
  category?: AIIntentCategory;
  commandId?: string;
  entityId?: string;
  input: string;
  navigationTarget?: string;
}>;

export type AIIntent = Readonly<{
  category: AIIntentCategory;
  commandId?: string;
  entityId?: string;
  input: string;
  navigationTarget?: string;
  reason?: string;
}>;

export type AISelectedProject = Readonly<{
  id: string;
  name?: string;
}>;

export type AISelectedEntity = Readonly<{
  category?: string;
  id: string;
  title?: string;
}>;

export type AICommandReference = Readonly<{
  id: string;
  navigationTarget?: string;
  title?: string;
}>;

export type AIEntityReference = Readonly<{
  category?: string;
  id: string;
  navigationTarget?: string;
  title?: string;
}>;

export type AIContextInput = Readonly<{
  availableCommands?: readonly AICommandReference[];
  availableEntities?: readonly AIEntityReference[];
  currentRoute: string;
  currentWorkspace?: string;
  permissions?: readonly string[];
  selectedEntity?: AISelectedEntity;
  selectedProject?: AISelectedProject;
}>;

export type AIContext = Readonly<{
  availableCommands: readonly AICommandReference[];
  availableEntities: readonly AIEntityReference[];
  currentRoute: string;
  currentWorkspace?: string;
  permissions: readonly string[];
  selectedEntity?: AISelectedEntity;
  selectedProject?: AISelectedProject;
}>;

export type AIExecutionStep = Readonly<{
  commandId?: string;
  description: string;
  entityId?: string;
  id: string;
  navigationTarget?: string;
  type: Exclude<AIIntentCategory, "Unknown">;
}>;

export type AIExecutionPlan = Readonly<{
  context: AIContext;
  intent: AIIntent;
  steps: readonly AIExecutionStep[];
  summary: string;
}>;

export type AIExecutionReferences = Readonly<{
  commandIds: readonly string[];
  entityIds: readonly string[];
  navigationTargets: readonly string[];
}>;

export type AIOrchestrationResult = Readonly<{
  plan: AIExecutionPlan;
  references: AIExecutionReferences;
  status: "Planned" | "NoAction";
}>;

export type AIProviderResponse = Readonly<{
  content: string;
}>;
