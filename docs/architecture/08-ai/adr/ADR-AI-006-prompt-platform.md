# ADR-AI-006: Prompt Platform

## Status

Accepted.

## Context

AI capabilities depend on prompt templates, variables, output contracts,
context requirements, and provider-specific execution constraints. Without
governance, prompt behavior can drift, sensitive context can be mishandled,
and executive or delivery outputs can become inconsistent.

Prompt changes may affect compliance, cost, evaluation, answer quality, and
business trust.

## Decision

PM Platform will introduce a Prompt Platform for governed prompt templates,
variables, versioning, lifecycle, validation, evaluation readiness, and prompt
permissions.

Prompt templates will define:

- Purpose and supported capability.
- Version.
- Required variables.
- Required context providers.
- Output contract.
- Safety and compliance constraints.
- Governance status.
- Evaluation scenarios.
- Deprecation or retirement policy.

Prompt lifecycle states include draft, review, approved, deprecated, and
retired. Only approved prompts may be used for production AI workflows.

## Rationale

Prompts are platform assets. They influence business output and must be
versioned, reviewed, auditable, and testable. A Prompt Platform separates
prompt governance from domain services, AI Skills, and provider adapters while
still giving the AI Gateway a consistent way to validate prompt execution.

## Alternatives Considered

| Alternative | Reason Rejected |
| --- | --- |
| Hard-code prompts inside features | Makes review, versioning, rollback, and audit difficult. |
| Let providers host authoritative prompts | Weakens platform governance and creates provider lock-in. |
| Let users author production prompts freely | Creates security, quality, and compliance risk. |
| Treat prompts as static documentation | Prompts need lifecycle, variables, output contracts, and evaluation metadata. |

## Consequences

Positive impacts:

- Enables prompt versioning and rollback.
- Supports governance and evaluation readiness.
- Improves auditability of AI outputs.
- Keeps prompt concerns separate from business services.

Negative impacts:

- Adds review overhead for prompt changes.
- Requires evaluation and lifecycle discipline.

Trade-offs:

- Strong prompt governance slows ad hoc prompt changes but improves trust,
  consistency, and compliance.

## Benefits

- Governed prompt lifecycle.
- Versioned prompt contracts.
- Safer context-variable handling.
- Evaluation-ready prompt assets.
- Clear production approval boundary.

## Risks

- Prompt governance could become too slow for experimentation.
- Prompt versions could proliferate.
- Provider-specific prompt features may complicate portability.

Mitigations include draft workflows, clear approval thresholds, deprecation
policy, provider capability metadata, and evaluation standards.

## Future Evolution

Future releases may add prompt evaluation pipelines, A/B prompt comparison,
tenant-specific prompt variants, multilingual prompts, provider-specific
rendering strategies, and prompt quality dashboards.

## Related ADRs

- [ADR-AI-002: AI Gateway Architecture](ADR-AI-002-ai-gateway.md)
- [ADR-AI-004: AI Provider Registry](ADR-AI-004-provider-registry.md)
- [ADR-AI-005: AI Skills Framework](ADR-AI-005-skills-framework.md)
- [ADR-AI-007: Enterprise Context Platform](ADR-AI-007-context-platform.md)
- [ADR-AI-009: AI Governance and Observability](ADR-AI-009-governance.md)
