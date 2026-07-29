# M7.5 Implementation Report: Architecture Hygiene and Boundary Cleanup

## Status

Complete.

## Scope

M7.5 implemented only the ACR-001 architecture hygiene findings:

- Shared dependency-neutral common contracts.
- Cross-boundary type coupling cleanup.
- Ordered Registry base and Stage Registry adoption.
- Event Bus configuration-backed handler enablement.
- Registry lifecycle preservation on disable/re-enable.
- Registry conformance tests.
- Dependency guardrail tests.
- Architecture validation documentation.

No AI capability, execution behavior, provider invocation, prompt execution,
context retrieval, skill execution, MCP protocol handling, repositories,
controllers, database access, streaming, or business logic was introduced.

## Files Changed

- `backend/src/ai/common/ai-config.service.ts`
- `backend/src/ai/common/contracts/domain-contracts.ts`
- `backend/src/ai/common/contracts/execution-contracts.ts`
- `backend/src/ai/common/contracts/index.ts`
- `backend/src/ai/common/events/ai-event-bus.service.ts`
- `backend/src/ai/common/events/ai-event-bus.service.spec.ts`
- `backend/src/ai/common/index.ts`
- `backend/src/ai/common/architecture/dependency-guardrails.spec.ts`
- `backend/src/ai/common/registry/base-registry.ts`
- `backend/src/ai/common/registry/base-registry.spec.ts`
- `backend/src/ai/common/registry/index.ts`
- `backend/src/ai/common/registry/ordered-registry.ts`
- `backend/src/ai/common/registry/registry-conformance.spec.ts`
- `backend/src/ai/common/registry/registry.types.ts`
- `backend/src/ai/context/context-provider.types.ts`
- `backend/src/ai/gateway/pipeline/ai-stage-registry.service.ts`
- `backend/src/ai/prompts/ai-prompt-resolution-engine.service.ts`
- `backend/src/ai/prompts/prompt-platform.types.ts`
- `backend/src/ai/skills/skill-platform.types.ts`
- `docs/engineering/development/5. ai/AI_ARCHITECTURE_VALIDATION_GUIDE.md`
- `docs/engineering/development/5. ai/AI_DEVELOPMENT_PLAYBOOK.md`
- `docs/architecture/08-ai/implementation/M7_5_IMPLEMENTATION_REPORT.md`

## ACR Findings Resolved

- Context no longer imports Gateway execution context types.
- Prompt no longer imports Context internals for context type definitions.
- Shared type shapes now live under `ai/common/contracts`.
- Stage Registry now derives from `OrderedRegistry`.
- Event Bus handler enablement now respects AI configuration.
- Registry disable/re-enable restores the previous lifecycle state.
- Registry conformance is covered across core AI and MCP registries.
- Dependency direction, forbidden imports, and package cycles are checked by
  automated architecture tests.

## Architecture Compliance

- Dependency direction is preserved through common contracts.
- Generic Registry Framework remains the foundation for AI registries.
- No approved ADR was changed.
- No runtime behavior changed for AI execution because execution behavior does
  not exist yet.
- AI Platform remains metadata-only through M7.5.

## Test Results

Required verification:

- `npm run build`
- AI lint with `npx eslint "src/ai/**/*.ts"`
- Registry conformance tests
- Dependency guardrail tests
- Architecture scan
- Full unit tests

## Technical Debt

- Shared common contracts should continue to absorb future cross-module type
  shapes before M8 expands execution-layer behavior.
- The dependency guardrail package matrix should be revisited when M8 adds
  Assistant-specific packages.
- Event Bus remains in-process and non-persistent by design.

## Remaining Work For M8

- Implement Internal AI Assistant foundation.
- Keep Assistant entrypoints delegated through the AI Gateway.
- Continue using common contracts for shared type shapes.
- Expand architecture guardrails as new execution-layer package boundaries are
  introduced.
