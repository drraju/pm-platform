import {
  ContextType,
  ExecutionContextMetadata,
  PromptCategory,
} from '../common';

export type AiPromptCategory = PromptCategory;

export type AiPromptSecurityClassification =
  | 'public'
  | 'internal'
  | 'confidential'
  | 'restricted';

export type AiPromptLifecycleStatus =
  | 'draft'
  | 'review'
  | 'approved'
  | 'deprecated'
  | 'retired';

export type AiPromptVariableScope =
  | 'user'
  | 'workspace'
  | 'project'
  | 'portfolio'
  | 'task'
  | 'calendar'
  | 'provider'
  | 'capability'
  | 'execution-context';

export type AiPromptVariableDefinition = {
  description?: string;
  name: string;
  required: boolean;
  scope: AiPromptVariableScope;
};

export type AiPromptMetadata = {
  capabilityId: string;
  category: AiPromptCategory;
  estimatedTokens: number;
  id: string;
  lifecycleStatus: AiPromptLifecycleStatus;
  name: string;
  owner: string;
  priority: number;
  securityClassification: AiPromptSecurityClassification;
  supportedContextTypes: readonly ContextType[];
  variables: readonly AiPromptVariableDefinition[];
  version: string;
};

export type AiPromptSelectionRequest = {
  capabilityId: string;
  contextTypes?: readonly ContextType[];
  executionContext: ExecutionContextMetadata;
};

export type AiPromptSelectionResult = {
  diagnostics: AiPromptResolutionDiagnostics;
  prompt: AiPromptMetadata | null;
};

export type AiPromptCompositionContract = {
  inheritanceChain: readonly string[];
  overrides: readonly AiPromptOverrideContract[];
  precedence: readonly string[];
  promptId: string;
};

export type AiPromptOverrideContract = {
  field: string;
  reason: string;
  sourcePromptId: string;
};

export type AiPromptResolutionDiagnostics = {
  candidatePromptIds: readonly string[];
  omittedPromptIds: readonly string[];
  precedenceApplied: readonly string[];
  selectedPromptId?: string;
};

export type AiPromptRegistryDiagnostics = {
  disabledPromptIds: readonly string[];
  enabledPromptIds: readonly string[];
  promptCount: number;
  promptLifecycle: readonly {
    lifecycleStatus: AiPromptLifecycleStatus;
    promptId: string;
  }[];
};

export type AiPromptCompilationDiagnostics = {
  estimatedTokens: number;
  optimizationApplied: boolean;
  promptId: string;
  validationWarnings: readonly string[];
};
