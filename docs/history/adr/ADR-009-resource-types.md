# ADR-009: Resource Types

## Status

Proposed for Epic 1.2.

## Context

Enterprise planning needs more than internal users. Project work may require contractors, teams, equipment, facilities, vehicles, and generic placeholders.

## Decision

Resource type will be explicit and extensible. Initial documented types:

- Human
- Contractor
- Team
- Equipment
- Facility
- Vehicle
- Generic Resource

Resource type influences validation, assignment behavior, user-link requirements, and future capacity rules.

## Alternatives

| Alternative | Rejected Because |
| --- | --- |
| Human-only resources | Blocks equipment, facilities, teams, and generic planning. |
| Free-text resource type | Weak validation and inconsistent reporting. |
| Separate aggregate for every resource type immediately | Premature complexity before common lifecycle is proven. |

## Consequences

- Resource Profile can support broad planning use cases.
- Type-specific rules can be introduced incrementally.
- UI filters and reports can group resources consistently.

## Future Impact

Future releases can add type-specific details such as equipment serial numbers, facility location constraints, vehicle assignment rules, and generic resource replacement workflows.

