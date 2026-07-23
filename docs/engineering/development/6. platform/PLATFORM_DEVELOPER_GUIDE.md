# PM Platform Developer Guide

## Purpose

This guide explains how to extend the frontend platform foundations without
crossing their ownership boundaries. Read
[Platform Architecture](../architecture/PLATFORM_ARCHITECTURE.md) and
[ADR-014](../architecture/adr/ADR-014-client-platform-layering.md) first.

Use public barrel imports in application code. Direct file imports are reserved
for implementation files within the same framework.

## Add a Command

Create a feature-local `CommandProvider`. Commands should orchestrate an
existing UI action or existing route; they must not duplicate business logic.

```ts
import type { CommandProvider } from "@/lib/commands";

export const projectCommands: CommandProvider = {
  id: "projects",
  getCommands: () => [
    {
      category: "Projects",
      id: "projects.open",
      keywords: ["delivery", "workspace"],
      navigationTarget: "/projects",
      title: "Open Projects",
    },
  ],
};
```

Requirements:

1. Use stable, namespaced provider and command IDs.
2. Reuse existing navigation or client-side workflows.
3. Set `enabled: false` when the capability is unavailable.
4. Keep permission decisions in provider composition, not the registry.
5. Register and unregister providers at the application integration boundary.
6. Add registry/provider tests and palette tests only when presentation changes.

Do not add API calls, form submission, or domain mutation logic to a command.

## Add an Entity

Create an `EntityProvider` from data already loaded by the owning feature.

```ts
import type { EntityProvider } from "@/lib/entities";

export const loadedProjectEntities: EntityProvider = {
  id: "loaded-projects",
  getEntities: (context) =>
    projects.map((project) => ({
      category: "Projects",
      id: `project:${project.id}`,
      keywords: [project.status],
      navigationTarget: `/projects/${project.id}`,
      subtitle: project.status,
      title: project.name,
    })),
};
```

Use the supplied context for pathname, project, and permission-aware exposure.
Do not fetch inside a provider. IDs must be stable and globally unique within a
registry snapshot.

For provider-level section labels or limits, implement
`PresentableEntityProvider` from `@/features/entity-search` and add
`presentation` metadata. Do not extend `EntityRegistry` for display concerns.

## Add an AI Provider

`AIProvider` is a provider-neutral future extension contract. Stage 5.10 does
not register or call providers. A future approved implementation should live in
a feature integration package, not `frontend/lib/ai`.

An adapter must implement the existing operations:

- `resolveIntent()`
- `createPlan()`
- `summarize()`
- `explain()`
- `analyze()`

Provider output is untrusted input. Convert it into existing immutable models,
then pass plans through Governance and Authorization. Never expose registries,
router objects, React components, API clients, or domain services to a provider.

Before adding any concrete provider, require an approved architecture/security
stage covering credentials, transport, data classification, retries, telemetry,
and failure handling.

## Add a Governance Rule

Use `ConfirmationPolicy` to classify existing command IDs without modifying a
registry or plan:

```ts
import { ConfirmationPolicy } from "@/lib/ai/governance";

const confirmationPolicy = new ConfirmationPolicy({
  commandClassifications: {
    "project.update": "ProjectMutation",
    "workspace.refresh": "WorkspaceMutation",
  },
});
```

Available action classes are `ReadOnly`, `Navigation`, `WorkspaceMutation`,
`ProjectMutation`, and `Administrative`.

Changes to validation invariants or the meaning of an action class are
architecture changes. Update focused governance tests and ADR-014, or create a
new ADR when the trust boundary changes. Invalid, unknown, or mutable plans must
remain blocked.

## Add an Authorization Policy

Create a frozen configuration from the defaults:

```ts
import {
  AuthorizationEngine,
  createPolicyConfiguration,
} from "@/lib/ai/authorization";

const policy = createPolicyConfiguration({
  ProjectMutation: {
    confirmationRequired: true,
    requiredPermissionLevel: "ProjectWrite",
    requiredPermissions: ["ai.project.mutate"],
  },
});

const authorizationEngine = new AuthorizationEngine(policy);
```

Policy permission keys are declarative. Application integration is responsible
for supplying the authenticated user's permission snapshot. Never infer a
permission from UI visibility alone.

Keep administrative operations blocked when Governance blocks them. Do not
construct authorization results, sessions, or tokens manually; use the public
engines and factories so immutability and expiry checks are retained.

## Compose the Trust Pipeline

```ts
const orchestration = aiPlatform.orchestrate(intentRequest, contextInput);
const governance = governanceEngine.evaluate(orchestration.plan);
const authorization = authorizationEngine.authorize({
  governanceResult: governance,
  plan: orchestration.plan,
  userPermissions,
});
const confirmation = confirmationEngine.createRequest(authorization);
```

This is the end of the active platform pipeline. Sessions and tokens are
descriptive authorization artifacts. There is no executor and no component in
this pipeline may call a provider, navigate, mutate state, or call an API.

## Public API and Naming Rules

- Import engines and models from their framework barrel.
- Do not export snapshot helpers or internal audit constructors.
- Use `<Concern>Engine` for stateless decision services.
- Use string unions and frozen constants instead of TypeScript enums.
- Use `Result` for complete outcomes, `Evaluation` or `Assessment` for partial
  decisions, and `Request`, `Session`, or `Token` for lifecycle artifacts.
- Prefix AI-domain models with `AI` when ambiguity exists.
- Keep IDs namespaced and timestamps in ISO-8601 form.

## Immutability Checklist

- Model properties use `Readonly` and collections use `readonly`.
- Factories copy caller-owned arrays and nested records.
- Runtime trust artifacts use `Object.freeze` at every mutable nesting level.
- Tests assert both value behavior and frozen boundaries.
- Never use a type assertion to promote mutable external data to a trusted
  result.

## Test Placement

Keep platform tests in `frontend/tests` using framework-oriented names:

- command behavior: `command-*.test.*`
- entity behavior: `entity-*.test.*`
- AI generation: `ai-platform.test.ts`
- governance: `ai-governance.test.ts`
- authorization/session/token: `ai-authorization.test.ts`
- Foundation components: `ui-foundation*.test.tsx`

Prefer layer-local fixtures. Share a helper only when it removes meaningful
duplication without hiding the trust boundary being tested.

## Required Verification

From `frontend/` run:

```text
npm test
npm run build
npm run lint
```

From the repository root run `git diff --check`. Confirm modified framework
files introduce no new warnings and dependency direction remains acyclic.
