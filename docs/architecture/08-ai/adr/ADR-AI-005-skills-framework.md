# ADR-AI-005: AI Skills Framework

## Status

Accepted.

## Context

PM Platform AI capabilities must expose business capabilities such as project
analysis, risk assessment, sprint health, timeline analysis, delivery health,
RAID insights, executive summaries, resource forecasting, and document
intelligence.

Existing business services already own domain rules. AI architecture must not
duplicate those rules inside prompts, provider adapters, or standalone AI
logic.

## Decision

PM Platform will introduce an AI Skills Framework that maps governed AI
capabilities to existing PM Platform business services.

Each AI Skill will define:

- Business capability name and description.
- Input and output contracts.
- Required permissions and policy gates.
- Context requirements.
- Business services consumed.
- Execution classification.
- Audit classification.
- Version metadata.
- Discovery metadata.
- Lifecycle state.

The framework will support skill registration, skill discovery, versioning,
dependency injection into approved business service interfaces, and
capability-level execution through the AI Gateway.

Skills must never duplicate business logic or access repositories directly.

## Rationale

Skills provide a stable facade between AI clients and business services. They
make AI capabilities discoverable and governable while preserving domain
ownership. Skill contracts also make authorization, context requirements,
auditing, evaluation, and output normalization explicit.

Dependency injection is an implementation concern for later engineering
design, but architecturally the skill model must depend on business service
interfaces rather than persistence internals.

## Alternatives Considered

| Alternative | Reason Rejected |
| --- | --- |
| Put capability logic directly in prompts | Prompts are not a reliable place for business rules, permissions, or service orchestration. |
| Let AI clients call domain services directly | Exposes internal APIs and bypasses AI governance, prompt, audit, and context controls. |
| Build separate AI-only business logic | Duplicates existing services and risks inconsistent outputs. |
| Treat every skill as provider-specific | Breaks provider agnosticism and complicates testing. |

## Consequences

Positive impacts:

- Provides a reusable business-capability layer for AI.
- Preserves existing service ownership.
- Enables capability discovery and versioning.
- Supports consistent audit and evaluation.

Negative impacts:

- Requires discipline to keep skills thin and capability-oriented.
- Requires explicit skill lifecycle governance.

Trade-offs:

- Skills add an architectural layer, but they prevent more dangerous coupling
  between AI clients, prompts, providers, and domain internals.

## Benefits

- Business-capability mapping.
- Clean separation from provider concerns.
- Discoverable AI surface.
- Versionable capability contracts.
- Foundation for future plugins and enterprise extensions.

## Risks

- Skills may become mini-domain services if not governed.
- Skill versioning can become complex if output contracts change frequently.
- Capability discovery could expose unavailable or unauthorized skills.

Mitigations include lifecycle states, permission-aware discovery, output
contracts, architectural review, and strict no-duplicate-business-logic rules.

## Future Evolution

Future releases may add skill plugins, tenant-specific skill enablement,
mutating skills with human approval, skill evaluation metrics, skill
marketplace metadata, and backward-compatible skill version negotiation.

## Related ADRs

- [ADR-AI-001: AI Platform Vision](ADR-AI-001-ai-platform-vision.md)
- [ADR-AI-002: AI Gateway Architecture](ADR-AI-002-ai-gateway.md)
- [ADR-AI-003: Model Context Protocol Server](ADR-AI-003-mcp-server.md)
- [ADR-AI-007: Enterprise Context Platform](ADR-AI-007-context-platform.md)
- [ADR-AI-010: AI Extension Architecture](ADR-AI-010-extension-model.md)
