# AI MCP Platform Developer Guide

## Purpose

The MCP Platform foundation provides metadata contracts for external AI client
interoperability through MCP. M7 establishes lifecycle, sessions, registries,
transport abstraction, and gateway delegation boundaries only.

No business tools, resource retrieval, prompt execution, provider calls, model
execution, endpoints, transport implementation, or protocol handling are
implemented in M7.

## Module Layout

MCP code lives under `backend/src/ai/mcp/`.

| File | Responsibility |
| --- | --- |
| `mcp-platform.types.ts` | Server, session, transport, tool, resource, prompt, diagnostics, and delegation metadata. |
| `mcp-server-lifecycle.service.ts` | Metadata-only server lifecycle state and lifecycle events. |
| `mcp-session-registry.service.ts` | In-memory session metadata registry. |
| `mcp-session-manager.service.ts` | Session open and close metadata flow with event publishing. |
| `mcp-registry-base.ts` | Generic Registry Framework adapter for MCP registries. |
| `mcp-tool-registry.service.ts` | Tool metadata registry. |
| `mcp-resource-registry.service.ts` | Resource metadata registry. |
| `mcp-prompt-registry.service.ts` | MCP prompt entrypoint metadata registry. |
| `mcp-transport-registry.service.ts` | Transport metadata registry. |
| `mcp-gateway-delegation.service.ts` | Gateway delegation boundary. |

## Session Metadata

Sessions include:

- Session ID.
- Connection ID.
- Client ID.
- Client type.
- Protocol version.
- Capabilities.
- Created time.
- Last activity.
- State.

Session open and close publish `McpSessionOpened` and `McpSessionClosed` events
through the AI Event Bus.

## Registries

All MCP registries inherit from the Generic Registry Framework:

- Tool Registry.
- Resource Registry.
- Prompt Registry.
- Transport Registry.

Registries support metadata registration, discovery, priority ordering,
enable/disable behavior, lifecycle metadata, diagnostics, duplicate detection,
validation through the shared registry base, and feature flag awareness.

## Feature Flags

MCP registry entries can be disabled with:

```text
AI_MCP_<ENTRY_TYPE>_<ENTRY_ID>_ENABLED=false
```

Examples:

```text
AI_MCP_TOOL_PROJECT_SUMMARY_ENABLED=false
AI_MCP_RESOURCE_PROJECT_CONTEXT_ENABLED=false
AI_MCP_PROMPT_STATUS_BRIEF_ENABLED=false
AI_MCP_TRANSPORT_STDIO_ENABLED=false
```

## Gateway Delegation

MCP must delegate orchestration to the AI Gateway. It must not bypass:

- Gateway.
- Pipeline.
- Context Registry.
- Prompt Resolution.
- Skill Resolution.
- Provider Registry.
- Security.
- Audit.
- Telemetry.

M7 only exposes a delegation boundary contract and metadata acknowledgment. It
does not map protocol requests or invoke the Gateway.

## Forbidden In M7

Do not implement:

- Tool execution.
- Resource retrieval.
- Prompt execution.
- Provider calls.
- LLM calls.
- Streaming.
- Business services.
- Repositories.
- Controllers.
- Database access.
- Transport implementation.
- WebSockets.
- SSE.
- HTTP endpoints.
- JSON-RPC handling.
