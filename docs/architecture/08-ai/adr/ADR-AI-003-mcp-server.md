# ADR-AI-003: Model Context Protocol Server

## Status

Accepted.

## Context

PM Platform must interoperate with external AI clients including ChatGPT,
Codex, Cursor, Claude, Gemini, VS Code AI Extensions, and future
MCP-compatible clients. External AI clients need a standard way to discover and
consume PM Platform business context and capabilities.

The architecture must avoid exposing repositories, database entities, or
provider-specific internals to external systems.

## Decision

PM Platform will expose external AI interoperability through an Enterprise MCP
Server.

The MCP Server will provide:

- MCP Resources for read-oriented, permission-filtered business context.
- MCP Tools for governed business capability execution.
- MCP Prompts for approved AI workflow entrypoints.
- Capability discovery for authenticated clients.
- Session management and request correlation.
- AI client authentication and authorization delegation.

The MCP Server delegates business request orchestration to the AI Gateway and
must use the same security, context, prompt, provider, audit, and monitoring
controls as the internal AI Assistant.

## Rationale

MCP provides a standard protocol boundary for external AI systems. Using MCP
allows PM Platform to expose capabilities in a client-neutral way while keeping
business services, RBAC, context assembly, and audit inside PM Platform.

Delegating orchestration to the AI Gateway ensures external clients and
internal Assistant experiences follow the same platform rules.

## Alternatives Considered

| Alternative | Reason Rejected |
| --- | --- |
| Provide only REST APIs for external AI clients | REST remains useful, but MCP gives AI clients standardized resource, tool, prompt, and discovery semantics. |
| Build custom connectors per AI client | Increases maintenance and creates inconsistent authorization and capability behavior. |
| Let external clients query domain APIs directly | Exposes too much internal structure and weakens AI-specific governance. |
| Put provider routing in the MCP Server | Couples protocol interoperability to model-provider concerns and duplicates gateway responsibilities. |

## Consequences

Positive impacts:

- Enables standardized external AI integration.
- Keeps external AI clients behind the same governance boundary.
- Supports capability discovery without exposing persistence internals.
- Allows PM Platform to evolve providers without changing MCP contracts.

Negative impacts:

- Requires careful contract design for resources, tools, and prompts.
- Requires strong session and client trust management.

Trade-offs:

- MCP improves interoperability but does not eliminate the need for platform
  authorization, context filtering, and audit controls.

## Benefits

- External client interoperability.
- AI-native capability discovery.
- Clear resource, tool, and prompt taxonomy.
- Common internal and external AI request path.

## Risks

- Overly broad tools could expose sensitive capabilities.
- Poorly scoped resources could leak cross-workspace or cross-project context.
- MCP protocol evolution may require compatibility handling.

Mitigations include capability-level authorization, resource filtering, session
correlation, versioned contracts, and gateway delegation.

## Future Evolution

Future releases may add more MCP resources, higher-order tools, prompt
catalogs, client-specific capability negotiation, and enterprise policy
controls for allowed external clients.

## Related ADRs

- [ADR-AI-001: AI Platform Vision](ADR-AI-001-ai-platform-vision.md)
- [ADR-AI-002: AI Gateway Architecture](ADR-AI-002-ai-gateway.md)
- [ADR-AI-005: AI Skills Framework](ADR-AI-005-skills-framework.md)
- [ADR-AI-008: AI Security Model](ADR-AI-008-security.md)
- [ADR-AI-010: AI Extension Architecture](ADR-AI-010-extension-model.md)
