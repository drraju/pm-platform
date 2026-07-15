# Resource Workspace

## Status

Approved workspace definition. Detailed interaction specification is pending a dedicated Product UX Evolution task.

## Architecture Position

Resources is one of the seven primary workspaces established by UX-ADR-001. This document reserves its authoritative workspace location and records the approved boundary until the complete Resource Workspace specification is produced.

## Purpose

Govern organizational Resources, capability, capacity, availability, skills, Calendars, and assignments so demand can be met sustainably.

## Primary Personas

- Technical or Resource Manager
- Project Manager
- Program Manager
- Authorized Team Member
- Administrator for configuration-only responsibilities

## Primary Jobs

- Find appropriate capability.
- Understand capacity and availability.
- Maintain accurate Resource profiles.
- Negotiate assignments.
- Resolve overload.
- Plan capability development.
- Identify continuity and concentration risk.

## Approved Information Architecture

```text
Resources
├── Resource Directory
├── Resource Workspace
│   ├── Profile
│   ├── Assignments
│   ├── Capacity & Availability
│   ├── Skills & Capability
│   ├── Calendar
│   ├── Activity & Audit
│   └── Resource Settings
├── Demand & Capacity
├── Assignment Coordination
└── Resource Scenarios
```

## Boundary

Resources owns the Resource experience and composes Calendar lookup and assignment through approved architecture boundaries. It does not own Project commitments, Planning calculations, Calendar definitions, identity accounts, or Scheduling Engine behavior.

The workspace must not reduce people to utilization, expose sensitive information without purpose, autonomously assign people, infer sensitive attributes, rank employee worth, or make employment decisions.

## Canonical Relationships

- Projects supplies commitment and assignment purpose.
- Planning supplies time-phased demand and scenario context.
- Calendars supplies Calendar definitions through approved application boundaries.
- Intelligence supplies authorized analysis without becoming a Resource source of truth.
- Administration supplies identity, permissions, policy, and audit governance without owning staffing decisions.

## Future Detailed Specification

The detailed specification must define workspace zones, directory and profile behavior, demand and capacity views, assignment negotiation, Resource scenarios, privacy, AI assistance, search, notifications, states, performance, success metrics, and extensibility.

## References

- [UX-ADR-001: Workspace-First Architecture](../architecture/UX-ADR-001_WORKSPACE_FIRST_ARCHITECTURE.md)
- [Information Architecture Blueprint](../architecture/INFORMATION_ARCHITECTURE_BLUEPRINT.md)
- [Planning Workspace](PLANNING_WORKSPACE.md)
