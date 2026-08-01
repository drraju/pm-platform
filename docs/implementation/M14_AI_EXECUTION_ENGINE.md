# M14 AI Execution Engine

## Repository Investigation

The repository already had `AiExecutionCoordinator` and `AiExecutionEngineService`, a lifecycle state machine, pipeline execution, M11 context assembly, M12 prompt composition, M13 skill resolution, provider routing, and provider-independent response contracts. M14 extends that coordinator rather than creating a second orchestration path.

## Execution Architecture

`AiExecutionEngineService` remains the public entry point. `AiExecutionCoordinator` orchestrates the existing services and owns lifecycle transitions. Business rules remain in the skill registry, context assembly service, prompt composition service, provider registry, and response validation boundary.

## Pipeline

The execution flow is:

1. Validate the request through the existing pipeline.
2. Resolve the requested or explicitly selected skill.
3. Validate required context and optional execution authorization.
4. Use the existing M11 assembled enterprise context.
5. Compose a M12 provider-independent prompt.
6. Select a provider through the provider routing and registry services.
7. Invoke the selected provider adapter.
8. Validate required provider response fields.
9. Normalize the result into `AiExecutionStructuredResponse`.
10. Return lifecycle state, diagnostics, and standardized errors.

## Execution Contracts

`AiExecutionRequest` now supports explicit skill and intent selection, preferred provider, response format, and authorization inputs while preserving the existing `AiRequest` contract. `AiExecutionStructuredResponse` provides normalized content, format, and provider metadata.

## Execution Result

`AiExecutionResult` now exposes the explicit intent, structured response, selected skill, selected provider, prompt/context metadata, lifecycle history, and standardized errors. Existing Playground fields remain compatible.

## Diagnostics

Diagnostics capture skill ID, intent ID, context item count, prompt token estimate, provider latency, completion status, provider candidates, context providers, prompt candidates, pipeline decisions, and lifecycle events.

## Error Handling

The engine maps failures to stable platform codes including `AI_SKILL_NOT_FOUND`, `AI_SKILL_UNAUTHORIZED`, `AI_CONTEXT_UNAVAILABLE`, `AI_PROVIDER_NOT_SELECTED`, `AI_PROVIDER_EXECUTION_UNSUPPORTED`, and `AI_RESPONSE_VALIDATION_FAILED`.

## Files Changed

- `backend/src/ai/execution/execution-engine.types.ts`
- `backend/src/ai/execution/ai-execution-coordinator.service.ts`
- `backend/src/ai/skills/ai-skill-resolution.service.ts`
- M14 execution-engine tests

## Testing

Coverage includes normal mock-provider execution, explicit skill and intent execution, authorization failure, provider-independent structured responses, diagnostics, Playground compatibility, skill registry behavior, prompt compatibility, and architecture guardrails.

## Future Extension Points

Future milestones can add independently testable stage classes, richer response schemas, provider usage accounting, real authorization providers, and controlled retry/timeout policies. Streaming, caching, memory, tools, RAG, agents, and autonomous workflows remain outside M14.
