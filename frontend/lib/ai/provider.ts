import type {
  AIContext,
  AIExecutionPlan,
  AIIntent,
  AIIntentRequest,
  AIProviderResponse,
} from "./types";

export type MaybePromise<T> = T | Promise<T>;

export interface AIProvider {
  readonly id: string;
  analyze(input: string, context: AIContext): MaybePromise<AIProviderResponse>;
  createPlan(
    intent: AIIntent,
    context: AIContext,
  ): MaybePromise<AIExecutionPlan>;
  explain(input: string, context: AIContext): MaybePromise<AIProviderResponse>;
  resolveIntent(
    request: AIIntentRequest,
    context: AIContext,
  ): MaybePromise<AIIntent>;
  summarize(
    input: string,
    context: AIContext,
  ): MaybePromise<AIProviderResponse>;
}
