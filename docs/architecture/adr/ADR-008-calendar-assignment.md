# ADR-008: Calendar Assignment

## Status

Accepted.

## Context

Epic 1.1 introduced Enterprise Calendar administration. Feature 1.2.6 requires a Resource to reference an Enterprise Calendar without transferring ownership of calendar definitions or introducing Planning or Scheduling behavior.

The Resource aggregate is owned by Enterprise Resource Management (ERM). Calendar owns Enterprise Calendar definitions and their lifecycle. ERM owns only the metadata that associates a Resource with a Calendar.

Feature 1.2.6 requires at most one assigned Calendar per Resource. It does not require effective dating, assignment history, an independent assignment lifecycle, or multiple concurrent Calendar assignments.

## Decision

Resource remains the aggregate root for Calendar assignment. Resource contains one nullable `calendar_id` reference to an Enterprise Calendar. Many Resources may reference the same Calendar.

The authoritative effective-Calendar rule for Feature 1.2.6 is:

```text
Assigned Calendar = Effective Calendar
```

When `Resource.calendar_id` is `NULL`, the Resource has no effective Calendar. Feature 1.2.6 does not implement Calendar inheritance or precedence.

No Resource Calendar Assignment entity or assignment table is introduced. Assign, replace, clear, and retrieve operations occur through the Resource aggregate.

### Ownership and Dependency Direction

- ERM owns Resource Calendar assignment metadata.
- Calendar owns Calendar definitions and lifecycle.
- ERM validates Calendar assignments only through an exported read-only Calendar application service.
- ERM must not depend directly on Calendar repositories.
- Calendar must not depend on Resource.
- Calendar assignment does not mutate Planning data, SchedulingContext, or schedules.

### Calendar Lifecycle

- Active Calendars are assignable.
- Archived Calendars remain valid historical references for existing Resource assignments but cannot receive new assignments.
- Soft-deleted Calendars are not assignable and are not considered active.
- Archiving a Calendar does not mutate Resources.

### Authorization

Calendar assignment uses the ERM authorization model established by ADR-012:

- Retrieval requires `resource.read`.
- Assign, replace, and clear require `resource.update`.

No new permission family or Project permission is introduced.

### Persistence Policy

- Calendar assignment is represented by an additive nullable foreign key on Resource.
- No separate assignment table is created.
- The association must not cause cascading mutation of Resource or Calendar state.
- Existing Resources remain valid without a Calendar assignment.

## Rationale

A nullable reference is sufficient for the approved one-to-zero-or-one association and preserves Resource aggregate ownership. A separate assignment aggregate would add lifecycle and persistence concepts that the approved requirements do not need.

The design keeps Calendar definitions authoritative in Calendar while allowing ERM to govern Resource metadata. It also preserves Planning ownership, Scheduling isolation, backward compatibility, and additive evolution.

## Alternatives Considered

| Alternative | Rejected Because |
| --- | --- |
| Resource Calendar Assignment entity | Effective dating, assignment history, independent lifecycle, and multiple concurrent Calendars are not approved requirements. |
| Calendar precedence engine | Feature 1.2.6 defines the assigned Calendar as the effective Calendar; inheritance is deferred. |
| Resource-owned Calendars | Duplicates Calendar definitions and violates Calendar ownership. |
| Direct Calendar repository access from ERM | Bypasses the Calendar application boundary and couples ERM to Calendar persistence. |
| Calendar dependency on Resource | Reverses the approved dependency direction and couples Calendar to ERM. |
| Scheduling integration | Calendar assignment is administrative metadata and must not introduce Scheduling behavior or schedule mutation. |

## Consequences

- Resource can expose assigned and effective Calendar metadata without changing schedules.
- Existing Resources remain valid with a `NULL` Calendar reference.
- Calendar lifecycle changes do not cascade into Resource mutations.
- Archived assignments remain traceable while new assignments are limited to active Calendars.
- Future inheritance cannot be inferred from this direct association.

## Future Considerations

Future User, Team, Project, or Organization Calendar inheritance and precedence are explicitly deferred. Introducing any precedence engine, assignment history, effective dating, or SchedulingContext integration requires a new architecture review and ADR approval.

Any future Planning or Scheduling integration must preserve ADR-003 and ADR-013 and use approved service boundaries rather than direct persistence dependencies.

## References

- [ADR-002 Calendar Architecture](ADR-002-calendar-architecture.md)
- [ADR-003 Scheduling Isolation](ADR-003-scheduling-isolation.md)
- [ADR-010 ERM Aggregate and Ownership Boundary](ADR-010-erm-aggregate-ownership-boundary.md)
- [ADR-012 ERM Permissions and Visibility](ADR-012-erm-permissions-visibility.md)
- [ADR-013 ERM Planning Resource Transition](ADR-013-erm-planning-resource-transition.md)
- [ERM Architecture Design Document](../ERM_ARCHITECTURE_DESIGN_DOCUMENT.md)
- [Resource Architecture](../RESOURCE_ARCHITECTURE.md)
