# M12 Intelligent Prompt Composition

## Repository Investigation

The existing prompt registry selects prompt metadata, while M11 assembles an authorization-filtered `EnterpriseContext` into execution prompt metadata. Provider adapters receive an `AiProviderExecutionRequest`; OpenAI previously converted only the raw input into one user message. The execution coordinator is the first shared boundary with both the original input and the assembled enterprise context.

## Architecture

`PromptCompositionService` is a provider-independent orchestration service. It creates a typed `PromptModel`, and `PromptFormatter` implementations translate that model into provider-native payload fragments. The coordinator composes immediately before provider execution, preserving the existing pipeline and provider registry.

## Prompt Composition Flow

1. M11 supplies authorized `EnterpriseContext`.
2. The coordinator passes user input and context to M12.
3. M12 emits deterministic ordered sections and applies a token budget.
4. The selected provider formatter renders the model. OpenAI currently consumes the formatted sections through its request mapper.

## Prompt Section Design

Sections are independently rendered and included only when non-empty: system, user intent, workspace, project, execution, task, RAID, document, constraints, instructions, and response format. Fixed priorities and fixed ordering make trimming deterministic.

## Prompt Model

`PromptModel` contains typed system/developer/user slots, ordered `PromptSection` values, metadata, and provider hints. It contains no provider-native request shape.

## Provider Formatter Design

`PromptFormatter<TFormatted>` owns provider translation. `OpenAIPromptFormatter` maps sections to system, user, or developer messages. Additional providers can add formatters without changing composition logic.

## Token Budget Strategy

The estimator uses a deterministic four-characters-per-token approximation. Sections are considered in priority order; content is truncated at the remaining budget, and diagnostics report omitted sections, the configured budget, and the final estimate.

## Authorization

M12 consumes only the `EnterpriseContext` produced by M11. It does not read raw repositories or bypass M11 authorization and sensitive-data filtering.

## Files Changed

- `backend/src/ai/prompts/prompt-composition.types.ts`
- `backend/src/ai/prompts/prompt-composition.service.ts`
- `backend/src/ai/prompts/prompt-formatter.interface.ts`
- `backend/src/ai/providers/openai/openai-prompt-formatter.ts`
- `backend/src/ai/providers/openai/openai-request.mapper.ts`
- `backend/src/ai/execution/ai-execution-coordinator.service.ts`
- `backend/src/ai/ai.module.ts`
- Focused prompt composition and formatter tests

## Testing

Tests cover deterministic output, section ordering, empty-section removal, budget trimming, and OpenAI formatting. Backend build and the focused M12 suites pass.

## Future Extension Points

Future work can add provider formatters, model-specific budgets, richer tokenizers, and approved reusable section templates. Reasoning, RAG, memory, tools, and agent behavior remain outside M12.
