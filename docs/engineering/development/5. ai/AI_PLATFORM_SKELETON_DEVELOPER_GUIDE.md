# AI Platform Skeleton Developer Guide

**Release:** v1.3  
**Milestone:** M1 - AI Platform Skeleton  
**Status:** Implementation foundation  

This guide documents the M1 AI Platform Skeleton. M1 establishes structure,
contracts, dependency injection tokens, configuration loading, logging hooks,
telemetry contracts, audit contracts, and shared error types only.

M1 does not implement AI business functionality, provider integrations, prompt
execution, MCP behavior, LLM calls, skills, controllers, DTOs, entities,
repositories, or tests.

## Module Layout

The backend AI Platform skeleton is rooted at:

```text
backend/src/ai/
```

Current package layout:

```text
backend/src/ai/
  ai.module.ts
  index.ts
  common/
  context/
  gateway/
  governance/
  mcp/
  monitoring/
  prompts/
  providers/
  security/
  skills/
```

## Package Responsibilities

| Package | Responsibility |
| --- | --- |
| `common` | Shared AI request, response, scope, capability, lifecycle, error, configuration, logging, and DI token definitions. |
| `gateway` | Public AI Gateway interface contracts. No gateway behavior in M1. |
| `providers` | AI provider adapter interface contracts. No provider integrations in M1. |
| `skills` | AI Skill interface contracts. No skills in M1. |
| `prompts` | Prompt provider interface contracts. No prompt templates or prompt execution in M1. |
| `context` | Context provider interface contracts. No context aggregation in M1. |
| `mcp` | MCP tool and resource interface contracts. No MCP server implementation in M1. |
| `security` | AI authorization provider interface contracts. No new authorization behavior in M1. |
| `governance` | Governance lifecycle type definitions. No governance runtime in M1. |
| `monitoring` | Telemetry and audit provider interface contracts. No metrics or audit events in M1. |

## Dependency Rules

- `ai/common` must not depend on other AI packages.
- `ai/gateway` may depend on public contracts from other AI packages.
- `ai/mcp` must delegate future execution to the AI Gateway and must not call
  skills, prompts, providers, context providers, or business services directly.
- `ai/providers` must not depend on skills, prompts, context, MCP, or business
  services.
- `ai/prompts` must not fetch context, call providers, or execute business
  logic.
- `ai/context` must fetch future context only through approved business
  services and must not call providers or MCP.
- `ai/skills` must use existing business services and must not access
  repositories, persistence entities, providers, or MCP directly.
- Existing business modules must not depend on AI modules.

## Dependency Injection Tokens

M1 registers placeholder DI tokens in `AiModule`:

- `AI_AUTHORIZATION_PROVIDER`
- `AI_AUDIT_PROVIDER`
- `AI_CONTEXT_PROVIDERS`
- `AI_GATEWAY`
- `AI_MCP_RESOURCES`
- `AI_MCP_TOOLS`
- `AI_PROMPT_PROVIDER`
- `AI_PROVIDER_ADAPTERS`
- `AI_SKILLS`
- `AI_TELEMETRY_PROVIDER`

Collection tokens are registered as empty arrays. Singular future provider
tokens are registered as `null` placeholders. This allows the module to
initialize without enabling AI behavior.

## Configuration

`AiConfigService` reads AI configuration from environment variables and returns
a typed configuration object. Feature flags default to disabled unless
explicitly enabled.

Initial feature flag areas:

- AI Platform root enablement.
- AI Gateway.
- Provider support.
- Context Platform.
- Prompt Platform.
- Skills Framework.
- MCP.
- Internal Assistant.
- External clients.
- Streaming.
- Context caching.
- Context summarization.

Feature flags must never bypass authorization, audit, workspace isolation,
project isolation, tenant isolation, or prompt governance.

## Extension Points

Future milestones will add concrete implementations behind the M1 contracts:

- M2: AI Gateway foundation.
- M3: Provider Registry and mock provider adapter.
- M4: Context Platform.
- M5: Prompt Platform.
- M6: Skills Framework.
- M7: MCP Server.

New providers, skills, prompts, MCP tools, MCP resources, context providers,
telemetry providers, audit providers, and authorization providers must be added
through the approved public interfaces and DI tokens.

## M1 Compliance Checklist

- AI Platform is imported into the NestJS application through `AiModule`.
- No controllers are introduced.
- No endpoints are exposed.
- No provider integrations are introduced.
- No prompt templates or prompt execution are introduced.
- No MCP server implementation is introduced.
- No skills or AI business logic are introduced.
- Configuration loads with safe disabled defaults.
- Shared AI error types are available.
- Logging, telemetry, and audit foundations are contract-only.
