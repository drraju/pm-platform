# ADR-014: Client Platform Layering and Trust Boundaries

## Status

Accepted.

## Date

2026-07-18

## Authors

PM Platform Architecture

## Context

UI Foundation, commands, entities, unified search, AI planning, governance, and
authorization were introduced as separate frontend foundations. Provider and
execution integration is intentionally absent. Before those integrations can
be considered, the repository needs a canonical dependency direction and
public API policy that prevents presentation, registry, policy, and trust
concerns from collapsing into one framework.

## Decision

The frontend platform uses independent layers with application-owned
composition:

1. UI Foundation owns presentation primitives only.
2. Command and Entity registries own capability and searchable-metadata
   registration.
3. Search features consume both registries without changing their contracts.
4. AI Platform creates immutable descriptive plans from explicit intent and
   context data.
5. Governance validates and classifies plans and produces policy/audit results.
6. Authorization checks permissions, creates confirmation requests, and models
   immutable sessions and descriptive tokens.
7. No execution layer exists.

Frameworks expose intended engines, extension interfaces, immutable models,
configuration entry points, and stable constants through barrel files.
Snapshot helpers and internal audit construction are not public APIs. Internal
modules import direct lower-layer files instead of importing through barrels.

Trust artifacts use compile-time readonly models and runtime freezing.
Governance and Authorization fail closed for malformed, mutable, unknown,
expired, or permission-incompatible input.

## Dependency Rules

- UI Foundation has no dependency on feature state or platform orchestration.
- Command and Entity registries have no dependency on their presentation
  consumers.
- AI Platform receives command/entity metadata as context and does not import
  registries.
- Governance depends on AI plan types but never invokes AI Platform.
- Authorization depends on AI plan and Governance contracts but never invokes
  those engines.
- The application composition root sequences layers.
- A future provider adapter must remain outside the core AI package.
- A future executor requires a new ADR and security review.

## Rationale

Separate generation, validation, authorization, and future execution boundaries
make unsafe coupling visible and independently testable. Immutable artifacts
allow each boundary to verify what the previous boundary produced without
sharing mutable application state.

## Alternatives Considered

| Alternative | Reason rejected |
| --- | --- |
| Put search, AI, policy, and execution in one service | Couples presentation and trust decisions and prevents independent testing. |
| Let AI Platform call registries directly | Gives planning access to mutable capability infrastructure and reverses dependency direction. |
| Treat generated plans as authorized operations | Removes validation, permission, confirmation, and audit boundaries. |
| Introduce a concrete provider during stabilization | Adds network, credential, privacy, and failure concerns before the trust pipeline is approved. |
| Introduce an executor with authorization tokens | Tokens are currently descriptive and unsigned; execution requires a separate security design. |

## Consequences

- Application code must explicitly compose AI, Governance, and Authorization.
- Some defensive validation is repeated at trust boundaries by design.
- Public API additions require architecture review and focused tests.
- Provider integration and execution remain blocked until later approved stages.
- Documentation and tests use `AI Platform` terminology rather than legacy
  Copilot naming.

## Future Considerations

- Provider adapters require transport, credential, data-classification, retry,
  telemetry, and failure policies.
- Executable tokens require signing, verification, revocation, secure storage,
  subject binding, and replay protection.
- Persisted governance and authorization audit records require backend and data
  retention architecture.

## References

- [Platform Architecture](../PLATFORM_ARCHITECTURE.md)
- [Platform Developer Guide](../../development/PLATFORM_DEVELOPER_GUIDE.md)
- [ADR-005 Frontend Architecture](ADR-005-frontend-architecture.md)
- [AI Platform Foundation](../ai-platform.md)
