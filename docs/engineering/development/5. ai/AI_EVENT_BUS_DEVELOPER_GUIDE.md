# AI Event Bus Developer Guide

## Purpose

The AI Event Bus is an in-process metadata event bus for AI Platform lifecycle
signals. In M7 it provides event contracts, handler registration,
subscription, publishing, diagnostics, and feature-ready metadata.

It does not use external brokers or infrastructure.

## Location

Event bus code lives under `backend/src/ai/common/events/`.

| File | Responsibility |
| --- | --- |
| `ai-event.types.ts` | Event names, event metadata, handler metadata, publish result, and diagnostics. |
| `ai-event.interfaces.ts` | Publisher, subscriber, and registry contracts. |
| `ai-event-bus.service.ts` | In-process event bus implementation. |

## Supported Events

M7 defines metadata-only events for:

- `ExecutionStarted`
- `ExecutionStateChanged`
- `ExecutionCompleted`
- `ExecutionFailed`
- `ExecutionCancelled`
- `ExecutionTimedOut`
- `PipelineStarted`
- `PipelineCompleted`
- `ContextResolved`
- `PromptResolved`
- `SkillResolved`
- `ProviderSelected`
- `McpSessionOpened`
- `McpSessionClosed`
- `McpServerInitialized`
- `McpServerStopped`
- `ToolRegistered`
- `ResourceRegistered`
- `McpPromptRegistered`
- `McpTransportRegistered`

The list is intentionally contract-oriented. Publishing an event does not
trigger orchestration unless a future milestone explicitly adds a handler.

## Usage

Consumers should inject `AIEventBusService` through Nest dependency injection.

Handlers declare:

- Handler ID.
- Event name.
- Name.
- Priority.
- Version.
- Enabled state.

Publishing is synchronous in-process from the caller perspective and returns
handler delivery diagnostics.

## Boundaries

Do not add Redis, Kafka, Azure Service Bus, queues, background workers, or
network transport behavior in this package without an approved architecture
update.

Events must carry safe metadata only. They must not include provider payloads,
prompt bodies, business records, secrets, or persistence entities.
