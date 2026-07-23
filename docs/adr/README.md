# Architecture Decision Records (ADR)

Architecture Decision Records (ADRs) capture the significant architectural decisions made during the design and evolution of the PM Platform.

Each ADR documents **what decision was made, why it was made, the alternatives considered, and the long-term consequences**.

ADRs provide the architectural history of the platform and serve as the primary reference for future design decisions.

---

# Purpose

The objectives of ADRs are to:

* Document important architectural decisions.
* Explain the rationale behind each decision.
* Preserve architectural knowledge.
* Support long-term maintainability.
* Provide context for future contributors.
* Prevent repeated discussion of previously resolved architectural topics.

---

# ADR Principles

The PM Platform follows these ADR principles:

* Every significant architectural decision is documented.
* ADR numbers are unique and never reused.
* ADRs are immutable once accepted.
* If a decision changes, a new ADR is created rather than modifying historical intent.
* Architecture evolves through documented decisions rather than undocumented implementation.

---

# ADR Lifecycle

Each ADR progresses through one of the following states.

| Status     | Description                                               |
| ---------- | --------------------------------------------------------- |
| Proposed   | Under discussion and not yet approved                     |
| Accepted   | Approved and adopted within the platform                  |
| Superseded | Replaced by a newer ADR                                   |
| Deprecated | No longer recommended but retained for historical context |
| Rejected   | Considered but intentionally not adopted                  |

---

# ADR Naming Convention

All ADRs follow the naming convention:

```text
ADR-XXX-short-description.md
```

Examples:

```text
ADR-001-scheduling-engine.md

ADR-002-planning-engine.md

ADR-003-wbs-model.md

ADR-014-client-platform-layering.md

ADR-016-enterprise-iam-rbac.md
```

Rules:

* Three-digit sequential numbering.
* Numbers are never reused.
* Lowercase filenames.
* Hyphen-separated words.
* One architectural decision per ADR.

---

# Recommended ADR Structure

Each ADR should contain the following sections:

```text
Title

Status

Date

Context

Problem Statement

Decision

Alternatives Considered

Consequences

Implementation Notes

Related ADRs
```

Example header:

```markdown
# ADR-017 Example Decision

Status: Proposed

Date: YYYY-MM-DD

Authors:
- Ram Datla
```

---

# Current ADR Index

## Planning & Scheduling Architecture

| ADR     | Title                   | Status   |
| ------- | ----------------------- | -------- |
| ADR-001 | Scheduling Engine       | Accepted |
| ADR-002 | Planning Engine         | Accepted |
| ADR-003 | WBS Model               | Accepted |
| ADR-004 | Project Workspace       | Accepted |
| ADR-005 | Scheduling Authority    | Accepted |
| ADR-006 | Summary Task Semantics  | Accepted |
| ADR-007 | Milestone Categories    | Accepted |
| ADR-008 | Schedule Analysis Model | Accepted |
| ADR-009 | Dependency Validation   | Accepted |

---

## Enterprise Platform

| ADR     | Title                            | Status   |
| ------- | -------------------------------- | -------- |
| ADR-010 | ERM Aggregate Ownership Boundary | Accepted |
| ADR-011 | ERM Assignment Ownership         | Accepted |
| ADR-012 | ERM Permissions & Visibility     | Accepted |
| ADR-013 | ERM Planning Resource Transition | Accepted |
| ADR-014 | Client Platform Layering         | Accepted |
| ADR-015 | Enterprise Knowledge Platform    | Accepted |
| ADR-016 | Enterprise IAM / RBAC            | Accepted |

---

# Relationship to Other Documentation

Architecture Decision Records complement, but do not replace, other architecture documentation.

| Document              | Purpose                            |
| --------------------- | ---------------------------------- |
| PRODUCT_VISION        | Defines why the platform exists    |
| PLATFORM_PRINCIPLES   | Defines architectural principles   |
| ARCHITECTURE          | High-level architecture overview   |
| PLATFORM_ARCHITECTURE | Detailed technical architecture    |
| ADRs                  | Individual architectural decisions |

The relationship can be viewed as:

```text
Vision
   │
Platform Principles
   │
Architecture
   │
Platform Architecture
   │
Architecture Decision Records
   │
Implementation
```

---

# When to Create an ADR

A new ADR should be created whenever a decision significantly affects the long-term architecture of the platform.

Examples include:

* New architectural patterns
* Platform layering changes
* Security architecture
* Identity and access management
* Storage technologies
* Integration framework changes
* AI platform architecture
* API standards
* Database strategy
* Major technology adoption
* Cross-cutting platform capabilities

Routine implementation details should **not** become ADRs.

---

# Governance

All accepted ADRs become part of the architectural baseline for the PM Platform.

Future architectural work should:

* Review relevant ADRs before implementation.
* Create a new ADR for significant architectural changes.
* Avoid modifying accepted ADRs unless correcting factual errors.
* Reference related ADRs where architectural dependencies exist.

Architecture evolves through documented decisions, ensuring the platform remains consistent, maintainable and understandable as it grows.
