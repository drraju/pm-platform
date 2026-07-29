# AI Architecture Validation Guide

## Purpose

AI architecture validation protects the M1-M7 foundation from dependency drift
as execution-layer work begins.

## Required Checks

Run from `backend/`:

```bash
npm run build
npx eslint "src/ai/**/*.ts"
npm test -- --runTestsByPath src/ai/common/architecture/dependency-guardrails.spec.ts src/ai/common/registry/registry-conformance.spec.ts
```

## Dependency Guardrails

`dependency-guardrails.spec.ts` validates production AI source files for:

- Forbidden platform or runtime imports.
- Cross-boundary package violations.
- Package-level circular dependencies.

The scan excludes test files so focused tests can import multiple packages
without weakening production package direction.

## Registry Conformance

`registry-conformance.spec.ts` validates shared registry behavior across:

- Capability Registry.
- Provider Registry.
- Context Registry.
- Prompt Registry.
- Skill Registry.
- MCP registries.

The conformance suite checks ordering, lookup, enable/disable behavior,
diagnostics, lifecycle preservation, and metadata consistency.

## Boundary Rule

Shared contracts belong in `backend/src/ai/common/contracts`.

Gateway, Context, Prompt, Skills, Providers, MCP, Monitoring, Security, and
future Conversation Platform code should depend on common contracts for shared
type shapes instead of importing each other only for type reuse.
