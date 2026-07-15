# UX-ADR-001: Workspace-First Architecture

## Status

Accepted.

## Decision Metadata

| Field           | Value                                                                              |
| --------------- | ---------------------------------------------------------------------------------- |
| Decision type   | UX Architecture Decision Record                                                    |
| Initiative      | PM Platform Product UX Evolution                                                   |
| Decision scope  | Product hierarchy, workspaces, navigation, context, and workspace relationships    |
| Design inputs   | RP-001 Personas and Jobs-to-be-Done; RP-002 Modern Product Benchmark               |
| Applies to      | All future PM Platform screens, features, navigation, and cross-domain experiences |
| Supersedes      | No prior UX ADR                                                                    |
| Does not define | Screen layouts, components, visual styling, routes, APIs, or implementation code   |

## 1. Decision Summary

PM Platform will use a **workspace-first product architecture**.

A workspace is a durable product context organized around a coherent set of user outcomes, decisions, and workflows. It composes relevant domain capabilities without duplicating domain ownership. Users enter a workspace to make progress on a job—not to browse a backend module or entity catalog.

The top-level product hierarchy is:

```text
PM Platform
├── Home
├── Portfolio
├── Projects
├── Planning
├── Resources
├── Intelligence
└── Administration
```

This hierarchy establishes seven primary workspaces. Each workspace has an explicit purpose, primary personas, jobs, capabilities, entry points, exit points, context contract, and relationship to other workspaces.

Three navigation layers will be used consistently:

1. **Global navigation** selects the primary workspace and organization-wide utilities.
2. **Workspace navigation** selects a stable capability or view within the active workspace.
3. **Context navigation** moves among related objects and work while preserving the current execution context.

The product will preserve context deliberately. Current organization, portfolio, program, project, filters, date range, view, and user preferences will persist according to defined scope and precedence rules. Context must be visible, addressable, restorable, permission-aware, and removable by the user.

Workspaces are composition boundaries, not new domain ownership boundaries. Canonical entities remain owned by their engineering domains. A Resource remains one Resource whether viewed from Resources, Planning, a Project, or Intelligence. A Project remains one Project whether viewed in Portfolio, Projects, Planning, or Home.

## 2. Problem Statement

PM Platform spans project delivery, portfolio oversight, planning and scheduling, resource management, analytics, governance, collaboration, and AI assistance. A conventional module-first architecture would expose these capabilities as a list of entities or subsystems—for example Projects, Tasks, Risks, Resources, Calendars, Assignments, Reports, Users, and Permissions.

That model is technically recognizable but does not match how participants make progress:

- A Team Member needs to understand commitments, blockers, changes, and decisions in the current delivery context.
- A Project Manager needs to connect outcomes, plans, dependencies, resources, RAID, evidence, and stakeholder decisions.
- A Program Manager needs to understand cross-project consequence and resolve shared constraints.
- A Resource Manager needs to compare demand, capacity, availability, skills, assignments, and sustainable alternatives.
- An Executive needs concise, evidence-backed decisions and material change—not operational entity navigation.
- A System Administrator needs to govern access, configuration, integration, audit, and operational exceptions.
- The AI Assistant needs authorized context spanning multiple domains without becoming a separate source of truth.

Module navigation creates four structural problems.

### 2.1 Users must reconstruct workflows

A user moves among entity lists, remembers filters, recreates time scope, and mentally connects related records. The product exposes storage boundaries while transferring workflow integration to the user.

### 2.2 Context is lost during movement

Moving from a portfolio exception to a project, then to its plan, dependency, resource constraint, and evidence often resets scope. Loss of project, date range, filter, selection, or analytical question creates reorientation work and error risk.

### 2.3 Multiple persona views become duplicate products

If each persona receives separate pages and reports, the organization develops operational, managerial, and executive versions of the same truth. These copies drift and require manual reconciliation.

### 2.4 AI amplifies weak architecture

An AI assistant operating over disconnected modules must infer scope and relationships repeatedly. Without an explicit workspace and context model, answers can use the wrong project, time range, organization, permission scope, or semantic definition. Natural language does not remove the need for information architecture; it makes coherent context more important.

The architecture must therefore provide a stable product model that supports cross-domain workflows while preserving engineering ownership, authorization, audit, and canonical data.

## 3. Decision

### 3.1 Workspace definition

A product area qualifies as a primary workspace only when it meets all of the following conditions:

1. It supports a durable group of user jobs rather than one entity operation.
2. It has a recognizable working context that users return to over time.
3. It composes multiple capabilities or domain objects toward a coherent outcome.
4. It requires its own navigation, context, and history behavior.
5. It serves at least one primary persona without creating a persona-specific copy of canonical data.
6. Its boundaries remain meaningful as individual features evolve.

A feature does not automatically become a workspace. Tasks, risks, issues, skills, calendars, assignments, notifications, dashboards, reports, and AI conversations are capabilities or objects placed within appropriate workspaces.

### 3.2 Architectural rules

All future product work must follow these rules:

- Every user-facing capability has one primary workspace owner.
- A capability may be surfaced contextually in other workspaces without duplicating its canonical data or business rules.
- Workspaces compose application capabilities; they do not directly redefine domain ownership.
- Cross-workspace links preserve valid context and declare any context change.
- The same canonical object retains identity, permissions, lifecycle, and audit across workspaces.
- Workspace summaries are derived views, not parallel status records.
- Home is a personal orchestration workspace, not a second copy of every domain.
- Intelligence is an analysis and decision-support workspace, not the canonical owner of source data.
- The AI Assistant is available within workspaces and through global invocation, but its actions resolve through the owning workspace and domain boundary.
- Administration governs platform configuration and access; it does not own business decisions merely because it can technically configure them.
- New primary workspaces require a UX ADR. New workspace capabilities require review against this ADR and the future Information Architecture Blueprint.

### 3.3 Workspace anatomy

Every workspace implementation must provide:

```text
Workspace
├── Identity
│   ├── name
│   ├── purpose
│   └── owning product capability
├── Context
│   ├── organization scope
│   ├── optional portfolio/program/project scope
│   ├── date and filter scope
│   └── current view
├── Work
│   ├── current state
│   ├── material changes
│   ├── decisions and exceptions
│   └── available actions
├── Navigation
│   ├── stable workspace destinations
│   ├── related-context paths
│   └── return history
└── Governance
    ├── effective permissions
    ├── source ownership
    ├── audit behavior
    └── AI authority boundaries
```

This is a conceptual contract, not a prescribed screen layout.

## 4. Product Hierarchy

### 4.1 Primary hierarchy

```text
PM Platform
│
├── Home
│   ├── My Work
│   ├── Decisions & Approvals
│   ├── Changes & Attention
│   └── Recent & Saved Contexts
│
├── Portfolio
│   ├── Portfolios
│   ├── Programs
│   ├── Outcomes & Initiatives
│   ├── Cross-Project Dependencies
│   └── Portfolio Decisions & Exposure
│
├── Projects
│   ├── Project Directory
│   ├── Project Workspace
│   ├── Delivery & Commitments
│   ├── RAID & Decisions
│   └── Collaboration & Evidence
│
├── Planning
│   ├── Plans & Scenarios
│   ├── Schedule & Dependencies
│   ├── Baselines & Forecasts
│   ├── Milestones & Constraints
│   └── Planning Decisions
│
├── Resources
│   ├── Resource Directory
│   ├── Capacity & Availability
│   ├── Assignments
│   ├── Skills & Capability
│   └── Resource Scenarios
│
├── Intelligence
│   ├── Decision Briefs
│   ├── Insights & Exceptions
│   ├── Analysis & Exploration
│   ├── Reports & Governed Metrics
│   └── AI Work & Participation History
│
└── Administration
    ├── Organization & Identity
    ├── Roles & Permissions
    ├── Configuration & Policies
    ├── Integrations & Automation
    ├── Audit & Compliance
    └── Platform Health & Data Governance
```

The children in this hierarchy are capability groupings for information architecture. They are not final navigation labels or commitments to separate screens.

### 4.2 Hierarchy rules

- The seven primary workspaces are stable top-level concepts.
- Workspace capability groupings may evolve without changing the primary hierarchy.
- Objects may appear in multiple workspace contexts, but each object has one canonical domain owner and one canonical identity.
- Portfolio contains portfolio and program coordination. A separate Program workspace is not introduced because program work shares the same cross-project outcome and governance context.
- Planning is separate from Projects because schedule modeling, scenarios, baselines, and forecast consequences form a specialized durable job with distinct context and controls.
- Resources is separate from Planning because capability, availability, skills, calendars, assignments, and privacy have a durable organizational lifecycle beyond any single plan.
- Intelligence is separate as a place for cross-context analysis and governed briefs, while intelligence capabilities remain available inside other workspaces.
- Administration is restricted by effective permission and may be absent from global navigation for unauthorized users.

## 5. Workspace Definitions

### 5.1 Home Workspace

**Purpose.** Help the current user re-enter work, understand what requires attention, and move to the correct execution context with minimal reconstruction.

**Primary personas.** All authenticated personas. Content and emphasis vary by responsibility and permission, not by creating separate Home products.

**Primary jobs.** Resume current work; identify direct commitments; review decisions or approvals; understand material changes; reach recently used or saved contexts.

**Key capabilities.** Personal work queue; decision and approval queue; causal change digest; saved and recent contexts; delegated or watched work; time-sensitive attention; personal preferences. Home may summarize canonical work but must not create separate task, risk, decision, or status records.

**Entry points.** Post-authentication default; global Home destination; session restore fallback; notification or digest links; cross-device continuation.

**Exit points.** Contextual deep links into Portfolio, Projects, Planning, Resources, Intelligence, or Administration. Exit carries the object, scope, and initiating question where valid.

**Boundary.** Home is not a customizable tile marketplace, generic reporting surface, or comprehensive substitute for specialist workspaces.

### 5.2 Portfolio Workspace

**Purpose.** Coordinate outcomes, investments, programs, projects, shared dependencies, and systemic exposure across a portfolio.

**Primary personas.** Program Manager, Executive, Project Manager, Portfolio or PMO roles where configured.

**Primary jobs.** Assess portfolio health and confidence; coordinate interdependent projects; identify concentration and contagion; prepare and close portfolio-level decisions; connect strategic outcomes to delivery evidence.

**Key capabilities.** Portfolio and program scope; outcome and initiative relationships; cross-project dependencies; aggregate milestones; shared risks and constraints; portfolio decisions; investment and benefit evidence where authorized; comparative views; material-change briefs.

**Entry points.** Global navigation; Home exception or decision; saved portfolio context; executive brief; project escalation; cross-project dependency link.

**Exit points.** Project Workspace for source evidence; Planning for schedule or scenario detail; Resources for capability conflict; Intelligence for deeper analysis; Administration only for policy or access issues.

**Boundary.** Portfolio does not own project execution records, resource master data, or analytical metric definitions. It composes them at portfolio resolution.

### 5.3 Projects Workspace

**Purpose.** Provide the primary execution context for delivering a project outcome from shared intent through commitments, evidence, decisions, and learning.

**Primary personas.** Project Manager, Engineer or Team Member, Program Manager, Technical Manager, stakeholders with project access.

**Primary jobs.** Understand project intent and current state; coordinate delivery; manage commitments, RAID, dependencies, evidence, and decisions; collaborate without losing project context; communicate credible progress.

**Key capabilities.** Project directory; project identity and outcomes; delivery work; milestones; RAID; decisions; assignments in project context; evidence and collaboration; project-level change history; status and confidence derived from governed sources.

**Entry points.** Global Projects navigation; Home commitment; Portfolio project selection; search or command; direct project link; notification; Planning or Resource relationship.

**Exit points.** Planning for detailed plan manipulation; Resources for resource profile, capacity, or assignment negotiation; Portfolio for escalation and program context; Intelligence for analysis or briefing; Home for personal prioritization.

**Boundary.** Projects does not duplicate the Planning engine, Resource aggregate, enterprise metrics, or administrative configuration. It presents those capabilities in project context through approved boundaries.

### 5.4 Planning Workspace

**Purpose.** Build, compare, govern, and maintain credible plans, schedules, scenarios, baselines, forecasts, constraints, and dependencies.

**Primary personas.** Project Manager, Program Manager, Planner or Scheduler roles, Technical Manager where planning authority exists.

**Primary jobs.** Construct a feasible plan; understand dependency consequences; compare scenarios; establish or change a baseline through approval; maintain forecast credibility; expose assumptions and constraints.

**Key capabilities.** Plan and scenario selection; work decomposition; timeline and dependency views; milestones and constraints; baseline versus current forecast; critical-path and schedule analysis where supported; change impact; planning decisions and approvals; resource demand in planning context.

**Entry points.** Global Planning navigation; Project plan link; Portfolio cross-project schedule; Resource demand or conflict; Intelligence scenario recommendation; saved planning context.

**Exit points.** Projects for execution evidence or RAID; Resources for capacity and assignment negotiation; Portfolio for cross-project consequence; Intelligence for analysis; approval context for baseline or material plan change.

**Boundary.** Planning owns planning experience but must respect existing Planning and Scheduling engineering boundaries. It cannot silently mutate baselines, commitments, assignments, or schedules through AI or cross-workspace actions.

### 5.5 Resources Workspace

**Purpose.** Govern organizational resources, capability, capacity, availability, skills, calendars, and assignments so demand can be met sustainably.

**Primary personas.** Technical or Resource Manager, Project Manager, Program Manager, authorized Team Member, Administrator for configuration-only responsibilities.

**Primary jobs.** Find appropriate capability; understand capacity and availability; maintain accurate resource profiles; negotiate assignments; resolve overload; plan capability development; identify continuity and concentration risk.

**Key capabilities.** Resource directory and profiles; resource types and lifecycle; capacity policies; availability overrides; skills and competency; calendar assignment; project and task assignments; demand comparison; overload explanation; non-destructive staffing scenarios; privacy-aware cost or personal information where approved.

**Entry points.** Global Resources navigation; Project assignment context; Planning demand or conflict; Portfolio capacity exposure; Home request; search; Intelligence recommendation.

**Exit points.** Projects for commitment context; Planning for demand and timing; Portfolio for systemic resource trade-off; Intelligence for scenario analysis; Administration for permissions or policy—not normal resource decisions.

**Boundary.** Resources owns the Resource experience and composes Calendar lookup and assignment through approved architecture. It must not reduce people to utilization, expose sensitive data without purpose, or let AI autonomously make staffing or employment decisions.

### 5.6 Intelligence Workspace

**Purpose.** Turn governed data and evidence into explainable analysis, exceptions, forecasts, scenarios, and decision briefs across authorized contexts.

**Primary personas.** Executive, Program Manager, Project Manager, Resource Manager, Administrator, and Team Member for permitted personal or project analysis.

**Primary jobs.** Investigate a question; understand material change; compare outcomes; inspect evidence; prepare a decision; receive and review AI-assisted analysis; monitor governed indicators.

**Key capabilities.** Decision briefs; insights and exceptions; cross-workspace analysis; governed metrics and definitions; reports; trends; confidence and data freshness; conversational exploration; saved analyses; AI plans and results; AI participation history.

**Entry points.** Global Intelligence navigation; contextual “analyze” action; executive or scheduled brief; Home change digest; workspace exception; natural-language query; saved analysis.

**Exit points.** Source object in Portfolio, Projects, Planning, Resources, or Administration; decision or approval context; proposed action preview. Source scope and analytical question must be preserved.

**Boundary.** Intelligence never becomes a parallel system of record. AI output must distinguish fact, derived measure, inference, forecast, recommendation, proposed action, and completed action. State-changing actions resolve through the owning workspace, permissions, and domain service.

### 5.7 Administration Workspace

**Purpose.** Govern the organization’s platform identity, access, configuration, integrations, policies, audit, data stewardship, and operational exceptions.

**Primary personas.** System Administrator, Security or Compliance roles, authorized data stewards, limited business owners for explicitly delegated approvals.

**Primary jobs.** Provision legitimate access; enforce least privilege; configure governed behavior; inspect audit and policy impact; manage integrations and automation; diagnose operational issues; preserve compliance and recoverability.

**Key capabilities.** Organization configuration; identity lifecycle; roles and permissions; permission explanation; policy; integration and automation administration; audit and compliance; data quality and stewardship; AI governance; platform health and usage controls.

**Entry points.** Permission-gated global navigation; administrative alert; access or configuration request; audit link; integration failure; policy exception; command or search for authorized users.

**Exit points.** Return to the originating business context; affected user, object, integration, or audit event; Intelligence for authorized operational analysis.

**Boundary.** Technical administration does not confer authority to approve project, portfolio, staffing, financial, or risk decisions. Business approval and administrative execution remain distinct and auditable.

## 6. Navigation Model

### 6.1 Navigation architecture

```text
Global navigation
  selects a workspace
        ↓
Workspace navigation
  selects a capability or stable view
        ↓
Context navigation
  follows the active scope and related work
        ↓
Object/action context
  inspects, decides, or acts without losing place
```

The layers are semantic. This ADR does not prescribe their physical placement.

### 6.2 Global navigation

Global navigation provides stable access to:

- Home;
- Portfolio;
- Projects;
- Planning;
- Resources;
- Intelligence;
- Administration when authorized;
- global search and command invocation;
- current organization selection where multi-organization access exists;
- notifications, decisions, and approvals as global utilities;
- user account, accessibility, and preference controls.

Rules:

- The primary workspace set and ordering are stable across ordinary use.
- Unauthorized workspaces are absent or clearly unavailable; they must not expose names, counts, or data.
- Global navigation does not list every entity type or feature.
- Switching workspace retains compatible context and explicitly drops incompatible context.
- Global search and commands inherit current context by default and display their active scope.
- AI invocation is globally available only when authorized, but must declare which workspace and data scope it is using.

### 6.3 Workspace navigation

Workspace navigation provides stable access to the active workspace’s capability groupings, saved views, and working contexts.

Rules:

- Destinations reflect user jobs, not database tables.
- Workspace navigation may adapt by permission and responsibility but must not reorder unpredictably based on inferred behavior.
- Counts and badges represent actionable exceptions, not general activity.
- Saved views preserve an explicit context package and can be personal or shared according to permission.
- A workspace destination cannot create a different lifecycle or semantic meaning for a shared object.
- The active workspace and active destination must always be determinable programmatically and by assistive technology.

### 6.4 Context navigation

Context navigation connects the current object or question to related context. It includes parent/child relationships, dependencies, assignments, evidence, decisions, source links, breadcrumbs where appropriate, and return history.

Examples:

```text
Portfolio exception
  -> affected Program
    -> affected Project
      -> milestone
        -> dependency
          -> Resource constraint
```

```text
Home approval
  -> proposed baseline change
    -> scenario comparison
      -> affected commitments
        -> approval decision
```

Rules:

- Relationship paths are preferred over arbitrary container depth.
- Cross-workspace movement carries the initiating question or relationship.
- Back navigation restores the prior workspace, view, filter, date range, selection, and position where feasible.
- Opening a source from Intelligence preserves the analysis scope and provides a return path.
- Context navigation cannot bypass authorization or state-transition rules.
- Links must resolve safely when the referenced object is deleted, archived, moved, or no longer authorized.

### 6.5 Direct links, search, commands, and notifications

Direct links, search results, commands, and notifications are first-class entry paths. They must resolve through the same workspace and context contracts as browse navigation.

A valid entry payload contains, where relevant:

```text
organization
workspace
canonical object identifier
relationship or initiating question
portfolio/program/project scope
date range
view
filters
return context
```

Optional context must never override current authorization, expose sensitive values in unsafe URLs, or silently apply stale filters.

## 7. Context Model

### 7.1 Context package

The persistent product context is modeled conceptually as:

```text
ProductContext
├── organization
├── portfolio?
├── program?
├── project?
├── filters
├── dateRange?
├── view
├── selection?
├── initiatingQuestion?
├── returnContext?
└── userPreferences
```

The question mark indicates optional context. This is an experience contract, not an implementation schema.

### 7.2 Context dimensions

| Context              | Purpose                                                                      | Persistence scope                                                                        | Change behavior                                                                                           |
| -------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Current organization | Establish security, data, policy, and configuration boundary                 | Across workspaces and sessions until changed                                             | Clears all incompatible subordinate context and requires reauthorization                                  |
| Portfolio            | Scope cross-project outcomes and analysis                                    | Across Portfolio and compatible Intelligence contexts; optionally into project selection | Preserved when the selected Project belongs to the Portfolio; otherwise explicitly replaced               |
| Program              | Scope coordinated projects and dependencies                                  | Across Portfolio, compatible Projects, Planning, and Intelligence contexts               | Preserved only when relationships remain valid                                                            |
| Project              | Establish primary delivery context                                           | Across Projects, Planning, Resources, Intelligence, and Home links                       | Preserved when the target supports project scope; otherwise retained as return context or visibly removed |
| Filters              | Narrow the current view                                                      | Per saved view or per workspace session                                                  | Preserved within compatible views; invalid filters are reported and removed explicitly                    |
| Date range           | Establish analytical and planning horizon                                    | Per workspace context, optionally shared by linked transitions                           | Preserved where semantics match; converted only with visible rules                                        |
| View                 | Select representation of the same canonical state                            | Per workspace destination and user                                                       | Restored on return; shared views use governed definitions                                                 |
| User preferences     | Accessibility, density, notification, locale, and personal workflow settings | User and organization policy scope                                                       | Follow user across sessions; organization policy may constrain but must explain overrides                 |

### 7.3 Context precedence

When multiple sources provide context, precedence is:

1. Explicit context selected or confirmed by the user.
2. Context encoded in a trusted direct link or approved workflow transition.
3. Current active workspace context.
4. Restored recent context.
5. User default.
6. Organization default.

AI inference is not an implicit precedence level. AI may propose a context, but the proposed scope must be visible and confirmed when ambiguity or consequence is material.

### 7.4 Persistence rules

- Organization context is never inferred across security boundaries.
- Portfolio, program, and project context must be relationship-valid.
- Context is preserved only when its meaning is compatible with the destination.
- A context change that materially alters displayed data must be visible.
- Filters and date ranges must be inspectable and removable.
- Saved views store their context definition, owner, sharing scope, and version behavior.
- Personal preferences cannot change shared domain semantics.
- Context restored after a permission change must be re-evaluated before data is loaded.
- Sensitive context must not be exposed through analytics, logs, notifications, or link previews beyond authorization.
- Context history supports return and continuity but is not itself a business audit record.

### 7.5 Default-context behavior

On entry, the product selects the narrowest safe and useful context available. It must not select a project, portfolio, or organization merely because it was recently accessed if access has changed or the entry link specifies another valid scope.

When context is incomplete, the product should:

1. perform the job at the valid broader scope when possible;
2. ask for the smallest missing decision;
3. explain why narrower context is required; and
4. avoid showing an arbitrary default that could be mistaken for complete data.

## 8. Workspace Relationships

### 8.1 Relationship map

```text
                             ┌────────────────┐
                             │ Administration │
                             │ policy & trust │
                             └───────┬────────┘
                                     │ governs
                                     ▼
┌────────┐     directs      ┌───────────────┐      executes      ┌──────────┐
│  Home  │ ───────────────► │   Projects    │ ◄───────────────► │ Planning │
│ orient │                  │ delivery core │    plan/evidence   │ model    │
└───┬────┘                  └───────┬───────┘                   └────┬─────┘
    │                               │ assignment/context             │ demand
    │                               ▼                                ▼
    │                         ┌────────────────────────────────────────┐
    │                         │               Resources                │
    │                         │ capability, capacity, and assignments  │
    │                         └──────────────────┬─────────────────────┘
    │                                            │ aggregate evidence
    ▼                                            ▼
┌───────────┐     coordinates       ┌──────────────────┐
│ Portfolio │ ◄───────────────────► │   Intelligence   │
│ outcomes  │   analysis/decisions  │ insight & briefs │
└─────┬─────┘                       └─────────┬────────┘
      └──────────── source and consequence ──┘
```

The diagram expresses product relationships, not technical dependencies.

### 8.2 Relationship principles

**Home orchestrates; it does not own.** Home points to work, decisions, and change in the owning workspace.

**Portfolio aggregates and coordinates.** It uses Project, Planning, Resource, and Intelligence evidence without creating alternative source records.

**Projects is the delivery center.** It connects intent, execution, RAID, decisions, collaboration, and evidence. Specialist plan manipulation remains in Planning; organizational capability remains in Resources.

**Planning models future and consequence.** It receives project intent and resource demand, then returns scenarios, baselines, forecasts, constraints, and approved changes.

**Resources governs capability across demand.** It connects organizational resource truth to projects and plans while retaining privacy and sustainable-allocation controls.

**Intelligence reads broadly and writes narrowly.** It analyzes authorized canonical information across workspaces. Proposed changes must return to the owning workspace for permission, validation, approval, and persistence.

**Administration governs boundaries.** It establishes identity, permission, configuration, integration, and AI policy. It does not substitute for business ownership.

### 8.3 Cross-workspace action contract

Every cross-workspace action must declare:

- source workspace and context;
- destination workspace and capability owner;
- canonical object identities involved;
- context carried, transformed, or dropped;
- effective permission and required approval;
- whether the action is read, draft, propose, approve, or execute;
- persistence and audit owner;
- success return path; and
- partial-failure or cancellation behavior.

This prevents a contextual shortcut from becoming an architectural shortcut.

### 8.4 AI relationship to workspaces

The AI Assistant has two invocation modes:

1. **Contextual invocation:** assistance inherits the visible active workspace context and declares additional sources before use.
2. **Global invocation:** assistance begins with no assumed business scope beyond organization and user authorization, then establishes or asks for the necessary context.

AI may retrieve and synthesize across workspaces when authorized. It may not:

- create a shadow workspace;
- bypass workspace or domain validation;
- treat conversational context as approved business context;
- persist a consequential change outside its owning workflow;
- silently change organization, portfolio, program, project, date, or filter scope; or
- present an inference as canonical state.

## 9. Decision Rationale

Workspace-first architecture was selected because it aligns the product with durable user jobs and cross-domain execution flows while retaining canonical engineering ownership.

### 9.1 Comparison with module/entity navigation

| Criterion                    | Workspace-first                                               | Module/entity-first                                  |
| ---------------------------- | ------------------------------------------------------------- | ---------------------------------------------------- |
| Primary organizing principle | User outcome and workflow                                     | Stored object or subsystem                           |
| Cross-domain work            | Composed within a coherent context                            | Reconstructed through navigation                     |
| Context preservation         | Explicit architectural contract                               | Usually local to each module                         |
| Persona adaptation           | Different resolution over shared truth                        | Separate dashboards or pages often proliferate       |
| AI grounding                 | Workspace provides bounded purpose and scope                  | AI must infer relationships among modules            |
| Domain ownership             | Preserved beneath composition layer                           | Visible but transferred to user mental model         |
| Navigation growth            | Stable workspaces with evolving capabilities                  | Top-level navigation grows with every entity         |
| Decision support             | Evidence, options, authority, and action can remain connected | Decisions are distributed across records and reports |
| Implementation pressure      | Requires cross-domain application composition                 | Encourages isolated vertical pages                   |
| Main risk                    | Workspace boundaries can become broad                         | Product becomes fragmented and administration-led    |

### 9.2 Why not persona-first architecture

Separate Engineer, Project Manager, Executive, and Administrator products would optimize local needs but fragment truth, terminology, and workflow. Personas influence defaults, resolution, permissions, and attention—not canonical product structure.

### 9.3 Why not project-only architecture

Project context is central but insufficient. Portfolio, organizational resources, administration, and cross-project intelligence have valid lifecycles outside one Project. Making Project the universal container would duplicate organizational truth and weaken cross-project decisions.

### 9.4 Why not AI-first navigation

Natural language is a powerful access method but not a complete architecture. Users need predictable browse paths, stable object identity, accessible deterministic controls, shared locations, reviewable state, and recovery when AI is unavailable or wrong. AI is a navigation and action participant operating over the workspace architecture.

### 9.5 Why seven workspaces

The selected set is the smallest stable hierarchy that covers personal orchestration, strategic coordination, project execution, deterministic planning, organizational capability, cross-context intelligence, and platform governance without collapsing distinct jobs or promoting every domain entity to top level.

## 10. Consequences

### 10.1 Positive consequences

- Users navigate by intended progress rather than backend structure.
- Cross-domain workflows can retain context, question, and return path.
- One canonical object can support multiple personas and views.
- Product navigation remains stable as capabilities grow.
- Home can reduce re-entry and attention cost without becoming a duplicate system.
- Planning and Resources retain specialist depth without dominating ordinary project work.
- Portfolio and Intelligence can aggregate while preserving source traceability.
- AI receives an explicit purpose, scope, and authority context.
- Authorization and audit can be evaluated consistently at workspace transitions.
- Information Architecture Blueprint work begins from approved durable boundaries.

### 10.2 Negative consequences

- Cross-domain workspace composition is more demanding than isolated entity pages.
- Product teams must agree which workspace primarily owns each capability.
- Context persistence, direct links, return history, and scope conversion require platform-level engineering.
- Users may initially disagree about where a capability belongs when it appears in several workflows.
- Broad workspaces can accumulate too many capabilities if governance is weak.
- Analytics and AI must preserve provenance across multiple domain sources.
- Testing must cover transitions and context restoration, not only individual pages.

### 10.3 Trade-offs

**Stability over unlimited customization.** Organizations may personalize views and saved contexts, but cannot replace the primary workspace hierarchy casually.

**Composition over duplication.** Cross-workspace experiences may require application-layer orchestration. This cost is accepted to prevent parallel truths and logic.

**Context continuity over route simplicity.** Links and history need richer context handling. This cost is accepted because reorientation is a core enterprise productivity problem.

**Specialist depth with shared semantics.** Planning, Resources, Intelligence, and Administration keep specialized behavior while sharing identity and relationships with Projects and Portfolio.

**Predictable architecture over pure AI mediation.** Deterministic navigation remains required even as AI becomes a major access and action method.

### 10.4 Required governance

The following review questions become mandatory for future UX architecture and feature work:

1. Which primary workspace owns the capability?
2. Which other workspaces surface it contextually?
3. What canonical objects and domain owners are involved?
4. What context is required, preserved, transformed, or dropped?
5. What are the entry, exit, return, and failure paths?
6. How are permissions and sensitive data enforced?
7. Does the experience create a duplicate status, metric, or lifecycle?
8. How does AI read, propose, or act within this boundary?
9. Can the complete workflow be navigated accessibly and deterministically?
10. What cross-workspace and context-restoration tests are required?

## 11. Future Considerations

The following decisions are intentionally deferred and require subsequent UX architecture work:

- The Information Architecture Blueprint, including canonical naming and workspace capability maps.
- Route, URL, deep-link, and context-serialization contracts.
- Global search, command taxonomy, and result behavior.
- Home prioritization, attention, digest, and notification architecture.
- Project Workspace internal architecture.
- Planning Workspace scenario, baseline, and change-governance architecture.
- Resource Workspace privacy, capacity, staffing scenario, and negotiation architecture.
- Portfolio and Program information architecture.
- Intelligence semantic model, confidence model, decision brief, and report governance.
- AI identity, memory, source, authority tier, approval, audit, and participation-ledger architecture.
- Administration information architecture and separation of business versus technical authority.
- Mobile continuity and offline behavior.
- Accessibility, performance, and context-restoration quality budgets.
- Multi-organization behavior and organization-switch safeguards.
- Shared versus personal saved views and context packages.
- External guest, partner, customer, and restricted stakeholder workspace behavior.

A new primary workspace, removal of an approved workspace, or material redefinition of a workspace purpose requires a superseding UX ADR. Capability-level evolution within the approved boundaries may proceed through the Information Architecture Blueprint and feature-specific UX decisions.

## 12. Approval Recommendation

**Recommendation: ACCEPT UX-ADR-001.**

Approval establishes Workspace-First Architecture as the mandatory foundation for the PM Platform Information Architecture Blueprint and all future UX architecture work.

Approval means:

- the seven primary workspaces are the approved top-level product architecture;
- future capabilities must declare a primary workspace owner;
- global, workspace, and context navigation are separate required layers;
- organization, portfolio, program, project, filters, date range, view, and preferences follow the context contract;
- cross-workspace experiences preserve canonical identity and domain ownership;
- Intelligence and AI may analyze broadly but must route consequential actions through the owning workspace; and
- new screens and features must demonstrate compliance with this ADR.

Approval does not freeze navigation labels, screen layout, visual design, component design, routing technology, or implementation sequencing. Those decisions belong to the Information Architecture Blueprint and subsequent UX architecture records.

## References

- [RP-001: Personas and Jobs-to-be-Done](../research/RP-001_PERSONAS_AND_JOBS_TO_BE_DONE.md)
- [RP-002: Modern Product Benchmark](../research/RP-002_MODERN_PRODUCT_BENCHMARK.md)
