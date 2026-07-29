# ADR-AI-008: AI Security Model

## Status

Accepted.

## Context

AI clients can request sensitive project, delivery, resource, RAID, calendar,
document, reporting, integration, and organization context. The platform must
protect tenant isolation, workspace isolation, project isolation, RBAC,
document permissions, PII, auditability, and policy enforcement.

AI requests introduce additional risk because context may be assembled from
multiple domains and sent to external model providers.

## Decision

PM Platform will apply a dedicated AI Security Model that extends existing
authentication, authorization, RBAC, workspace isolation, project isolation,
audit logging, and policy enforcement.

The AI Security Model requires:

- Authenticated AI clients and authenticated actors.
- Authorization for capability, context source, prompt, provider route, and
  proposed action.
- Existing RBAC as the authoritative permission foundation.
- Workspace and project isolation for all context assembly.
- Tenant isolation for sessions, provider routing, audit, usage, and cost.
- PII masking and sensitivity policy before prompt execution.
- Prompt permissions.
- Audit logging of policy decisions, context inclusion, redactions, provider
  route, usage, cost, and outcomes.
- Deny-by-default behavior for sensitive data and AI-visible documents.

## Rationale

AI does not change the platform's security obligations. It increases the
importance of consistent enforcement because context can be aggregated and
transmitted to providers. Security must be embedded in the AI request
lifecycle, not added after provider execution.

## Alternatives Considered

| Alternative | Reason Rejected |
| --- | --- |
| Trust AI clients after login | Insufficient because each capability, context source, and prompt has separate risk. |
| Rely on provider safety controls | Providers cannot enforce PM Platform RBAC, workspace isolation, or project membership. |
| Filter responses after generation only | Too late; unauthorized context may already have been disclosed to a provider. |
| Create separate AI permissions unrelated to platform RBAC | Risks inconsistent access control and duplicates IAM concepts. |

## Consequences

Positive impacts:

- Keeps AI access aligned with PM Platform security.
- Reduces risk of cross-project, cross-workspace, or cross-tenant leakage.
- Supports compliance and incident investigation.
- Provides clear policy gates for future mutating AI actions.

Negative impacts:

- Requires more policy decisions per request.
- Context assembly may exclude data that would improve answer quality.

Trade-offs:

- Security-first context filtering may produce more cautious answers, but it
  preserves enterprise trust.

## Benefits

- Secure-by-default AI architecture.
- Consistent RBAC enforcement.
- Stronger auditability.
- Policy-controlled prompt and context access.
- Safer provider usage.

## Risks

- Policy complexity could increase latency.
- Misconfigured permissions could block valid AI capabilities.
- PII masking could remove context needed for some workflows.

Mitigations include policy tests, audit traces, explainable denials, prompt
permission review, and explicit data owner governance.

## Future Evolution

Future releases may add risk-based approvals, tenant-specific AI policies,
data residency controls, provider allowlists, human confirmation for mutations,
content retention controls, and security dashboards.

## Related ADRs

- [ADR-AI-001: AI Platform Vision](ADR-AI-001-ai-platform-vision.md)
- [ADR-AI-002: AI Gateway Architecture](ADR-AI-002-ai-gateway.md)
- [ADR-AI-003: Model Context Protocol Server](ADR-AI-003-mcp-server.md)
- [ADR-AI-007: Enterprise Context Platform](ADR-AI-007-context-platform.md)
- [ADR-AI-009: AI Governance and Observability](ADR-AI-009-governance.md)
