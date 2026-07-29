# ADR-AI-002: AI Gateway Architecture

## Status

Accepted.

## Context

PM Platform must support AI requests from the in-platform AI Assistant,
external MCP clients, future REST clients, and future event APIs. These
requests need consistent authentication, authorization, context assembly,
prompt orchestration, provider routing, response normalization, streaming,
telemetry, audit, token accounting, and cost controls.

Without a central gateway, each AI client or feature would need to implement
its own policy and orchestration flow.

## Decision

PM Platform will introduce the AI Gateway as the primary orchestration and
control plane for AI requests.

The AI Gateway is responsible for:

- Authentication entry and identity resolution.
- Authorization of actor, client, scope, prompt, context, and capability.
- Request routing and lifecycle coordination.
- Context assembly coordination through the Enterprise Context Platform.
- Prompt orchestration through the Prompt Platform.
- Provider routing through the AI Provider Registry.
- Response normalization.
- Streaming coordination where provider and client capabilities allow it.
- Retry and failover coordination according to policy.
- Telemetry, token accounting, usage tracking, cost tracking, and audit events.

The gateway must not own domain business rules, direct repository access,
persistence entities, or provider-specific business behavior.

## Rationale

AI requests combine cross-cutting platform concerns that must be enforced
consistently across internal and external clients. A gateway centralizes these
concerns while keeping domain services and provider adapters independent.

The gateway also makes the AI request lifecycle explicit and auditable,
including rejected, failed, streamed, retried, and completed requests.

## Alternatives Considered

| Alternative | Reason Rejected |
| --- | --- |
| Let each AI feature call providers directly | Produces duplicated routing, prompt, audit, security, and cost logic. |
| Put AI orchestration inside the MCP Server | Excludes internal Assistant and future non-MCP clients from the same governance path. |
| Put AI orchestration inside domain services | Couples business domains to providers, prompts, and AI lifecycle concerns. |
| Use provider-hosted assistants as the gateway | Creates provider lock-in and weakens platform-level audit and authorization. |

## Consequences

Positive impacts:

- Establishes one governed request lifecycle for all AI clients.
- Enables consistent audit, cost, token, and telemetry controls.
- Keeps domain services independent from AI providers.
- Makes provider routing and response normalization reusable.

Negative impacts:

- Adds a platform component that must be highly reliable and observable.
- Requires clear contracts between gateway, security, context, prompt, skills,
  provider, and monitoring components.

Trade-offs:

- Centralized control improves governance but requires careful design to avoid
  becoming a monolithic business logic layer.

## Benefits

- Consistent enforcement of RBAC and isolation.
- Reusable streaming and response normalization.
- Single point for rate limiting, token accounting, and cost tracking.
- Clear extension point for future AI clients.

## Risks

- Gateway scope could expand into business logic.
- Gateway outage could affect all AI surfaces.
- Poor provider abstraction could still leak vendor-specific behavior.

Mitigations include strict non-responsibilities, domain-service reuse rules,
provider registry contracts, observability, and stage-gated review.

## Future Evolution

The gateway may later support mutating action proposals, approval workflows,
event-driven automation, multi-provider fallback, tenant-specific routing, and
advanced streaming protocols. These must remain policy-governed and auditable.

## Related ADRs

- [ADR-AI-001: AI Platform Vision](ADR-AI-001-ai-platform-vision.md)
- [ADR-AI-004: AI Provider Registry](ADR-AI-004-provider-registry.md)
- [ADR-AI-006: Prompt Platform](ADR-AI-006-prompt-platform.md)
- [ADR-AI-007: Enterprise Context Platform](ADR-AI-007-context-platform.md)
- [ADR-AI-008: AI Security Model](ADR-AI-008-security.md)
- [ADR-AI-009: AI Governance and Observability](ADR-AI-009-governance.md)
