# AI Execution Engine Developer Guide

## Purpose

M9 introduces the AI Execution Engine for runtime orchestration across the
existing AI Platform foundation. It executes only through the existing mock
provider and does not use external AI SDKs, HTTP clients, provider APIs,
streaming, repositories, controllers, or database access.

## Location

Execution code lives under `backend/src/ai/execution/`.

| File | Responsibility |
| --- | --- |
| `execution-engine.types.ts` | Execution state, diagnostics, result, timing, and policy contracts. |
| `ai-execution-state-machine.service.ts` | Immutable metadata-driven state machine. |
| `ai-execution-coordinator.service.ts` | Runtime coordinator for pipeline, metadata selection, provider selection, mock execution, and lifecycle events. |
| `ai-execution-engine.service.ts` | Public execution engine service. |

## Runtime Flow

The M9 flow is:

1. Create execution state machine in `Created`.
2. Publish `ExecutionStarted`.
3. Validate request metadata.
4. Run the existing Gateway pipeline.
5. Select context metadata from existing Context Registry metadata.
6. Select prompt metadata through the Prompt Resolution Engine.
7. Select skill metadata through the Skill Resolution Service.
8. Select provider metadata through Provider Routing and Provider Registry.
9. Execute the existing Mock Provider.
10. Return an immutable execution result.

The engine does not execute prompts, retrieve context records, execute skills,
or call external AI providers.

## State Machine

Supported states:

- `Created`
- `Validated`
- `Planned`
- `ContextResolved`
- `PromptResolved`
- `SkillResolved`
- `ProviderSelected`
- `Executing`
- `Completed`
- `Failed`
- `Cancelled`
- `TimedOut`

Each transition creates a new immutable snapshot with a traceable transition
record. Invalid transitions are rejected.

## Result Contract

Execution results include:

- Execution ID.
- Request ID.
- State history.
- Diagnostics.
- Timing.
- Policies.
- Selected provider metadata.
- Selected prompt metadata.
- Selected skill metadata.
- Selected context metadata.
- Deterministic mock response payload.
- Error payloads for failed executions.

## Policies

M9 defines metadata contracts for:

- Timeout.
- Retry.
- Cancellation.
- Concurrency.
- Execution mode.

Policies are included in execution results for traceability. M9 does not add
background workers, queues, timers, external cancellation brokers, or retry
loops.

## Events

The Execution Engine publishes lifecycle events through the in-process AI Event
Bus:

- `ExecutionStarted`
- `ExecutionStateChanged`
- `ExecutionCompleted`
- `ExecutionFailed`
- `ExecutionCancelled`
- `ExecutionTimedOut`

Handlers remain optional and configuration-controlled.

## Boundaries

Do not add OpenAI, Anthropic, Gemini, Azure OpenAI, Ollama, HTTP clients,
streaming, embeddings, vector search, business logic, repositories,
controllers, database access, or external provider SDKs in this package without
an approved milestone and ADR where required.

Execution code may orchestrate existing AI Platform services through public
interfaces. It must not introduce new architecture direction or bypass the
Gateway, Registry Framework, Event Bus, or Common Contracts.
