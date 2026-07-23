# PM Platform Frontend Platform Architecture

## Status and Scope

This document is the canonical architecture reference for the frontend platform
foundations completed through Stage 5.10. It covers UI Foundation v2.1,
commands, entities, unified search, AI planning, governance, and authorization.

These foundations are client-side architecture. They do not add backend APIs,
data persistence, AI provider calls, or an execution engine.

## Platform Overview

| Framework | Location | Responsibility | Explicitly does not own |
| --- | --- | --- | --- |
| UI Foundation | `frontend/components/foundation` | Accessible presentation primitives and workspace composition | Data fetching, permissions, routing decisions, business rules |
| Command Framework | `frontend/lib/commands` | Command definitions, providers, deterministic filtering, registration, and existing action dispatch | Palette UI, workspace business logic, backend calls |
| Entity Framework | `frontend/lib/entities` | Searchable entity definitions, providers, deterministic filtering, and registration | Data fetching, command execution, navigation orchestration |
| Search Experience | `frontend/features/commands`, `frontend/features/entity-search` | Palette presentation, categories, limits, favorites, recents, and loaded entity presentation | Registry ownership, fuzzy ranking, backend indexing |
| AI Platform | `frontend/lib/ai` | Explicit intent classification, immutable context construction, descriptive planning, and reference coordination | Natural-language interpretation, provider calls, execution |
| AI Governance | `frontend/lib/ai/governance` | Plan validation, action classification, policy decisions, and immutable audit descriptions | Persistence, authorization, confirmation UI, execution |
| AI Authorization | `frontend/lib/ai/authorization` | Permission decisions, confirmation requests, immutable sessions, and descriptive tokens | Identity lookup, persistence, token signing, execution |

## Dependency Graph

Dependencies point from composition and policy layers toward stable lower-level
models. Lower layers never import feature pages or higher policy layers.

```text
Application composition
  |-- UI Foundation
  |-- Command/Search experience --> Command Registry
  |-- Entity/Search experience  --> Entity Registry
  |
  `-- AI trust pipeline
        AIPlatform
          |-- IntentEngine
          |-- ContextEngine
          |-- PlanningEngine
          `-- ExecutionCoordinator (descriptive only)
                    |
                    v
              ExecutionPlan
                    |
                    v
              GovernanceEngine
                    |
                    v
             AuthorizationEngine
                    |
          +---------+----------+
          |                    |
   ConfirmationRequest   ExecutionSession/Token

There is no executor after the token.
```

The AI Platform receives available command and entity metadata through
`AIContextInput`; it does not import either registry. Governance consumes an
execution plan but never invokes the AI Platform. Authorization consumes the
plan and governance result through direct lower-layer contracts. The
application composition root owns sequencing.

## Public API Boundaries

Consumers import through the framework barrels:

- `@/components/foundation`
- `@/lib/commands`
- `@/lib/entities`
- `@/features/commands`
- `@/features/entity-search`
- `@/lib/ai`
- `@/lib/ai/governance`
- `@/lib/ai/authorization`

The AI barrels expose engines, configuration entry points, immutable result
models, and documented constants. Snapshot helpers, audit construction, and
other composition details remain internal. Internal framework modules use
direct relative imports rather than importing their own barrel.

String unions plus frozen constant lists are preferred over TypeScript enums.
Engine classes use the `<Concern>Engine` suffix. Outcomes use `Result`,
`Evaluation`, `Assessment`, `Request`, `Session`, or `Token` according to their
role.

## Lifecycle

### Commands, entities, and search

1. A feature creates a small provider from capabilities or data it already
   owns.
2. The application integration registers that provider with the appropriate
   registry and unregisters it with the same lifecycle.
3. Registries reject duplicate IDs and apply deterministic token filtering.
4. The palette consumes command and entity results independently.
5. Commands execute only through the existing command workflow; entities only
   expose existing navigation targets.

### AI trust pipeline

1. A caller supplies explicit `AIIntentRequest` metadata and `AIContextInput`.
2. `AIPlatform` returns an immutable descriptive plan and orchestration result.
3. `GovernanceEngine` validates the plan, classifies actions, applies policy,
   and creates an immutable audit description.
4. `AuthorizationEngine` verifies that the plan and governance result agree,
   checks declarative permissions, and returns `Authorized`,
   `ConfirmationRequired`, or `Denied`.
5. `ConfirmationEngine` may create an immutable confirmation request.
6. Immutable execution-session snapshots track proposal, confirmation,
   authorization, expiry, or cancellation.
7. An authorized session may produce a descriptive execution token.
8. Processing stops. No component executes the plan.

## Immutability Contract

| Artifact | Compile-time | Runtime |
| --- | --- | --- |
| Intent and context | `Readonly` and readonly arrays | Copied and frozen, including nested references |
| Execution plan | Readonly intent, context, and steps | Plan, arrays, context, intent, and steps frozen |
| Governance result | Readonly validation, policy, confirmation, and audit models | Results and nested collections frozen |
| Authorization result | Readonly decision, permissions, and scope | Result, scope, and collections frozen |
| Confirmation/session/token | Readonly models | Factory output and copied scopes frozen |

Mutable application state, browser storage, React state, registry maps, and
loaded API models stay outside these trust artifacts. Callers must not cast
around readonly types or construct trusted results manually.

## Extension Points

- `CommandProvider` adds commands without coupling a feature to the palette.
- `EntityProvider` adds loaded entities without introducing new fetching.
- `PresentableEntityProvider.presentation` adds result-section metadata without
  changing `EntityRegistry`.
- `AIProvider` defines a future provider-neutral boundary. Stage 5.10 includes
  no implementation or registration mechanism.
- `ConfirmationPolicy` accepts command-to-action classifications.
- `createPolicyConfiguration()` creates immutable authorization-policy
  overrides.
- Dependency-injected engines allow focused testing without global state.

See the [Platform Developer Guide](../development/PLATFORM_DEVELOPER_GUIDE.md)
for supported extension workflows.

## Future Provider Architecture

A future provider adapter belongs outside `frontend/lib/ai`. It may implement
the generic `AIProvider` contract and translate provider output into existing
immutable intent or plan models. A composition layer must validate all provider
output through Governance and Authorization before any future executor sees it.

Provider adapters must not receive registry mutation APIs, routing objects, UI
components, or business services. Provider selection, credentials, retries,
telemetry, and network transport require a separate approved stage and security
review.

## Performance Review

The platform already uses deterministic linear filtering, maps/sets for ID
lookups, provider-level result limits, and memoized palette presentation.
Stage 5.10 retained defensive plan revalidation because it is a trust-boundary
check, not redundant presentation filtering.

Two obvious allocations were removed: authorization now reuses its stateless
validator, and execution-session transitions reuse a frozen module-level
transition table. No speculative caching or ranking layer was added.

## Testing Organization

Platform-focused tests remain under `frontend/tests` and use framework names:

- `command-*.test.*`
- `entity-*.test.*`
- `ai-platform.test.ts`
- `ai-governance.test.ts`
- `ai-authorization.test.ts`
- `ui-foundation*.test.tsx`

Each trust layer tests its own contracts and uses only public APIs from lower
layers. Small local fixtures are preferred to a shared mutable fixture graph.

## Design Principles

- Fail closed at governance and authorization boundaries.
- Keep presentation, metadata discovery, planning, policy, authorization, and
  future execution separate.
- Use deterministic behavior before ranking, inference, or optimization.
- Pass data downward; do not let lower layers reach into application state.
- Keep framework barrels intentional and internal helpers private.
- Preserve accessible UI semantics independently from platform orchestration.
- Add providers or execution only through a separately approved architecture
  stage.

## Decisions and References

- [ADR-014 Client Platform Layering](adr/ADR-014-client-platform-layering.md)
- [Command Framework](command-framework.md)
- [Entity Search Foundation](entity-search.md)
- [AI Platform Foundation](ai-platform.md)
- [UI Foundation v2.1](../../frontend/components/foundation/README.md)
