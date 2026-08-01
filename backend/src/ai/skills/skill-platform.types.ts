import type { ContextType, PromptCategory, ProviderFeature } from '../common';
import type { PromptResponseFormat } from '../prompts';

export type AiSkillCategory =
  | 'project-delivery'
  | 'raid'
  | 'timeline'
  | 'portfolio'
  | 'resource'
  | 'document'
  | 'governance'
  | 'assistant';

export type AiSkillLifecycleStatus =
  | 'draft'
  | 'experimental'
  | 'preview'
  | 'active'
  | 'deprecated'
  | 'retired';

export type AiSkillSecurityClassification =
  | 'public'
  | 'internal'
  | 'confidential'
  | 'restricted';

export type AiProviderFeature = ProviderFeature;

export type AiSkillDependencyRequiredness = 'required' | 'optional';

export type AiSkillAuthorizationRules = {
  allowSensitiveContext: boolean;
  allowedRoles?: readonly string[];
  requiredPermissions: readonly string[];
};

export type AiSkillContextRequirements = {
  optional: readonly ContextType[];
  required: readonly ContextType[];
};

export type AiSkillDependencyMetadata = {
  capabilities: readonly {
    capabilityId: string;
    requiredness: AiSkillDependencyRequiredness;
  }[];
  contextTypes: readonly {
    contextType: ContextType;
    requiredness: AiSkillDependencyRequiredness;
  }[];
  futureAgentDependencies: readonly {
    agentId: string;
    requiredness: AiSkillDependencyRequiredness;
  }[];
  futureSkillDependencies: readonly {
    requiredness: AiSkillDependencyRequiredness;
    skillId: string;
    versionRange?: string;
  }[];
  promptCategories: readonly {
    category: PromptCategory;
    requiredness: AiSkillDependencyRequiredness;
  }[];
  providerFeatures: readonly {
    feature: AiProviderFeature;
    requiredness: AiSkillDependencyRequiredness;
  }[];
};

export type AiSkillMetadata = {
  authorizationRules: AiSkillAuthorizationRules;
  category: AiSkillCategory;
  contextRequirements: AiSkillContextRequirements;
  description: string;
  dependencies: AiSkillDependencyMetadata;
  id: string;
  lifecycleStatus: AiSkillLifecycleStatus;
  name: string;
  displayName: string;
  owner: string;
  priority: number;
  requiredCapabilities: readonly string[];
  requiredPromptCategories: readonly PromptCategory[];
  requiredProviderFeatures: readonly AiProviderFeature[];
  securityClassification: AiSkillSecurityClassification;
  supportedResponseFormats: readonly PromptResponseFormat[];
  supportedContextTypes: readonly ContextType[];
  version: string;
};

export type AiSkillRegistryDiagnostics = {
  disabledSkillIds: readonly string[];
  enabledSkillIds: readonly string[];
  skillCount: number;
  skillLifecycle: readonly {
    lifecycleStatus: AiSkillLifecycleStatus;
    skillId: string;
  }[];
};

export type AiSkillResolutionRequest = {
  capabilityId?: string;
  contextTypes?: readonly ContextType[];
  promptCategories?: readonly PromptCategory[];
  providerFeatures?: readonly AiProviderFeature[];
  skillId?: string;
};

export type AiSkillResolutionDiagnostics = {
  candidateSkillIds: readonly string[];
  omittedSkillIds: readonly string[];
  selectedSkillId?: string;
};

export type AiSkillResolutionResult = {
  diagnostics: AiSkillResolutionDiagnostics;
  skill: AiSkillMetadata | null;
};

export type AiSkillDependencyGraphNode = {
  lifecycleStatus: AiSkillLifecycleStatus;
  skillId: string;
  version: string;
};

export type AiSkillDependencyGraphEdgeType =
  | 'capability'
  | 'context'
  | 'prompt'
  | 'provider-feature'
  | 'future-skill'
  | 'future-agent';

export type AiSkillDependencyGraphEdge = {
  fromSkillId: string;
  requiredness: AiSkillDependencyRequiredness;
  targetId: string;
  type: AiSkillDependencyGraphEdgeType;
};

export type AiSkillDependencyGraph = {
  edges: readonly AiSkillDependencyGraphEdge[];
  nodes: readonly AiSkillDependencyGraphNode[];
};
