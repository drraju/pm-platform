# AI Request Pipeline Developer Guide

**Release:** v1.3  
**Milestone:** M2B - AI Request Pipeline  
**Status:** Pipeline framework infrastructure

This guide documents the AI Request Pipeline framework introduced in M2B. The
pipeline exists to support future AI execution, but M2B performs deterministic
infrastructure stages only.

M2B does not implement providers, LLM calls, prompt execution, context
retrieval, business authorization, authentication, skills, MCP, REST
endpoints, controllers, repositories, persistence, streaming, retry logic, or
caching.

## Pipeline Engine

`AiPipelineEngineService` executes ordered stages discovered from
`AiStageRegistryService`.

The engine is responsible for:

- Loading enabled stages from the stage registry.
- Executing stages in order.
- Propagating stage failures.
- Recording stage diagnostics.
- Returning pipeline status, final execution context, diagnostics, and safe
  errors.

The engine does not know about concrete stage classes. It depends only on the
stage registry and the `AiPipelineStage` contract.

## Stage Registry

`AiStageRegistryService` owns stage discovery and ordering.

Registry behavior:

- Stages are injected through `AI_GATEWAY_PIPELINE_STAGES`.
- Stages are sorted by `metadata.order`.
- Disabled stages are excluded from execution.
- Individual stages may also be disabled by configuration using
  `AI_PIPELINE_STAGE_<STAGE_NAME>_ENABLED=false`.
- Stage metadata exposes name, description, enabled state, and order.
- The registry is ready for future plugin-style stage registration, but M2B
  does not implement runtime plugin loading.

## Stage Lifecycle

Each stage implements `AiPipelineStage`:

```text
metadata -> execute(context) -> stage result
```

Each stage result contains:

- Updated immutable `AiExecutionContext`.
- Result status: `success`, `skipped`, or `failed`.
- Optional safe AI error payload.

The pipeline stops at the first failed stage and returns a failed pipeline
result.

## Execution Order

M2B registers these stages:

1. Request Validation.
2. Authentication Hook.
3. Authorization Hook.
4. Execution Context Enrichment.
5. Capability Resolution.
6. Context Assembly Placeholder.
7. Prompt Resolution Placeholder.
8. Provider Dispatch Placeholder.
9. Response Normalization.
10. Telemetry.
11. Audit.

Only Request Validation performs a check, and that check is limited to request
structure: request id, correlation id, and requested capability id.

All other stages are placeholders that return successfully without business
behavior.

## Diagnostics

Each stage records:

- Stage name.
- Start time.
- End time.
- Duration.
- Result.
- Failure reason when present.

M2B records diagnostics in memory as part of the pipeline result. No telemetry
backend, audit backend, metrics sink, or tracing system is implemented in this
milestone.

## Gateway Integration

`AiGatewayService` uses the pipeline engine for `acceptRequest` and
`executeRequest`.

Gateway behavior remains intentionally non-functional:

- Valid requests run through placeholder infrastructure stages.
- Failed structural validation returns a safe failed response.
- Successful pipeline execution still returns a safe disabled response because
  AI execution is not enabled in M2B.

## Extension Points

Future stages can be added by:

1. Implementing `AiPipelineStage`.
2. Declaring metadata with a unique name and order.
3. Registering the stage through dependency injection.
4. Adding the stage to `AI_GATEWAY_PIPELINE_STAGES`.

Stages must not depend on each other. Shared state must travel through
`AiExecutionContext` metadata or later approved contracts.

## Future Provider Integration

Provider integration belongs to M3. The M2B Provider Dispatch Placeholder does
not select providers, call providers, inspect provider configuration, or
prepare provider payloads.

When M3 begins, provider dispatch must remain behind approved Provider
Registry contracts and must not introduce provider-specific logic into
earlier pipeline stages.

## Dependency Rules

- Pipeline stages may depend on AI common and gateway-local contracts.
- Pipeline stages must not depend on providers, skills, prompts, context
  implementations, MCP implementation, business services, repositories,
  persistence, or controllers.
- Request Validation must remain structural only.
- Authentication and Authorization stages are hooks only until later
  milestones.

## M2B Compliance Checklist

- Pipeline engine exists.
- Stage registry exists.
- Ordered stage execution works.
- Stage interfaces exist.
- Placeholder stages execute successfully.
- Request validation performs structural checks only.
- Gateway uses the registry-driven pipeline.
- No providers, prompts, skills, MCP, business logic, controllers,
  repositories, persistence, streaming, retry, or caching are introduced.
