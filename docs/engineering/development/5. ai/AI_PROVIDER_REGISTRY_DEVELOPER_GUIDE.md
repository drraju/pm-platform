# AI Provider Registry Developer Guide

**Release:** v1.3  
**Milestone:** M3 - Capability and Provider Registry Foundation  
**Status:** Registry foundation

This guide documents the M3 Capability Registry and Provider Registry
foundation. M3 introduces capability and provider metadata, provider discovery,
metadata-only selection, health contracts, routing contracts, and one
metadata-only mock provider adapter.

M3 does not implement OpenAI, Claude, Gemini, Ollama, Azure OpenAI, AWS
Bedrock, MCP, prompt execution, context retrieval, LLM inference, streaming,
business authorization, or provider API calls.

## Capability Registry

`AiCapabilityRegistryService` owns AI capability definitions.

Built-in capabilities:

- `chat`
- `reasoning`
- `embeddings`
- `vision`
- `image-generation`
- `speech-to-text`
- `text-to-speech`
- `tool-calling`
- `structured-output`
- `streaming`

Capabilities are registered through `AI_CAPABILITY_DEFINITIONS` and are
extensible. Capabilities describe platform-level capability contracts; they do
not imply provider availability.

## Provider Registry

`AiProviderRegistryService` owns provider discovery and provider metadata
lookup.

The registry supports:

- Provider registration through `AI_PROVIDER_ADAPTERS`.
- Provider metadata discovery.
- Provider lookup by id.
- Provider lookup by capability.
- Priority ordering.
- Availability filtering.

The registry returns metadata only. It never invokes providers for inference.

## Registration

M3 registers one provider adapter:

- `MockAiProviderAdapter`

The mock provider is metadata-only. It advertises selected capabilities and
model metadata but does not perform inference, stream, call APIs, or execute
requests.

## Discovery

Provider discovery returns `AiProviderMetadata`, including:

- Provider id.
- Provider name.
- Version.
- Supported capabilities.
- Supported models.
- Authentication type.
- Configuration schema.
- Health status.
- Availability.
- Priority.
- Cost metadata.
- Rate-limit metadata.

## Selection

Provider selection remains metadata-only.

The approved flow is:

```text
Gateway
  -> Capability Registry
  -> Provider Registry
  -> Provider Adapter metadata
```

`AiCapabilityRoutingService` resolves a requested capability before asking the
Provider Registry for matching providers. The Gateway does not reference
concrete providers.

## Health Framework

M3 defines health metadata and `AiProviderHealthCheck` contracts.

Current health is adapter-provided metadata. No real provider monitoring,
background checks, circuit breakers, uptime probes, or external diagnostics
are implemented in M3.

## Routing Foundation

`AiProviderRoutingService` creates route policy metadata:

- Capability id.
- Priority-ordered provider ids.
- Future failover flag.
- Future load-balancing flag.

Failover and load balancing are metadata placeholders only. Runtime routing
logic is deferred.

## Extension Model

Future providers should be added by:

1. Implementing `AIProvider`.
2. Returning complete `AiProviderMetadata`.
3. Advertising supported capabilities.
4. Reporting metadata-only health.
5. Registering through `AI_PROVIDER_ADAPTERS`.

Provider adapters must not be referenced directly by the Gateway, Skills,
Prompts, MCP, Context Platform, or business modules.

## M3 Compliance Checklist

- Capability Registry exists.
- Provider Registry exists.
- Provider metadata contracts exist.
- Provider Adapter interface exists.
- Mock Provider exists and returns metadata only.
- Registry resolves providers by capability.
- Gateway remains provider agnostic.
- No AI inference, external provider calls, prompt execution, MCP, skills, or
  business logic are introduced.
