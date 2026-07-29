# M7 Implementation Report: MCP Server and AI Service Bus Foundation

## Status

Complete.

## Scope Delivered

- Added in-process AI Service Bus under `backend/src/ai/common/events`.
- Added AI event contracts, publisher, subscriber, registry, handler metadata,
  publishing result, and diagnostics.
- Added metadata-only events for pipeline, context, prompt, skill, provider,
  MCP session, MCP server, tool, resource, prompt, and transport lifecycle
  signals.
- Added MCP server lifecycle metadata service.
- Added MCP session metadata, session registry, and session manager.
- Added MCP transport abstraction and transport registry.
- Added MCP Tool Registry on the Generic Registry Framework.
- Added MCP Resource Registry on the Generic Registry Framework.
- Added MCP Prompt Registry on the Generic Registry Framework.
- Added MCP Gateway Delegation boundary.
- Added focused Event Bus and MCP foundation tests.
- Added Event Bus and MCP developer documentation.

## Files Changed

- `backend/src/ai/ai.module.ts`
- `backend/src/ai/common/ai-config.service.ts`
- `backend/src/ai/common/events/ai-event-bus.service.ts`
- `backend/src/ai/common/events/ai-event-bus.service.spec.ts`
- `backend/src/ai/common/events/ai-event.interfaces.ts`
- `backend/src/ai/common/events/ai-event.types.ts`
- `backend/src/ai/common/events/index.ts`
- `backend/src/ai/common/index.ts`
- `backend/src/ai/common/tokens.ts`
- `backend/src/ai/mcp/index.ts`
- `backend/src/ai/mcp/mcp-foundation.service.spec.ts`
- `backend/src/ai/mcp/mcp-gateway-delegation.interface.ts`
- `backend/src/ai/mcp/mcp-gateway-delegation.service.ts`
- `backend/src/ai/mcp/mcp-platform.types.ts`
- `backend/src/ai/mcp/mcp-prompt.interface.ts`
- `backend/src/ai/mcp/mcp-prompt-registry.service.ts`
- `backend/src/ai/mcp/mcp-registry-base.ts`
- `backend/src/ai/mcp/mcp-resource.interface.ts`
- `backend/src/ai/mcp/mcp-resource-registry.service.ts`
- `backend/src/ai/mcp/mcp-server-lifecycle.service.ts`
- `backend/src/ai/mcp/mcp-session-manager.service.ts`
- `backend/src/ai/mcp/mcp-session-registry.service.ts`
- `backend/src/ai/mcp/mcp-tool.interface.ts`
- `backend/src/ai/mcp/mcp-tool-registry.service.ts`
- `backend/src/ai/mcp/mcp-transport.interface.ts`
- `backend/src/ai/mcp/mcp-transport-registry.service.ts`
- `docs/engineering/development/5. ai/AI_EVENT_BUS_DEVELOPER_GUIDE.md`
- `docs/engineering/development/5. ai/AI_MCP_PLATFORM_DEVELOPER_GUIDE.md`
- `docs/architecture/08-ai/implementation/M7_IMPLEMENTATION_REPORT.md`

## Architecture Compliance

- AI Service Bus is in-process only.
- MCP registries inherit from the Generic Registry Framework.
- MCP session and server lifecycle events publish through the AI Service Bus.
- MCP tool, resource, prompt, and transport registrations have event-backed
  metadata registration methods.
- Gateway delegation remains a boundary contract and does not invoke execution.
- No business tools, provider execution, AI execution, tool execution, resource
  retrieval, prompt execution, provider calls, LLM calls, streaming, business
  services, repositories, controllers, database access, transport
  implementation, WebSockets, SSE, HTTP endpoints, or JSON-RPC handling were
  introduced.

## ADR Impact

No ADR changes were made.

M7 implements the foundation required by ADR-AI-003 and preserves the approved
Gateway, Context, Prompt, Skill, Provider, Security, Audit, and Telemetry
boundaries.

## Testing

Required verification:

- TypeScript build.
- AI module lint.
- Focused MCP tests.
- Focused Event Bus tests.
- Architecture guardrail scan.
- Existing unit tests.

Focused M7 coverage includes:

- Event subscription, publishing, diagnostics, and unsubscribe behavior.
- MCP session open/close metadata and lifecycle event publishing.
- MCP server lifecycle metadata and lifecycle event publishing.
- MCP tool and transport registry metadata discovery.
- MCP gateway delegation boundary behavior.

## Known Issues

- None for M7 scope.

The full unit suite requires elevated local HTTP binding permissions for
supertest-backed API tests in this environment.

## Technical Debt

- Event bus does not persist events and has no external transport.
- MCP registries contain metadata infrastructure only.
- Session registry is in-memory only.
- Gateway delegation is a metadata boundary only and does not map protocol
  requests.
- No MCP protocol handling exists yet.

## Lessons Learned

- The Generic Registry Framework cleanly extends to MCP tool, resource, prompt,
  and transport registries.
- Keeping session lifecycle events on the AI Service Bus avoids direct
  cross-component coupling.
- Separating registry metadata from protocol handling keeps the MCP foundation
  safe to introduce before external client behavior exists.

## Remaining Work For M8

- Implement Internal AI Assistant foundation.
- Connect assistant entrypoints to the AI Gateway without bypassing the
  pipeline.
- Use existing context, prompt, skill, provider, event, audit, and telemetry
  boundaries.
