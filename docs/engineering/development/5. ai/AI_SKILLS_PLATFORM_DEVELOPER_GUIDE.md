# AI Skills Platform Developer Guide

## Purpose

The AI Skills Platform catalogs governed AI skills and their dependencies. In
M6 it is metadata-only: skills can be registered, discovered, resolved, and
validated as contracts, but no skill execution, business logic, provider calls,
prompt execution, context retrieval, MCP behavior, streaming, repositories,
controllers, or database access exists.

## Skill Registry

The Skill Registry lives in `backend/src/ai/skills/ai-skill-registry.service.ts`
and uses the Generic Registry Framework from `ai/common/registry`.

It supports:

- Registration and deregistration through the shared registry base.
- Discovery and priority ordering.
- Enable/disable behavior.
- Feature flag awareness.
- Diagnostics.
- Metadata validation.

Skill definitions are registered through `AI_SKILL_DEFINITIONS`.

## Skill Metadata

Each skill metadata definition includes:

- Skill ID, name, version, category, and description.
- Owner.
- Lifecycle status.
- Priority.
- Required capabilities.
- Supported context types.
- Required prompt categories.
- Required provider features.
- Security classification.
- Dependency declarations.

M6 built-in definitions are draft metadata contracts only:

| Skill ID | Category |
| --- | --- |
| `project-delivery-assistant` | Project delivery |
| `raid-analysis-assistant` | RAID |
| `portfolio-status-assistant` | Portfolio |

## Lifecycle

Supported lifecycle states are:

- `draft`
- `experimental`
- `preview`
- `active`
- `deprecated`
- `retired`

Lifecycle policies are contracts only in M6.

## Dependency Framework

Every skill declares dependencies for:

- Capabilities.
- Context types.
- Prompt categories.
- Provider features.
- Future skill dependencies.
- Future agent dependencies.

`AiSkillDependencyGraphService` builds a metadata graph with skill nodes and
dependency edges. The graph is intended for future orchestration, agent
workflows, execution planning, visualization, and diagnostics.

## Resolution

`AiSkillResolutionService` resolves metadata by:

1. Optional skill ID.
2. Optional capability ID.
3. Optional context type compatibility.
4. Optional prompt category compatibility.
5. Optional provider feature compatibility.
6. Priority ordering.

Resolution returns skill metadata and diagnostics only.

## Validation Contracts

M6 defines contracts for:

- Dependency validation.
- Compatibility validation.
- Configuration validation.
- Version validation.

No runtime validation behavior beyond registry metadata construction checks is
implemented.

## Enablement

Skills are enabled by default unless retired. A skill can be disabled with:

```text
AI_SKILL_<SKILL_ID>_ENABLED=false
```

Hyphens and other non-alphanumeric characters are converted to underscores. For
example:

```text
AI_SKILL_PROJECT_DELIVERY_ASSISTANT_ENABLED=false
```

## Extension Model

To add a future skill:

1. Confirm the milestone authorizes the skill metadata or execution behavior.
2. Register metadata through `AI_SKILL_DEFINITIONS`.
3. Keep IDs stable and versions explicit.
4. Declare dependencies explicitly.
5. Keep provider adapters, MCP modules, repositories, controllers, and direct
   database access out of `ai/skills`.
6. Add registry, resolution, dependency graph, and architecture guardrail tests.

Future executable skills must remain thin, provider-neutral facades over
approved business services and must not duplicate domain rules.
