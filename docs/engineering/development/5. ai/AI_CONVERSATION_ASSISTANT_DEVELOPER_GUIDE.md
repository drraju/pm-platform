# AI Conversation and Internal Assistant Developer Guide

## Purpose

M8 introduces the Conversation Platform and Internal AI Assistant foundation.
It is an orchestration boundary only. It prepares assistant requests for the
AI Gateway without executing providers, prompts, context retrieval, skills, LLM
calls, or MCP protocol behavior.

## Location

Conversation code lives under `backend/src/ai/conversation/`.

| File | Responsibility |
| --- | --- |
| `conversation-platform.types.ts` | Conversation contracts, immutable `AIRequestDescriptor`, session metadata, memory metadata, and plan metadata. |
| `built-in-conversation-definitions.ts` | Built-in metadata definitions for platform-owned conversations. |
| `conversation-registry.service.ts` | Generic Registry Framework-backed conversation metadata registry. |
| `conversation-session-registry.service.ts` | In-memory session metadata registry. |
| `conversation-planner.service.ts` | Metadata planner that creates sessions, memory metadata, and AI request descriptors. |

Internal Assistant code lives under `backend/src/ai/assistant/`.

| File | Responsibility |
| --- | --- |
| `internal-ai-assistant.service.ts` | Internal assistant entry point that submits planned requests through the AI Gateway only. |

## Request Flow

The M8 request flow is intentionally narrow:

1. Internal assistant receives a request.
2. Conversation planner resolves conversation metadata.
3. Planner creates immutable `AIRequestDescriptor`.
4. Planner registers in-memory session metadata and memory metadata.
5. Assistant converts the descriptor to an `AiRequest`.
6. Assistant submits the request through `AiGateway.acceptRequest`.

The AI Gateway remains the only orchestration path for assistant requests.

## Boundaries

Conversation Platform may depend on `ai/common` contracts only.

Internal Assistant may depend on:

- `ai/common`
- `ai/conversation`
- `ai/gateway`

Internal Assistant must not depend directly on providers, context, prompts,
skills, or MCP packages. It must not call provider execution, prompt execution,
context retrieval, skill execution, LLM APIs, or MCP protocol handlers.

## Configuration

Conversation definitions support feature flags using the following pattern:

`AI_CONVERSATION_<CONVERSATION_ID>_ENABLED`

Conversation IDs are normalized by replacing non-alphanumeric characters with
underscores and uppercasing the value.

Example:

`AI_CONVERSATION_INTERNAL_ASSISTANT_CONVERSATION_ENABLED=false`

## Extension Points

Future milestones may add conversation definitions, planning policies, durable
memory, and assistant workflows. Those changes must preserve the M8 boundary:
assistant entry points submit through the AI Gateway and do not invoke AI
subsystems directly.

Any change that introduces new architecture behavior, persistence, external
provider execution, prompt execution, context retrieval, skill execution, or
MCP protocol execution requires the relevant implementation milestone scope and
an ADR if it changes the frozen architecture.
