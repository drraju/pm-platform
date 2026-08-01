export type PromptSectionType =
  | 'system'
  | 'user-intent'
  | 'workspace'
  | 'project'
  | 'execution'
  | 'task'
  | 'raid'
  | 'document'
  | 'constraints'
  | 'instructions'
  | 'response-format';

export type PromptSection = {
  content: string;
  id: string;
  priority: number;
  tokenEstimate: number;
  type: PromptSectionType;
};

export type PromptResponseFormat =
  | 'plain-text'
  | 'markdown'
  | 'json'
  | 'bullet-summary'
  | 'executive-summary'
  | 'implementation-guidance';

export type PromptModel = {
  developerPrompt: PromptSection | null;
  metadata: Readonly<Record<string, string | number | boolean>>;
  providerHints: Readonly<Record<string, string | number | boolean>>;
  sections: readonly PromptSection[];
  systemPrompt: PromptSection | null;
  userPrompt: PromptSection | null;
};

export type PromptCompositionRequest = {
  capabilityId: string;
  enterpriseContext?: EnterpriseContextForPrompt | null;
  input: unknown;
  maxTokens?: number;
  responseFormat?: PromptResponseFormat;
};

export type EnterpriseContextForPrompt = {
  documents: readonly unknown[];
  executionUpdates: readonly unknown[];
  projects: readonly unknown[];
  raidItems: readonly unknown[];
  tasks: readonly unknown[];
  workspace: unknown;
};

export type PromptCompositionResult = {
  diagnostics: {
    omittedSectionIds: readonly string[];
    tokenBudget: number;
    tokenEstimate: number;
  };
  prompt: PromptModel;
};
