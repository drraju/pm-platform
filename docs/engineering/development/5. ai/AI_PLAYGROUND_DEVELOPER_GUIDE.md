# AI Playground Developer Guide

## Purpose

M9.5 introduces the internal AI Platform Playground and diagnostics foundation.
It is an engineering-only tool for executing and inspecting AI requests through
the existing platform runtime using the Mock Provider.

The Playground does not introduce external providers, network calls, streaming,
repositories, controllers inside the AI package, database access, production UI,
or customer-facing functionality.

## Location

Backend playground code lives under `backend/src/ai/playground/`.

| File | Responsibility |
| --- | --- |
| `playground.types.ts` | Playground request, response, trace, registry snapshot, and diagnostics contracts. |
| `ai-playground.service.ts` | Internal service API for execution, registry inspection, trace creation, event viewing, and replay. |

The internal UI shell lives at:

`frontend/app/(app)/ai-playground/page.tsx`

## Execution Path

Playground execution must follow the existing platform chain:

1. `AiPlaygroundService`
2. `InternalAiAssistantService`
3. Conversation Planner
4. AI Execution Engine
5. AI Gateway
6. Pipeline Engine
7. Mock Provider

The Playground must not bypass the assistant, execution engine, gateway,
pipeline, registries, or event bus.

## Trace Contract

Each playground execution returns an immutable trace containing:

- Request ID.
- Conversation ID.
- Execution ID.
- Selected capability.
- Selected conversation.
- Selected prompt metadata.
- Selected skill metadata.
- Selected provider metadata.
- Selected context metadata.
- Pipeline stages.
- Execution states.
- Timing.
- Diagnostics.
- Event Bus events for the execution.
- Final execution result.

## Registry Inspection

Registry inspection is read-only. The Playground exposes snapshots for:

- Capability Registry.
- Conversation Registry.
- Conversation Session Registry.
- Prompt Registry.
- Skill Registry.
- Provider Registry.

Do not mutate registry entries from the Playground.

## Replay

Replay accepts an existing execution trace and submits a new request through the
same assistant-to-execution path. Replay uses the Mock Provider only and exists
solely for debugging.

## Interactive Console

M9.6 adds an internal interactive execution console at `/ai-playground`.

The console provides:

- Capability selection.
- Conversation selection.
- Read-only Mock Provider selection.
- Project scope input.
- Multiline user request input.
- Execute and replay actions.
- Visual execution state progression.
- Execution result panel.
- Raw JSON tabs for request, response, trace, diagnostics, and events.
- Event timeline with timestamp, event name, duration, and execution ID.
- Last-20 in-memory execution history.
- Read-only registry inspector.

The page calls the internal `ai-playground` backend module, which delegates to
`AiPlaygroundService`. The backend service remains the source of truth for real
playground execution and replay.

## UI Status

The UI is an internal admin tool only. It is not a production chat surface and
does not expose customer-facing AI features.

The transport bridge is implemented outside `backend/src/ai` so the AI package
continues to have no controllers or persistence dependencies.

## Boundaries

Do not add OpenAI, Anthropic, Azure OpenAI, Gemini, Ollama, HTTP clients,
streaming, embeddings, vector search, knowledge retrieval, business logic,
repositories, database access, or customer-facing UI in the Playground.
