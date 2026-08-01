# M13 Enterprise AI Skills

## Repository Investigation

The repository already contained a provider-independent `AiSkillRegistryService`, metadata-only skill resolution, dependency graph construction, and three built-in skill definitions. M11 supplies enterprise context types and M12 supplies the provider-neutral `PromptModel`.

## Architecture

M13 keeps skills declarative. An explicit intent identifies a skill; the registry validates the skill's context, authorization, and prompt compatibility. M11 remains responsible for retrieving and filtering context, and M12 remains responsible for composing prompts. Skills do not generate prompts or invoke providers.

## Skill Registry

`AiSkillRegistryService` supports lookup, plugin-style registration, metadata validation, explicit intent validation, context requirement validation, authorization validation, and prompt compatibility validation. Existing lifecycle flags, feature flags, priority ordering, and dependency graph behavior remain intact.

## Skill Contracts

`AiSkillMetadata` now declares display name, category, version, required and optional enterprise context, supported response formats, and authorization rules including required permissions, optional allowed roles, and sensitive-context policy. Existing capability, prompt-category, provider-feature, and future dependency metadata are preserved.

## Intent Model

`AiIntent` is a small explicit object containing an intent ID, selected skill ID, and optional parameters. It is not an NLP result and has no inference behavior.

## Context Requirements

Required context is validated before composition compatibility is accepted. Optional context is descriptive and does not block execution. The registry consumes context metadata only; M11 remains the authorization-aware source of actual enterprise data.

## Prompt Composition Compatibility

The registry checks that required context sections are present in a M12 `PromptModel`-compatible shape. It does not render or mutate the prompt.

## Provider Independence

No skill contract references OpenAI, Claude, Gemini, or provider payloads. Provider selection and formatting remain outside the skill registry.

## Files Changed

- `backend/src/ai/skills/skill-platform.types.ts`
- `backend/src/ai/skills/intent.types.ts`
- `backend/src/ai/skills/ai-skill-registry.service.ts`
- `backend/src/ai/skills/built-in-skill-definitions.ts`
- M13 skill contract tests

## Testing

Tests cover skill registration and lookup, contract validation, explicit intents, required context, authorization rules, prompt compatibility, and rejection of incomplete requirements. Existing registry, resolution, dependency graph, and architecture guardrail tests remain applicable.

## Future Extension Points

Future milestones can add a dedicated intent-to-skill selection policy, richer role/permission providers, plugin lifecycle APIs, and skill-specific response schemas. Reasoning, agents, tools, memory, RAG, and autonomous workflows remain intentionally out of scope.
