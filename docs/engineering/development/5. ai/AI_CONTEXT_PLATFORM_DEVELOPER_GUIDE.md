# AI Context Platform Developer Guide

## Purpose

The AI Context Platform coordinates context providers for AI Gateway requests.
In M4 it is a metadata-only foundation: providers advertise what context they
can supply, the registry discovers and orders them, and aggregation returns
context metadata and diagnostics only.

M4 does not retrieve project data, task data, documents, calendar entries,
RAID data, vector results, summaries, prompts, provider responses, or LLM
outputs.

## Module Layout

Context platform code lives under `backend/src/ai/context/`.

| File | Responsibility |
| --- | --- |
| `context-provider.interface.ts` | Public provider contract. |
| `context-provider.types.ts` | Context descriptors, metadata, diagnostics, merge contracts, permission contracts, and token budget contracts. |
| `ai-context-registry.service.ts` | Provider discovery, ordering, enablement, diagnostics, lifecycle metadata, and metadata selection. |
| `ai-context-aggregation.service.ts` | Request-scoped metadata aggregation, provider ordering, duplicate detection, merge diagnostics, and token metadata totals. |
| `placeholder-context-providers.ts` | Built-in metadata-only Project, Task, Document, RAID, Team, Calendar, Portfolio, and Workspace providers. |
| `permission-filtering.interface.ts` | Contracts for permission filtering, tenant/workspace/project isolation, and security trimming. |
| `token-budget.interface.ts` | Contracts for token estimation, token budgets, truncation, and compression strategy. |

## Runtime Flow

1. The AI Gateway pipeline reaches `context_assembly_placeholder` after
   authorization hooks and capability resolution.
2. The stage calls `AiContextAggregationService`.
3. Aggregation calls `AiContextRegistryService`.
4. The registry selects enabled providers by requested capability and optional
   requested resources.
5. Providers return `AiContextMetadata` only.
6. Aggregation orders metadata by priority, removes duplicate metadata IDs, and
   returns diagnostics.
7. The gateway stores context metadata references on `AiExecutionContext`.

The gateway must not call individual context providers directly. All context
selection must go through the Context Registry.

## Provider Contract

Every context provider implements `ContextProvider` and must expose:

- Provider ID and display name.
- Context type.
- Priority.
- Dependencies.
- Supported resources.
- Supported capabilities.
- Version.
- Lifecycle state.

`selectContext()` returns metadata only in M4. Future milestones may add
retrieval, filtering, masking, caching, summarization, and package assembly
behind the same platform boundary.

## Built-In Placeholder Providers

M4 registers these placeholder providers:

| Provider ID | Context Type |
| --- | --- |
| `project-context` | Project |
| `task-context` | Task |
| `document-context` | Document |
| `raid-context` | RAID |
| `team-context` | Team |
| `calendar-context` | Calendar |
| `portfolio-context` | Portfolio |
| `workspace-context` | Workspace |

They do not inject repositories, domain services, HTTP clients, vector stores,
or provider adapters.

## Enablement

Context providers are enabled by default once registered. A provider can be
disabled with:

```text
AI_CONTEXT_PROVIDER_<PROVIDER_ID>_ENABLED=false
```

Hyphens and other non-alphanumeric characters in the provider ID are converted
to underscores. For example:

```text
AI_CONTEXT_PROVIDER_DOCUMENT_CONTEXT_ENABLED=false
```

## Dependency Rules

Allowed dependencies:

- `ai/common`
- `ai/security` contracts
- `ai/monitoring` contracts
- Existing business services in later approved milestones

Forbidden dependencies:

- Provider adapters
- MCP modules
- Prompt execution
- Repositories and entities
- Direct database access
- Direct document retrieval
- Vector search, embeddings, RAG, summarization, or LLM calls

## Extension Checklist

Before adding a future context provider:

1. Confirm an approved milestone authorizes business data retrieval.
2. Register through the Context Registry DI token.
3. Keep provider descriptors stable and versioned.
4. Use approved business services only.
5. Apply source-specific permission filtering before data can enter any context
   package.
6. Emit source attribution, freshness, sensitivity, confidence, and token
   metadata.
7. Add provider contract tests, registry selection tests, and architecture
   guardrail scans.
