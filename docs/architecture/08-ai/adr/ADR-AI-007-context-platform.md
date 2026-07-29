# ADR-AI-007: Enterprise Context Platform

## Status

Accepted.

## Context

AI capabilities require context from projects, tasks, milestones, resources,
RAIDs, documents, calendar, reporting, integrations, permissions, and
organization hierarchy. That context must be assembled securely and efficiently
without exposing unauthorized data or duplicating domain queries in prompts or
provider adapters.

The platform must also prepare for future summarization, token optimization,
context caching, and retrieval-augmented generation while enforcing RBAC and
document AI visibility rules.

## Decision

PM Platform will introduce an Enterprise Context Platform responsible for
permission-aware context providers, aggregation, permission filtering, context
caching policy, summarization strategy, token optimization, source
attribution, redaction hooks, and future RAG compatibility.

Context providers must:

- Fetch context through existing business services.
- Respect tenant, workspace, project, user, and document permissions.
- Apply PII masking and sensitivity policy.
- Return source references and freshness metadata.
- Identify redactions and safe omission reasons.
- Support bounded context packages for prompt orchestration.

Context assembly must occur after authorization and before prompt construction.

## Rationale

AI answer quality depends on relevant context, but enterprise safety depends on
permission filtering and data minimization. A dedicated context platform keeps
context assembly governed, reusable, source-attributed, and independent from
provider-specific prompt execution.

The same context architecture can later support summarization, caching, token
optimization, and RAG without redesigning the AI Gateway or skills framework.

## Alternatives Considered

| Alternative | Reason Rejected |
| --- | --- |
| Let prompts describe what data to fetch | Prompts cannot enforce RBAC, project isolation, or tenant isolation. |
| Let providers retrieve data directly | Exposes platform internals and bypasses audit and authorization. |
| Build context separately per skill | Duplicates permission filtering, freshness, redaction, and token logic. |
| Include all project data in prompts | Creates data exposure, cost, latency, and token-limit risks. |

## Consequences

Positive impacts:

- Centralizes permission-filtered context assembly.
- Improves source attribution and auditability.
- Enables token optimization and summarization strategy.
- Prepares for future RAG while preserving security boundaries.

Negative impacts:

- Requires context provider contracts and governance.
- Context caching must be carefully scoped to avoid stale or unauthorized data.

Trade-offs:

- More context governance improves safety but may require explicit omission and
  freshness handling.

## Benefits

- Secure enterprise context assembly.
- Reusable context providers.
- Clear source attribution.
- Better token and cost control.
- Future semantic retrieval compatibility.

## Risks

- Cached context could become stale or overexposed.
- Summaries could omit important detail.
- Context providers could accidentally bypass service-level authorization.

Mitigations include short-lived cache policy, source freshness metadata,
context completeness indicators, service-only access, and audit of included and
excluded sources.

## Future Evolution

Future releases may add semantic retrieval, embedding indexes, document
chunking, summary caches, context ranking, user-tunable context scopes, and
domain-specific retrieval policies. RAG must remain governed by document AI
visibility, RBAC, and audit policy.

## Related ADRs

- [ADR-AI-002: AI Gateway Architecture](ADR-AI-002-ai-gateway.md)
- [ADR-AI-005: AI Skills Framework](ADR-AI-005-skills-framework.md)
- [ADR-AI-006: Prompt Platform](ADR-AI-006-prompt-platform.md)
- [ADR-AI-008: AI Security Model](ADR-AI-008-security.md)
- [ADR-AI-009: AI Governance and Observability](ADR-AI-009-governance.md)
