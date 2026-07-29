import { AiPromptVariableDefinition } from './prompt-platform.types';

export type AiPromptVariableResolutionRequest = {
  variables: readonly AiPromptVariableDefinition[];
};

export type AiPromptVariableResolutionResult = {
  resolvedVariableNames: readonly string[];
  unresolvedVariableNames: readonly string[];
};

export interface AiPromptVariableResolver {
  resolveVariables(
    request: AiPromptVariableResolutionRequest,
  ): Promise<AiPromptVariableResolutionResult>;
}

export interface AiUserPromptVariableResolver extends AiPromptVariableResolver {
  readonly scope: 'user';
}

export interface AiWorkspacePromptVariableResolver extends AiPromptVariableResolver {
  readonly scope: 'workspace';
}

export interface AiProjectPromptVariableResolver extends AiPromptVariableResolver {
  readonly scope: 'project';
}

export interface AiPortfolioPromptVariableResolver extends AiPromptVariableResolver {
  readonly scope: 'portfolio';
}

export interface AiTaskPromptVariableResolver extends AiPromptVariableResolver {
  readonly scope: 'task';
}

export interface AiCalendarPromptVariableResolver extends AiPromptVariableResolver {
  readonly scope: 'calendar';
}

export interface AiProviderPromptVariableResolver extends AiPromptVariableResolver {
  readonly scope: 'provider';
}

export interface AiCapabilityPromptVariableResolver extends AiPromptVariableResolver {
  readonly scope: 'capability';
}

export interface AiExecutionContextPromptVariableResolver extends AiPromptVariableResolver {
  readonly scope: 'execution-context';
}
