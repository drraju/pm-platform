# AI Prompt Platform Developer Guide

## Purpose

The AI Prompt Platform provides prompt metadata registration and prompt
resolution foundations for the AI Gateway. In M5 it does not render templates,
substitute variables, compile prompt text, call providers, or execute LLM
requests.

## Generic Registry Framework

Reusable registry infrastructure lives under
`backend/src/ai/common/registry/`.

It provides:

- `Registry<T>` contract.
- `BaseRegistry<T>` implementation.
- `RegistryEntry` and `RegistryMetadata`.
- `RegistryDiagnostics`.
- `RegistryValidation`.
- Registry errors for duplicate and invalid entries.
- Registry utilities for duplicate detection, metadata validation, and priority
  ordering.

All AI registries should use this framework for registration, deregistration,
discovery, ordered lookup, enable/disable behavior, diagnostics, validation,
extension metadata, feature flag awareness, and duplicate detection.

M5 refactors the Capability Registry, Provider Registry, and Context Registry
onto this shared base. Future Skill, MCP Tool, MCP Resource, Policy, and other
extension registries should follow the same pattern.

## Prompt Registry

Prompt platform code lives under `backend/src/ai/prompts/`.

| File | Responsibility |
| --- | --- |
| `prompt-platform.types.ts` | Prompt metadata, lifecycle, selection, composition, diagnostics, variables, and classification types. |
| `ai-prompt-registry.service.ts` | Prompt registration, discovery, lifecycle metadata, enable/disable support, and diagnostics. |
| `ai-prompt-resolution-engine.service.ts` | Metadata-only prompt selection, precedence diagnostics, and composition metadata contracts. |
| `built-in-prompt-definitions.ts` | M5 metadata-only built-in prompt definitions. |
| `variable-resolution.interface.ts` | Future variable resolution contracts for user, workspace, project, portfolio, task, calendar, provider, capability, and execution context variables. |
| `prompt-compilation.interface.ts` | Future validation, composition, compilation, optimization, diagnostics, and token-estimation contracts. |

## Metadata Model

Every prompt definition declares:

- Prompt ID and name.
- Version.
- Category.
- Capability.
- Supported context types.
- Priority.
- Variables.
- Security classification.
- Estimated tokens.
- Owner.
- Lifecycle status.

Prompt definitions are metadata only in M5. No prompt body or template text is
registered.

## Prompt Resolution

The Gateway prompt-resolution stage calls `AiPromptResolutionEngineService`.
The engine:

1. Looks up enabled prompts by capability.
2. Applies optional context-type compatibility filtering.
3. Selects the highest-priority matching prompt.
4. Returns selected prompt metadata and diagnostics.
5. Stores prompt ID/version metadata on the execution context.

The engine does not render templates, substitute variables, compile prompt text,
call providers, or execute AI behavior.

## Enablement

Prompts are enabled by default unless retired. A prompt can be disabled with:

```text
AI_PROMPT_<PROMPT_ID>_ENABLED=false
```

Hyphens and other non-alphanumeric characters are converted to underscores. For
example:

```text
AI_PROMPT_ASSISTANT_CHAT_FOUNDATION_ENABLED=false
```

## Extension Model

To add a future prompt definition:

1. Confirm the milestone authorizes prompt metadata registration.
2. Register metadata through `AI_PROMPT_DEFINITIONS`.
3. Keep IDs stable and versions explicit.
4. Declare supported capabilities and context types.
5. Declare required variables as contracts only until variable resolution is
   implemented.
6. Add registry, resolution, and architecture guardrail tests.

Prompt implementation work in later milestones must keep prompt rendering,
context access, provider invocation, and business services behind their
approved platform boundaries.
