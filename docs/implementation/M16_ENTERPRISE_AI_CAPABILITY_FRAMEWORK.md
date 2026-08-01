# M16 Enterprise AI Capability Framework

## Repository Investigation

The repository had a low-level provider capability registry for capabilities such as `chat`, `reasoning`, and `structured-output`, plus the M13 skill registry and M14 execution engine. It did not have business-facing capability metadata or a service that mapped a user-facing capability to a skill execution request.

## Architecture Decisions

M16 introduces a separate enterprise capability registry so provider capability routing remains unchanged. Enterprise capabilities declare metadata and supported skill IDs; `CapabilityExecutionService` validates metadata and permissions, selects a registered skill, builds the existing M14 request, and returns its structured response.

## Capability Registry

`EnterpriseCapabilityRegistryService` supports registration, lookup, priority ordering, metadata validation, diagnostics, and future plugin registration. Four provider-independent built-in capabilities are registered: Project Summary, Execution Review, RAID Review, and Portfolio Health Review.

## Capability Contracts

Each capability declares ID, display name, description, category, supported skills, required context, response type, roles, permissions, visibility, icon, execution capability, and version.

## Execution Flow

1. The capability execution service looks up the enterprise capability.
2. Required permissions and roles are checked.
3. A registered supporting skill is selected.
4. The service maps response type to the existing prompt response format.
5. The existing M14 execution engine receives the request.
6. M11 context assembly, M12 prompt composition, provider routing, and M15 response normalization run unchanged.
7. The structured response is returned to the caller.

## Frontend Integration

Enterprise capability metadata is exposed at `GET /ai-playground/capabilities` and included in the existing Playground registry snapshot. The frontend API client provides `getAiEnterpriseCapabilities()` and typed metadata, allowing UI surfaces to render capabilities without hard-coded definitions.

## Files Changed

- `backend/src/ai/capabilities/enterprise-capability.types.ts`
- `backend/src/ai/capabilities/built-in-enterprise-capability-definitions.ts`
- `backend/src/ai/capabilities/enterprise-capability-registry.service.ts`
- `backend/src/ai/capabilities/capability-execution.service.ts`
- `backend/src/ai/ai.module.ts`
- `backend/src/modules/ai-playground/ai-playground.controller.ts`
- `backend/src/ai/playground/ai-playground.service.ts`
- `frontend/lib/api/client.ts`
- `frontend/app/(app)/ai-playground/page.tsx`

## Testing

Tests cover capability registration, lookup, diagnostics, permission validation, routing through the existing execution engine, structured response compatibility, Playground compatibility, and provider-independent architecture constraints.

## Future Extension Points

Future milestones can add capability-specific UI actions, richer role resolution, plugin lifecycle management, capability version negotiation, and explicit multi-skill composition. Provider routing, planning, scheduling, tools, agents, and workflow automation remain outside M16.
