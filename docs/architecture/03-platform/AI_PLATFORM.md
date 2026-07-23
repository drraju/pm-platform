# AI Platform Foundation

Status: Stable foundation; provider integration and execution are not implemented.

The cross-framework dependency rules and authorization lifecycle are documented
in [Platform Architecture](PLATFORM_ARCHITECTURE.md) and
[ADR-014](adr/ADR-014-client-platform-layering.md).

## Purpose

The Stage 5.7 AI Platform is an independent, provider-neutral orchestration
framework for future assisted capabilities. It turns explicit intent metadata
and application context into an immutable, descriptive execution plan and a
coordination result. It does not execute commands, navigate, call providers,
call APIs, mutate application state, or contain domain business logic.

The framework has no React, presentation, routing, backend, database, or model
provider dependency. Existing command, entity, search, and UI Foundation
contracts remain unchanged.

## Module Layout

The framework lives in `frontend/lib/ai`:

- `ai-platform.ts` coordinates the four engines through the `AIPlatform`
  orchestration entry point.
- `intent-engine.ts` creates runtime-immutable intent definitions from an
  explicitly supplied category. Missing categories produce `Unknown`; no
  natural-language parser is implemented.
- `context-engine.ts` constructs isolated, immutable application-context
  snapshots.
- `planning-engine.ts` consumes an intent and context and produces a descriptive
  immutable plan.
- `execution-coordinator.ts` consumes a plan and returns its inert references
  and coordination status. It performs no execution.
- `provider.ts` defines the generic `AIProvider` extension boundary only.
- `types.ts` defines intent, context, plan, response, and orchestration models.
- `index.ts` is the module's public export surface.

## Orchestration Flow

```text
AIIntentRequest + AIContextInput
              |
              v
          AIPlatform
              |
      +-------+-------+
      |       |       |
 Intent   Context  Planning
 Engine   Engine    Engine
                      |
                      v
              ExecutionPlan
                      |
                      v
          ExecutionCoordinator
                      |
                      v
          AIOrchestrationResult
```

`AIPlatform.orchestrate()` is synchronous and deterministic. It classifies the
explicit request, snapshots the supplied context, creates a plan, and asks the
coordinator to describe its references. No stage in this flow performs the
described operation.

## Intent Model

Supported categories are `Search`, `Navigate`, `ExecuteCommand`, `Summarize`,
`Explain`, `Recommend`, `Analyze`, `Plan`, and `Unknown`. The caller supplies a
category together with inert metadata such as a command ID, entity ID, or
navigation target. If the category is absent or the input is empty, the intent
engine returns an immutable `Unknown` intent. Language interpretation is
deferred to a later provider-integration stage.

## Context Model

The context engine snapshots the current workspace and route, selected project
and entity, permissions, and available command/entity metadata. Arrays and
nested records are copied and frozen so later caller mutations cannot alter the
context. The context is supplied as data and has no dependency on React or an
application store.

## Planning and Coordination

The planning engine produces one descriptive step for a supported intent and
no steps for `Unknown`. Plans and their nested intents, contexts, arrays, and
steps are frozen. A step may carry command, entity, and navigation references,
but never callbacks.

The execution coordinator only collects those references and reports `Planned`
or `NoAction`. It has no registry, provider, navigation, or API dependency and
exposes no execute method. Authorization, confirmation, auditing, and execution
remain explicitly out of scope.

## Provider Boundary

`AIProvider` is an abstract extension contract for future intent resolution,
plan creation, summarization, explanation, and analysis. The Stage 5.7 platform
does not instantiate or call providers, and no concrete provider implementation
is included.
