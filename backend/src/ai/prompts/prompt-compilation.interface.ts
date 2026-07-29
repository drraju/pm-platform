import {
  AiPromptCompilationDiagnostics,
  AiPromptCompositionContract,
  AiPromptMetadata,
} from './prompt-platform.types';

export type AiPromptValidationResult = {
  errors: readonly string[];
  valid: boolean;
  warnings: readonly string[];
};

export type AiPromptCompilationPlan = {
  diagnostics: AiPromptCompilationDiagnostics;
  prompt: AiPromptMetadata;
};

export interface AiPromptValidator {
  validate(prompt: AiPromptMetadata): Promise<AiPromptValidationResult>;
}

export interface AiPromptComposer {
  compose(prompt: AiPromptMetadata): Promise<AiPromptCompositionContract>;
}

export interface AiPromptCompiler {
  compile(prompt: AiPromptMetadata): Promise<AiPromptCompilationPlan>;
}

export interface AiPromptOptimizer {
  optimize(plan: AiPromptCompilationPlan): Promise<AiPromptCompilationPlan>;
}

export interface AiPromptTokenEstimator {
  estimate(prompt: AiPromptMetadata): number;
}
