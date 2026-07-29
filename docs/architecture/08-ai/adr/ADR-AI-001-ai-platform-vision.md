# ADR-AI-001: AI Platform Vision

## Status

Accepted.

## Context

PM Platform v1.2 is stable and already includes workspace-first architecture,
planning, execution review, RAID management, resource management, calendar,
documents, reporting foundation, enterprise search foundation, audit logging,
RBAC, Google Workspace integration, and an integration framework.

The v1.3 AI Platform Foundation must enable internal and external AI clients to
securely interact with PM Platform. Supported clients include the in-platform
AI Assistant, ChatGPT, Codex, Cursor, Claude, Gemini, VS Code AI Extensions,
and future MCP-compatible systems.

The governing architecture states that PM Platform is not building a chatbot.
It is becoming an AI-native Enterprise Project and Delivery Platform.

## Decision

AI will be treated as a core platform capability rather than as a feature
inside a single workspace, dashboard, or chat surface.

The AI Platform will provide a shared, governed architecture for:

- Internal AI Assistant experiences.
- External AI clients.
- Business-capability APIs.
- MCP resources, tools, and prompts.
- Prompt governance.
- Context assembly.
- Provider routing.
- Security, audit, monitoring, usage, and cost controls.

The in-platform AI Assistant and external AI clients must consume the same
governed platform capabilities. AI clients must consume business services, not
database entities, repositories, or duplicated domain logic.

## Rationale

AI capabilities will affect executive reporting, project analysis, delivery
health, RAID insights, timeline analysis, resource forecasting, document
intelligence, and future workflow automation. Those concerns cut across
domains and require consistent authorization, context, prompts, audit,
provider routing, and observability.

Treating AI as a platform capability prevents isolated feature implementations
from creating inconsistent security models, duplicated business logic,
provider lock-in, and fragmented user experiences.

## Alternatives Considered

| Alternative | Reason Rejected |
| --- | --- |
| Build a chatbot feature | Too narrow; would not provide reusable governed APIs for external AI clients or future platform capabilities. |
| Add AI independently inside each module | Creates duplicated prompt, context, provider, authorization, audit, and cost logic. |
| Expose database entities directly to AI tools | Violates clean architecture, RBAC, tenant isolation, and business-service ownership. |
| Use one provider-specific assistant | Creates vendor lock-in and limits enterprise deployment flexibility. |

## Consequences

Positive impacts:

- Creates a shared architecture for all future AI capabilities.
- Keeps business services authoritative.
- Enables consistent security, audit, cost, and provider governance.
- Supports internal and external AI clients through common platform contracts.

Negative impacts:

- Requires more upfront architecture and governance before visible features.
- Requires additional platform services before individual AI capabilities can
  ship.

Trade-offs:

- Slower initial delivery in exchange for safer long-term extensibility and
  enterprise readiness.

## Benefits

- Provider-agnostic AI foundation.
- Reusable AI capability surface.
- Stronger governance and auditability.
- Reduced risk of duplicated business logic.
- Consistent internal and external AI behavior.

## Risks

- Architecture may become too broad without staged delivery.
- Teams may attempt to bypass the platform for faster feature delivery.
- Governance overhead may slow lower-risk experimentation.

Mitigations include stage-gated implementation, explicit ADRs, capability
catalog governance, and architecture review for new AI extension points.

## Future Evolution

Future releases may add mutating AI tools, event-driven automation, semantic
retrieval, evaluation pipelines, tenant-specific provider policies, and
enterprise administration experiences. Those additions must extend the
platform boundary rather than bypass it.

## Related ADRs

- [ADR-AI-002: AI Gateway Architecture](ADR-AI-002-ai-gateway.md)
- [ADR-AI-003: Model Context Protocol Server](ADR-AI-003-mcp-server.md)
- [ADR-AI-008: AI Security Model](ADR-AI-008-security.md)
- [ADR-AI-009: AI Governance and Observability](ADR-AI-009-governance.md)
