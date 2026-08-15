# TARGET PM PLATFORM MODEL V1

**Status:** LOCKED PRODUCT / ARCHITECTURE BASELINE\
**Project:** Build PM Solution / PM Platform\
**Version:** 1.0\
**Date:** 2026-08-14

## 1. Purpose

This document is the governing target product and architecture model for
the PM Platform following the platform-wide product architecture audit.

Its purpose is to stop incremental feature growth from creating
overlapping workspaces, duplicated domain behaviour, inconsistent
authorization and competing mental models.

**Governing rule: Consolidate before extending.**

No new workspace, domain object, role, permission abstraction, task
model, AI silo or parallel command path should be introduced unless a
concrete business journey demonstrates that the existing model cannot
support the requirement.

## 2. Product Positioning

The PM Platform is:

> **An enterprise IT project delivery platform with portfolio oversight,
> personal work orchestration, governance and AI-assisted project
> intelligence.**

It is not a collection of independent task-management applications.

The product operates across three management horizons:

  -----------------------------------------------------------------------
  Horizon                 Core question           Primary experience
  ----------------------- ----------------------- -----------------------
  Personal                What needs my           Home / My Work
                          attention?              

  Project                 What is happening and   Projects / Planning /
                          what needs to be done?  Delivery / Govern

  Portfolio               Where does management   Portfolio /
                          need to intervene?      Intelligence
  -----------------------------------------------------------------------

These horizons share the same underlying project and task domain.

## 3. Global Navigation

The target global navigation is:

-   **Home** --- personal work
-   **Portfolio** --- cross-project management
-   **Projects** --- project discovery and selection
-   **Planning** --- project plan authoring
-   **Resources** --- people, allocation and capacity
-   **Intelligence** --- analytics and AI-assisted intelligence
-   **Administration** --- platform configuration and security

Not every capability deserves to become navigation.

The following are views, modes or capabilities rather than independent
workspaces:

  Concept        Target location
  -------------- ----------------------------------------------------
  Today          Home → My Work → Today; Project → Delivery → Today
  My Tasks       Home → My Work
  Daily Review   Project → Delivery → Review
  Documents      Project capability
  RAID           Project → Govern
  Calendar       Contextual/project capability
  AI             Cross-platform Intelligence layer

## 4. Personal Work

### Home → My Work

My Work is the user's personal work universe. It is a set of views over
existing tasks, not a second task domain.

Views:

-   All
-   Today
-   Upcoming
-   Overdue
-   Waiting
-   Delegated

**My Work** answers: *What work is materially relevant to me?*

**Today** answers: *What should I focus on today?*

Today is a focus mode, not a separate task system.

The same underlying tasks, permissions and hierarchy are used.

## 5. Project Model

A project is the primary delivery, governance, membership, authorization
and external-sharing boundary.

``` text
Project
├── Overview
├── Planning
├── Delivery
├── Govern
├── Team
├── Documents
└── Reports
```

### Planning

Planning answers:

> **What should happen?**

Planning owns:

-   WBS
-   hierarchy
-   task/sub-task creation
-   milestones
-   ownership
-   planned dates
-   dependencies
-   schedule
-   baseline
-   critical path
-   resource planning

Planning is where the PM designs the work.

### Delivery

Delivery answers:

> **What is happening?**

Target views:

-   List
-   Board
-   Timeline
-   Today
-   Review
-   History

These are views over the same execution model.

### Review

Review answers:

> **What changed and what requires attention?**

Daily Review as a top-level product concept is deprecated. The
capability remains under:

**Project → Delivery → Review**

Review may include execution review, overdue work, blockers, exceptions,
completion review, AI-generated summaries/questions and review history.

### Govern

Govern owns:

-   RAID
-   decisions
-   project-level dependencies/governance
-   management actions

## 6. Canonical Task Model

There is exactly one canonical Task domain object.

``` text
Task
├── Summary
├── Standard Task
│      └── Sub-task
└── Milestone
```

A task has one identity across Planning, Delivery, My Work, Today,
Review, Portfolio and AI.

There must not be separate concepts such as Planning Task, Delivery
Task, My Task, Today Task or Review Task.

### Task lifecycle

``` text
CREATE → PLAN → ASSIGN → SCHEDULE → EXECUTE → UPDATE → REVIEW → COMPLETE → REPORT
```

The Task survives the entire lifecycle.

## 7. Task Creation

Task creation must be possible where the user discovers the need.

### Planning

Full authoring of tasks, sub-tasks, milestones, hierarchy, ownership,
dates, dependencies and scheduling attributes.

### Delivery / My Work / Today

Contextual quick-create is allowed.

Quick-create uses the current project, parent, owner and basic dates as
appropriate and creates a normal canonical Task.

Advanced structural planning can direct the user to Planning.

**All creation entry points invoke the same canonical Task
command/application service.**

## 8. Canonical Task Commands

Task behaviour must converge toward one application command boundary:

``` text
Planning ──┐
Delivery ──┼──> Canonical Task Application Service
My Work ───┤
Today ─────┤
AI ────────┘
```

The canonical service owns:

-   create
-   update
-   assign
-   reassign
-   move
-   complete
-   delete

with distinct policies for planning edits, execution edits, assignment,
reassignment and structural changes.

No workspace should maintain an independent task command implementation.

## 9. Hierarchy and Dependencies

Hierarchy provides both execution context and accountability context.

A parent owner can see relevant child work when policy permits, because
child work is necessary to understand delivery of the parent.

However:

> **Contextual visibility does not automatically grant edit authority.**

Dependency semantics remain direct relationships between canonical task
nodes.

If:

``` text
A → B
B ├── B1
  └── B2
```

the dependency remains:

``` text
A → B
```

It must not automatically propagate to B1 and B2.

## 10. Roles

Target global personas:

1.  Platform Admin
2.  Executive
3.  Portfolio Manager
4.  Project Manager
5.  Project Team Member
6.  Customer
7.  Partner

Global roles define persona and broad eligibility. They do not
automatically grant project-wide authority.

## 11. Effective Authorization

Effective authority is contextual:

``` text
Global Role
+
Scope
+
Project Role
+
Membership
+
Assignment
+
Capability
+
Object State
=
Effective Authority
```

The following are distinct:

-   VIEW
-   EDIT
-   EXECUTE
-   ASSIGN
-   ADMINISTER

Examples of action-oriented capabilities:

``` text
project.view
project.edit_metadata

task.view
task.edit_plan
task.edit_execution
task.record_update
task.complete
task.assign
task.reassign

project.manage_team
project.archive

iam.manage_users
```

### Project Manager

A global Project Manager role means:

> This person is capable of managing projects.

It does not mean:

> This person can edit every project.

Project authority requires appropriate project scope/role.

### Portfolio Manager

Portfolio authority covers cross-project visibility and management, but
does not automatically grant project mutation authority for every
project.

Where a Portfolio Manager also acts as Project Manager, explicit project
authority applies.

### Executive

Executives primarily consume portfolio intelligence and management
attention rather than routine task-level execution interfaces.

### Project Team Member

Team Members operate primarily through assigned work. They may see
relevant hierarchy and project context while remaining restricted from
project management, WBS structural, dependency, team-management and
governance authority unless explicitly granted.

**Assignment is not project management.**

## 12. External Users

Customer and Partner are external audiences.

External users should consume an approved external project projection
rather than automatically receiving the internal project aggregate.

``` text
Internal Project
      ↓
External Projection
      ↓
Customer / Partner
```

External visibility must explicitly define visible projects, tasks,
milestones, documents, status and permitted contribution/update actions.

Internal RAID, comments, staffing, internal planning information and
internal documents must not become visible merely because a user is
classified as Customer or Partner.

## 13. Portfolio, Program and Organisation

### Portfolio

Portfolio is a valid product concept and should mature as a
cross-project management capability.

### Program

A persisted Program domain entity is deferred.

Do not introduce it until a concrete business journey requires
independent program ownership, governance, planning, reporting or
cross-project dependency management.

### Organisation / Multi-tenancy

Do not implement a first-class organisation/tenant model until product
strategy explicitly requires it.

The absence of these entities is intentional.

## 14. AI and Agent Architecture

AI is a horizontal intelligence and action layer, not another
project-management workspace.

``` text
                    AI / AGENTS
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
    Planning          Delivery          Portfolio
       │                 │                 │
    suggest           explain           predict
    create            summarize         identify
    optimize          review            recommend
```

AI operates against the canonical project/task/governance model.

AI uses the same authorization and domain command boundaries as human
users.

Preferred action pattern:

``` text
AI Recommendation
       ↓
User Approval
       ↓
Canonical Command
       ↓
Authorization
       ↓
Domain Change
```

AI must not bypass domain validation, project scope, capability checks,
object-state rules or audit requirements.

The strategic opportunity is not generic AI chat. It is:

> **AI that understands enterprise IT project delivery semantics.**

That includes WBS, dependencies, critical path, schedule, ownership,
execution updates, RAID, decisions, milestones, project health and
portfolio context.

## 15. Frontend Authorization

The frontend must not independently reconstruct authorization from role
names.

Preferred model:

``` text
Backend
   ↓
Effective capability resolution
   ↓
Capability manifest / shared authorization result
   ↓
Frontend
   ↓
Show / hide / enable actions
```

Backend authorization remains authoritative.

The UI should avoid presenting actions that are predictably
unauthorized.

## 16. Security Invariants

1.  View permission does not imply edit permission.
2.  Project membership does not automatically imply management
    authority.
3.  Global role does not automatically imply project-wide mutation
    authority.
4.  Task assignment does not automatically imply project authority.
5.  AI must not bypass authorization.
6.  Cross-project operations must authorize both source and target
    scope.
7.  External users must receive explicit projections.
8.  Permission changes must take effect predictably for future
    authorization decisions.
9.  Session/refresh mechanisms must not silently become authorization
    mechanisms.
10. Frontend capability checks must not weaken backend policy.

## 17. Product Simplification Rules

Before adding a feature, ask:

### Can it be a view?

If yes, do not create a workspace.

### Can it be a capability?

If yes, do not create a domain object.

### Can it be a command?

If yes, do not create a parallel workflow.

### Can it operate on an existing Task or Project?

If yes, do not create another task/project concept.

### Can AI perform it contextually?

If yes, do not create an AI-only workflow unless the workflow itself is
a genuine management activity.

### Does it require a new entity?

Only create one when a concrete business journey requires independent
identity, lifecycle, ownership, authorization or reporting.

## 18. Product Mental Model

A new user should understand the platform as:

> **Home tells me what needs my attention.**

> **Projects tells me what is happening in each project.**

> **Planning lets me design and manage the plan.**

> **Delivery lets the team execute the plan.**

> **Govern manages risks, issues and decisions.**

> **Portfolio lets leaders manage across projects.**

> **Intelligence tells leadership what needs attention.**

> **Administration manages the platform.**

Users should not need to understand internal distinctions such as Today
versus My Tasks, Planning Task versus Delivery Task, Daily Review versus
Delivery Review, or frontend versus backend authorization
implementation.

## 19. What Is Not Being Redesigned

The target model does not require unnecessary redesign of the strongest
existing domain foundations:

-   Task entity
-   Task/sub-task hierarchy semantics
-   Summary behaviour
-   Milestone semantics
-   direct dependency semantics
-   project membership concept
-   project role concept
-   existing scheduling model

The target is primarily a convergence and simplification model.

## 20. Locked Product Decisions

  -----------------------------------------------------------------------
  Decision                            Target
  ----------------------------------- -----------------------------------
  Global navigation                   Home, Portfolio, Projects,
                                      Planning, Resources, Intelligence,
                                      Administration

  Personal work                       Home → My Work

  Today                               Focus mode within My Work and
                                      project Delivery

  My Tasks                            Consolidated into My Work

  Daily Review                        Project → Delivery → Review

  Project execution                   Delivery is canonical

  Project planning                    Planning is canonical

  Task model                          One canonical Task

  Task commands                       One canonical application command
                                      boundary

  Quick-create                        Allowed contextually from
                                      Delivery/My Work/Today

  Advanced authoring                  Planning

  Authorization                       Capability + scope + context

  Project authority                   Explicit project scope

  External access                     Explicit external projection

  Portfolio                           Valid product concept

  Program                             Deferred

  Organisation/multi-tenancy          Deferred

  AI                                  Horizontal intelligence/action
                                      layer

  AI authorization                    Same authorization as humans

  New domain concepts                 Require proven business journey
  -----------------------------------------------------------------------

## 21. Architecture Principles

### P1 --- One object, many views

A Task is a Task everywhere.

### P2 --- Workspace follows user intent

Users should not need to understand the architecture to perform an
action.

### P3 --- Planning and execution are distinct

Planning designs the work; Delivery executes it.

### P4 --- Personal work is a view

My Work is not a second task system.

### P5 --- Review is a mode

Daily Review is not a separate product.

### P6 --- Role does not equal authority

Effective capability is contextual.

### P7 --- Visibility does not imply mutation

Seeing something never automatically grants edit rights.

### P8 --- Assignment is not management

Being assigned a task does not make someone a project manager.

### P9 --- Backend is authoritative

Frontend reflects server-resolved capabilities.

### P10 --- AI uses the same rules as humans

No AI bypass of domain or authorization.

### P11 --- Planning owns scheduling

No competing scheduling semantics in Delivery, Calendar or AI.

### P12 --- No new domain concept without a proven journey

Enterprise terminology alone is not sufficient justification.

### P13 --- Contextual actions are preferred over unnecessary navigation

If a user can safely perform an action where the need is discovered, do
not force navigation elsewhere.

### P14 --- Consolidate before extending

When a proposed feature overlaps an existing capability, simplify first.

## 22. Conformance Gate

Every future feature or significant change must answer:

1.  Which existing workspace owns this capability?
2.  Is this a new workspace or merely a view?
3.  Does it use the canonical Task/Project domain?
4.  Does it use the canonical command boundary?
5.  Does it use the canonical authorization model?
6.  Does it introduce a new role?
7.  Does it introduce a new domain entity?
8.  If yes, what concrete business journey requires it?
9.  Does it duplicate an existing capability?
10. Does AI need access to the same capability?
11. Does it create a new navigation concept?
12. Can an existing workflow be simplified instead?

If these questions cannot be answered cleanly, implementation should
stop and product/architecture review should occur first.

## 23. Implementation Governance

The platform follows an architecture-first, stage-gated workflow:

``` text
Target Model
     ↓
Repository Investigation
     ↓
Gap Analysis
     ↓
Architecture Decision
     ↓
Implementation Plan
     ↓
Codex Implementation
     ↓
Architecture Review
     ↓
Regression / Quality Gates
     ↓
Docker / Ubuntu Verification
     ↓
Single Feature Commit
```

No major feature should begin directly with coding.

## 24. Definition of Convergence

The platform is converging toward this model when:

-   duplicate task workflows are removed
-   Today/My Work use one personal work model
-   Daily Review is integrated into Delivery
-   task commands have one canonical application boundary
-   hierarchy and scheduling semantics are canonical
-   frontend authorization reflects backend authority
-   project scope is consistently enforced
-   external projections are explicit
-   AI uses canonical domain commands and authorization
-   navigation represents user jobs rather than implementation history
-   new concepts require explicit product justification

## 25. Final Statement

**TARGET PM PLATFORM MODEL V1 is the governing product and architecture
baseline for the next phase of the PM Platform.**

The objective is not to make the platform contain more functionality.

The objective is to make existing and future functionality feel like
**one coherent product**:

> **Less conceptual complexity. Stronger authorization. One canonical
> domain model. Contextual workflows. AI-assisted enterprise project
> delivery.**

Future product or engineering proposals that materially conflict with
this model require explicit product/architecture review before
implementation.
