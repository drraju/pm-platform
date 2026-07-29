# AI Gateway Developer Guide

**Release:** v1.3  
**Milestone:** M2A - AI Gateway Core  
**Status:** Gateway core infrastructure

This guide documents the AI Gateway Core introduced in M2A. The gateway
initializes inside the AI Platform module and defines the execution context,
lifecycle contracts, middleware contracts, pipeline contracts, extension
points, logging hooks, telemetry hooks, audit hooks, and error framework.

M2A does not execute AI requests, call providers, orchestrate prompts, assemble
context, implement MCP, execute skills, stream responses, retry requests, cache
data, expose controllers, or contain business logic.

## Gateway Architecture

The AI Gateway is the future orchestration boundary for AI requests. In M2A it
is intentionally inert:

- `AiGatewayService` initializes with `AiModule`.
- `AI_GATEWAY` resolves to `AiGatewayService` through dependency injection.
- `acceptRequest` creates an immutable `AiExecutionContext` and returns an
  unaccepted handle.
- `executeRequest` returns a safe rejected response stating execution is not
  enabled for this milestone.
- `validateCapability` returns `null` because capability discovery belongs to
  later milestones.

## Module Layout

```text
backend/src/ai/gateway/
  ai-execution-context.ts
  ai-gateway-contracts.ts
  ai-gateway.interface.ts
  ai-gateway.service.ts
  index.ts
```

## Lifecycle

M2A defines lifecycle metadata but does not process functional stages.

Supported lifecycle states are inherited from the shared AI types:

```text
received
authenticated
authorized
context_assembled
prompt_resolved
provider_selected
invoked
response_processed
audited
completed
rejected
failed
```

Only the initial `received` state is created in M2A. Future milestones will
advance lifecycle state by returning a new `AiExecutionContext` through
`transitionTo`.

## AIExecutionContext

`AiExecutionContext` is the central metadata object for future AI request
processing. It is immutable after creation. Lifecycle changes return a new
context instance rather than mutating the existing object.

Current context metadata includes:

- Request id.
- Correlation id.
- Trace id.
- Session id placeholder.
- Timestamp.
- User identity.
- Tenant.
- Workspace.
- Project.
- Organization placeholder.
- User roles.
- Effective permissions.
- Feature flags.
- Selected provider placeholder.
- Requested capability.
- Requested skill placeholder.
- Prompt metadata.
- Context references.
- Request metadata.
- Telemetry metadata.
- Audit metadata.
- Execution state.
- Extension metadata.

The context contains metadata only. It must not contain business data,
provider payloads, prompt content, document content, or persistence entities.

## Dependency Rules

- `ai/gateway` may depend on `ai/common` and gateway-local contracts.
- M2A gateway code must not depend on providers, skills, prompts, context
  implementations, MCP implementation, business services, repositories,
  persistence entities, or controllers.
- Future integrations must flow through public contracts and dependency
  injection tokens.
- Business modules must not depend on the gateway.

## Extension Points

M2A registers placeholder collection tokens:

- `AI_GATEWAY_EXTENSIONS`
- `AI_GATEWAY_LIFECYCLE_HOOKS`
- `AI_GATEWAY_MIDDLEWARE`
- `AI_GATEWAY_PIPELINE_STAGES`

These are empty arrays in M2A. Future milestones may add concrete
implementations through these contracts without changing the gateway boundary.

## Logging, Telemetry, Audit, and Errors

- Logging uses `AiLoggerService` only for gateway initialization metadata.
- Telemetry remains contract-only in M2A.
- Audit remains contract-only in M2A.
- Gateway execution returns the shared `AiPlatformError` payload with
  `AI_GATEWAY_EXECUTION_NOT_ENABLED`.

## Future Milestones

- M2B: gateway lifecycle processing and validation scenarios.
- M2C: authorization hook integration.
- M2D: audit and telemetry event emission.
- M3: provider registry and mock provider adapter.
- M4: context platform.
- M5: prompt platform.
- M6: skills framework.
- M7: MCP server.

## M2A Compliance Checklist

- Gateway module and service exist.
- `AIExecutionContext` exists and is immutable.
- Gateway request and response contracts exist.
- Lifecycle hook, middleware, pipeline, and extension contracts exist.
- Gateway configuration uses `AiConfigService`.
- Gateway logging uses `AiLoggerService`.
- Gateway telemetry and audit remain contract-only.
- Gateway error handling uses the shared AI error model.
- No AI providers, MCP implementation, prompt execution, skills, business
  logic, controllers, repositories, or persistence are introduced.
