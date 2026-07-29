# ADR-AI-004: AI Provider Registry

## Status

Accepted.

## Context

PM Platform must support multiple AI providers, including OpenAI, Anthropic,
Gemini, Azure OpenAI, local models, and future providers. Enterprise customers
may have different cost, compliance, data residency, availability, and vendor
requirements.

The architecture must avoid embedding provider-specific assumptions in
business services, prompts, skills, or the MCP Server.

## Decision

PM Platform will use an AI Provider Registry as the provider abstraction,
capability mapping, routing, and extensibility boundary.

The Provider Registry will define:

- Provider metadata.
- Model capability metadata.
- Provider adapter contracts.
- Capability-to-model routing policy.
- Vendor-independent response normalization expectations.
- Provider health and availability state.
- Cost, latency, context-size, streaming, tool-use, structured-output, and
  residency metadata.
- Future provider extension rules.

Supported provider families include OpenAI, Anthropic, Gemini, Azure OpenAI,
local models, and future enterprise-approved providers.

## Rationale

Provider agnosticism is a core platform principle. A registry allows the AI
Gateway to route requests based on capability, cost, compliance, tenant policy,
workspace policy, model features, and provider health without coupling domain
logic to provider SDKs.

Provider adapters stay behind a platform boundary. Business services and AI
Skills remain provider-neutral.

## Alternatives Considered

| Alternative | Reason Rejected |
| --- | --- |
| Standardize on one provider | Creates vendor lock-in and limits enterprise deployment flexibility. |
| Let each skill choose providers | Duplicates routing logic and creates inconsistent governance. |
| Encode provider behavior in prompts | Makes prompts brittle and provider-specific. |
| Route only by configuration flags | Too limited for capability, health, cost, streaming, and data policy decisions. |

## Consequences

Positive impacts:

- Supports vendor independence.
- Enables provider-specific adapters without domain coupling.
- Supports policy-based provider routing.
- Enables future failover and local-model strategies.

Negative impacts:

- Requires normalized capability metadata and provider contracts.
- Provider differences must be modeled explicitly.

Trade-offs:

- Abstraction reduces lock-in but may require exposing controlled provider
  capabilities when models differ meaningfully.

## Benefits

- Provider interchangeability.
- Clear extension model for new providers.
- Central place for provider health, cost, and capability decisions.
- Reduced risk of provider details leaking into business domains.

## Risks

- Lowest-common-denominator abstraction could limit advanced provider features.
- Provider response differences could affect user experience.
- Local models may not support all required capabilities.

Mitigations include capability mapping, response normalization, feature flags,
provider health checks, and explicit fallback policy.

## Future Evolution

Future releases may support tenant-level provider allowlists, data-residency
routing, model evaluation scores, provider scorecards, local model routing,
multi-provider fallback, and provider marketplace-style extensions.

## Related ADRs

- [ADR-AI-002: AI Gateway Architecture](ADR-AI-002-ai-gateway.md)
- [ADR-AI-006: Prompt Platform](ADR-AI-006-prompt-platform.md)
- [ADR-AI-009: AI Governance and Observability](ADR-AI-009-governance.md)
- [ADR-AI-010: AI Extension Architecture](ADR-AI-010-extension-model.md)
