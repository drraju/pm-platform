# M11 Enterprise Context Assembly Framework

## Architecture

M11 adds a provider-independent `EnterpriseContextAssemblyService` behind the existing AI context registry and pipeline. The execution flow is now:

`AI request -> existing pipeline authorization boundary -> registered context providers -> EnterpriseContextAssemblyService -> prompt metadata -> existing provider dispatch`

Provider dispatch and LLM adapters do not query platform data. The assembly service accepts normalized, authorized DTO snapshots and produces one deterministic `EnterpriseContext` object.

## Repository Investigation

The repository already contained:

- `AiContextRegistryService` for provider discovery, capability matching, and feature-flag enablement.
- `AiContextAggregationService` for metadata selection and duplicate detection.
- An existing context assembly pipeline stage, previously metadata-only.
- AI execution context and prompt metadata transport fields.
- Domain services for projects, tasks, RAID, documents, calendar, and users.

The minimum compatible implementation was to extend the existing context provider contract with an optional assembly method. This keeps domain query ownership outside the AI layer and avoids duplicate repository queries or controller orchestration.

## Context Pipeline

The context assembly stage continues to select metadata for diagnostics, then invokes the assembly service. A request may provide a typed `enterpriseContext` metadata envelope containing source DTOs, authorization trimming rules, and limits. The resulting context and assembly diagnostics are stored in execution prompt metadata for the next prompt-builder milestone.

No provider adapter or LLM receives direct platform query access.

## Provider Design

The existing registry providers remain the extension points. Providers now optionally implement `assembleContext` and own the mapping from their source bucket to a context fragment. Built-in providers cover:

- Projects
- Tasks
- Execution updates
- Documents
- RAID
- Team/project members
- Calendar
- Portfolio
- Workspace
- User profile

Providers remain provider-independent and return fragments rather than persistence entities. The registry controls capability/resource selection and feature flags.

## DTO Design

`enterprise-context.types.ts` defines DTOs for projects, tasks, execution updates, RAID items, document metadata, calendars, members, users, portfolios, and workspace state. `EnterpriseContext` contains normalized arrays for each domain plus user/workspace singular contexts.

Persistence entities are not exposed. Source DTOs are deduplicated by stable IDs, sorted by ID for deterministic output, and copied into the final context buckets.

## Authorization

Assembly applies project-scope trimming from `AiScope.projectIds` before returning data. Optional authorization metadata can further constrain allowed project IDs, allowed resource IDs, and sensitive domains. Sensitive document, RAID, and calendar context can be disabled as a group.

The AI layer does not reimplement domain authorization or query domain repositories. Domain-facing adapters are expected to obtain authorized DTOs through existing services and provide the corresponding authorization envelope.

## Compression Strategy

Configurable per-domain limits are applied after authorization and deduplication. Defaults are conservative: 100 tasks, 50 execution updates, 50 RAID items, 20 documents, 20 projects/portfolios/calendars, 50 members, and one user/workspace record. Items are sorted deterministically before truncation, and diagnostics report omitted counts and truncated context types.

## Files Changed

- `backend/src/ai/context/enterprise-context.types.ts`
- `backend/src/ai/context/enterprise-context-assembly.service.ts`
- `backend/src/ai/context/context-provider.interface.ts`
- `backend/src/ai/context/ai-context-registry.service.ts`
- `backend/src/ai/context/placeholder-context-providers.ts`
- `backend/src/ai/context/index.ts`
- `backend/src/ai/common/contracts/domain-contracts.ts`
- `backend/src/ai/gateway/pipeline/stages/context-assembly-placeholder.stage.ts`
- `backend/src/ai/gateway/pipeline/stages/context-assembly.stage.ts`
- `backend/src/ai/gateway/pipeline/ai-pipeline.types.ts`
- `backend/src/ai/ai.module.ts`
- Context and pipeline tests

## Test Results

Passed:

- `cd backend && npm run build`
- `cd backend && npm test -- context --runInBand` (8 tests)
- AI pipeline, execution engine, and assistant tests (7 tests)
- AI Playground and prompt resolution tests (4 tests)

## Future Extension Points

- Add domain adapters that call existing services with authenticated actors and map responses into source DTOs.
- Populate effective permissions during the authorization hook from the authenticated request.
- Add prompt-builder consumption of the structured context.
- Add token-aware estimation beyond item-count limits.
- Add organization settings and current request/filter DTOs as additional context buckets when their domain contracts are finalized.
