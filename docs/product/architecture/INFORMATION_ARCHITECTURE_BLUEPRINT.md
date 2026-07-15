# PM Platform Information Architecture Blueprint

## Status

Proposed for approval.

## Document Control

| Field               | Value                                                                                                            |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Initiative          | PM Platform Product UX Evolution                                                                                 |
| Document type       | Authoritative Information Architecture Blueprint                                                                 |
| Inputs              | RP-001 Personas and Jobs-to-be-Done; RP-002 Modern Product Benchmark; UX-ADR-001 Workspace-First Architecture    |
| Applies to          | All future pages, routes, navigation, search, commands, notifications, links, and responsive navigation behavior |
| Target architecture | Next.js App Router-compatible, technology-independent at the information architecture level                      |
| Excludes            | UI mockups, component design, visual design, API design, and implementation code                                 |

## Blueprint Mandate

This blueprint translates the accepted Workspace-First Architecture into a complete information architecture for PM Platform. It defines where information belongs, how users move between contexts, which routes are canonical, how state is preserved, and how global services behave.

Every future page or navigable experience must declare:

1. its primary workspace;
2. its canonical route and object identity;
3. its parent capability in the workspace hierarchy;
4. its valid entry and exit paths;
5. its required and optional context;
6. its breadcrumb behavior;
7. its search and command exposure;
8. its notification and deep-link behavior;
9. its mobile navigation behavior; and
10. its authorization and context-restoration rules.

The blueprint is a navigation and information contract. It does not prescribe physical navigation components or screen layouts.

## 1. Product Hierarchy

### 1.1 Authoritative hierarchy

```text
PM Platform
│
├── Home
│   ├── My Work
│   ├── Decisions & Approvals
│   ├── Changes & Attention
│   ├── Recent Contexts
│   └── Saved Contexts
│
├── Portfolio
│   ├── Portfolio Directory
│   ├── Portfolio Workspace
│   │   ├── Overview
│   │   ├── Outcomes & Initiatives
│   │   ├── Programs & Projects
│   │   ├── Dependencies
│   │   ├── Exposure & Decisions
│   │   └── Evidence
│   └── Program Workspace
│       ├── Overview
│       ├── Outcomes
│       ├── Projects
│       ├── Dependencies
│       ├── Risks & Decisions
│       └── Evidence
│
├── Projects
│   ├── Project Directory
│   └── Project Workspace
│       ├── Overview
│       ├── Delivery
│       ├── Milestones
│       ├── RAID
│       ├── Decisions
│       ├── Team & Assignments
│       ├── Evidence & Documents
│       ├── Activity & Change
│       └── Project Settings
│
├── Planning
│   ├── Planning Directory
│   ├── Plans
│   ├── Scenarios
│   ├── Schedule & Dependencies
│   ├── Milestones & Constraints
│   ├── Baselines & Forecasts
│   ├── Resource Demand
│   └── Planning Decisions
│
├── Resources
│   ├── Resource Directory
│   ├── Resource Workspace
│   │   ├── Profile
│   │   ├── Assignments
│   │   ├── Capacity & Availability
│   │   ├── Skills & Capability
│   │   ├── Calendar
│   │   ├── Activity & Audit
│   │   └── Resource Settings
│   ├── Demand & Capacity
│   ├── Assignment Coordination
│   └── Resource Scenarios
│
├── Intelligence
│   ├── Decision Briefs
│   ├── Insights & Exceptions
│   ├── Analysis & Exploration
│   ├── Reports
│   ├── Metrics & Definitions
│   ├── Saved Analyses
│   └── AI Participation History
│
└── Administration
    ├── Organisation
    ├── Users & Identity
    ├── Roles & Permissions
    ├── Configuration & Policies
    ├── Integrations
    ├── Automation Governance
    ├── Audit & Compliance
    ├── Data Governance
    ├── AI Governance
    └── Platform Health
```

### 1.2 Hierarchy levels

| Level             | Definition                                    | Examples                                   | Navigation role                                |
| ----------------- | --------------------------------------------- | ------------------------------------------ | ---------------------------------------------- |
| Product           | Entire authorized PM Platform experience      | PM Platform                                | Establishes organization and user session      |
| Workspace         | Durable outcome-oriented product context      | Projects, Planning, Resources              | Global navigation destination                  |
| Capability group  | Stable job-oriented area inside a workspace   | RAID, Scenarios, Decision Briefs           | Workspace navigation destination               |
| Context workspace | A scoped instance of a workspace              | Project Alpha, Program North, Resource 247 | Context navigation anchor                      |
| Canonical object  | Governed domain or workflow object            | Project, Risk, Plan, Resource, Decision    | Addressable destination and relationship node  |
| View              | Representation of the same scoped information | Table, timeline, dependency view           | User-selectable, restorable state              |
| Action            | Permission-checked operation                  | Approve, assign, archive, compare          | Command or contextual operation, not hierarchy |

### 1.3 Placement rules

- A canonical object belongs to one domain and has one canonical detail destination.
- Contextual appearances in another workspace link to or embed a permission-safe summary of the canonical object.
- Actions do not become navigation destinations unless they create a durable review or approval context.
- Reports do not become top-level destinations merely because they are frequently used; they belong in Intelligence or the workspace whose decision they support.
- Settings remain contextual when they govern one Project or Resource; organization-wide policy belongs in Administration.
- Personal queues and recent contexts belong in Home even when their objects are owned elsewhere.
- AI conversations are not a parallel hierarchy. Durable AI analyses belong in Intelligence; source actions return to the owning workspace.

## 2. Global Navigation

### 2.1 Global destinations

The stable global workspace order is:

1. Home
2. Portfolio
3. Projects
4. Planning
5. Resources
6. Intelligence
7. Administration, when authorized

The order follows increasing organizational scope and specialization while keeping personal orientation first and governance last. It must not reorder itself based on usage prediction.

### 2.2 Global utilities

Global utilities are available independently of workspace navigation:

- organization switcher, when the user has access to more than one organization;
- global search;
- command palette;
- notifications and attention queue;
- decisions and approvals queue;
- help and product guidance;
- user account, preferences, accessibility, locale, and session controls;
- AI invocation when enabled and authorized.

Utilities do not compete with workspaces as primary destinations. A utility either returns the user to an owning workspace or preserves the current workspace context.

### 2.3 Visibility and authorization

- Global navigation is generated from effective permission, not persona labels alone.
- A workspace with no authorized content or action is omitted.
- Hidden destinations must not leak object names, counts, recent activity, or existence through search, commands, notifications, or URLs.
- A user with read-only access sees the same information architecture but only permitted actions.
- Administration appears only for users with at least one administrative capability.
- Permission changes take effect on the next authorization evaluation and invalidate cached navigation or restored context.

### 2.4 Global selection behavior

Selecting a workspace follows this precedence:

1. retain compatible active context;
2. restore the user’s latest valid context within that workspace;
3. use the workspace’s safe directory or overview;
4. never select an arbitrary object merely because it was recently popular.

Example: moving from Project Alpha to Planning should open Project Alpha’s plan context when one exists and the user is authorized. Moving from Project Alpha to Administration should not retain Project Alpha as active business scope, but may retain it as a return context if the transition originated from a permission or configuration issue.

## 3. Workspace Hierarchy

### 3.1 Home hierarchy

| Destination           | Information responsibility                             | Canonical source            |
| --------------------- | ------------------------------------------------------ | --------------------------- |
| My Work               | Personal commitments, delegated work, and watched work | Owning workspaces           |
| Decisions & Approvals | Items requiring the current user’s authorized decision | Owning decision workflow    |
| Changes & Attention   | Material changes, exceptions, and direct requests      | Event and decision sources  |
| Recent Contexts       | Valid contexts recently visited                        | Personal navigation history |
| Saved Contexts        | Personal or shared context packages                    | Saved-view service          |

Home is an orchestration workspace. It must not store alternate task status, risk state, or project summaries.

### 3.2 Portfolio hierarchy

Portfolio has three levels:

```text
Portfolio Directory
  -> Portfolio Workspace
       -> Program Workspace
            -> related Project Workspace
```

Portfolio and Program share the Portfolio workspace because both coordinate outcomes across multiple Projects. Portfolio context may contain Programs and Projects directly. Program context must identify its parent Portfolio when one exists, but a Program may remain addressable if organization policy allows Programs outside a formal Portfolio.

### 3.3 Projects hierarchy

```text
Project Directory
  -> Project Workspace
       -> capability group
            -> canonical object or filtered view
```

Project Workspace is the principal delivery context. Tasks, RAID, decisions, team assignments, evidence, and change are subordinate capabilities, not global product modules.

The existing routes for global tasks, risks, issues, and RAID are treated as legacy access paths. Their target architecture is a Project-scoped destination, a Home personal queue, or a Portfolio/Intelligence aggregate depending on the user job.

### 3.4 Planning hierarchy

```text
Planning Directory
  -> Project or Program Planning Context
       -> Plan
            ├── live plan
            ├── scenario branch
            ├── baseline
            └── forecast
```

Planning navigation distinguishes a live plan from scenarios and historical baselines. A scenario cannot be mistaken for committed state. Program planning composes Project plans without duplicating them.

### 3.5 Resources hierarchy

```text
Resource Directory
  -> Resource Workspace

Demand & Capacity
  -> organizational/team scope
       -> Resource or Project relationship

Resource Scenarios
  -> non-destructive scenario
       -> proposed assignments
```

The Resource Workspace is the canonical location for Resource profile, capacity, availability, skills, Calendar assignment, and Resource-centered assignments. Project-centered assignment intent remains visible in Projects and Planning.

### 3.6 Intelligence hierarchy

Intelligence is organized by analytical job, not data source:

```text
Question or exception
  -> Analysis
       -> Evidence
            -> Decision brief
                 -> source action in owning workspace
```

Reports and metrics remain available for repeatable governed consumption. A generated insight does not become canonical state until an authorized workflow records it in the owning workspace.

### 3.7 Administration hierarchy

Administration is organized by governance responsibility rather than technical subsystem. Organization, identity, permission, policy, integration, automation, audit, data, AI, and health destinations are separate because they have different authority, audit, and incident implications.

## 4. Navigation Hierarchy

### 4.1 Four navigation layers

```text
Layer 1: Product / Organization
  └── selects organization and global utilities

Layer 2: Workspace
  └── selects Home, Portfolio, Projects, Planning, Resources,
      Intelligence, or Administration

Layer 3: Capability / Context
  └── selects a workspace capability and scoped Portfolio,
      Program, Project, Plan, Resource, or Analysis

Layer 4: Object / Relationship
  └── selects a canonical object, view, related evidence,
      or authorized action context
```

The architecture does not allow an entity type to bypass Layer 2 and become a new global module without a superseding UX ADR.

### 4.2 Navigation invariants

- The active organization and workspace are always determinable.
- The active scoped context is always determinable when one is required.
- The user can return to the initiating context after cross-workspace exploration.
- The same object identifier resolves to one canonical owner and detail destination.
- Navigation never grants access; authorization is evaluated at resolution time.
- Switching views does not change canonical data or object identity.
- Navigation state may be personal, but shared semantics are not personalized.
- Back and forward history restore meaningful application context.

### 4.3 Direct versus contextual navigation

**Direct navigation** starts from global navigation, a canonical URL, search, a saved context, or a command. It establishes the destination context from the route and authorized defaults.

**Contextual navigation** starts from a related object, exception, decision, or analysis. It carries the initiating relationship, return location, and compatible filters or dates.

Both paths resolve to the same canonical destination. Contextual navigation may add a temporary relationship lens but cannot create a second version of the destination.

## 5. Primary User Journeys

### 5.1 Team Member resumes and completes work

```text
Home / My Work
  -> Project Workspace / Delivery
    -> commitment detail and evidence
      -> related decision or dependency
        -> update evidence or request decision
          -> return to My Work
```

Required preservation: organization, Project, selected commitment, return context, and any explicit date or personal-work filter. The journey must not require the user to navigate through a global Tasks module.

### 5.2 Project Manager responds to delivery variance

```text
Home / Changes & Attention
  -> Project Workspace / Overview
    -> affected milestone
      -> Planning / dependency and forecast impact
        -> Project / RAID or decision
          -> authorized action or escalation
```

Required preservation: Project, initiating exception, affected milestone, planning date range, and return to the decision or exception.

### 5.3 Program Manager resolves a cross-project dependency

```text
Portfolio / Program / Dependencies
  -> dependency relationship
    -> source Project evidence
    -> target Project evidence
      -> Planning / cross-project consequence
        -> Program decision
```

Required preservation: Portfolio, Program, dependency identity, both Projects, common time horizon, and decision context.

### 5.4 Resource Manager resolves overload

```text
Resources / Demand & Capacity
  -> overload exception
    -> Resource Workspace / assignments and availability
      -> affected Projects and plans
        -> Resource Scenario
          -> proposed changes
            -> accountable approvals in owning workspaces
```

Required preservation: organization or team scope, Resource, date range, contributing assignments, scenario identity, and privacy constraints.

### 5.5 Executive reviews a material portfolio decision

```text
Home / Decisions & Approvals
  -> Intelligence / Decision Brief
    -> Portfolio evidence
      -> Project or Planning source
        -> return to brief
          -> approve, reject, request change, or defer
```

Required preservation: decision identity, evidence scope, data freshness, return context, and approval authority. Reading the brief must not imply approval.

### 5.6 Administrator investigates an access problem

```text
Administration / Audit or Permissions
  -> user and effective-access explanation
    -> affected canonical object
      -> policy source
        -> preview proposed correction
          -> authorized change and audit record
```

Required preservation: organization, incident or request identity, user, object, effective permission path, and before/after state. Business approval remains separate from technical execution.

### 5.7 User asks AI to investigate a question

```text
Contextual or global AI invocation
  -> explicit scope confirmation
    -> Intelligence / Analysis
      -> cited evidence across authorized workspaces
        -> proposed decision or action
          -> owning workspace review
            -> authorized execution and AI participation record
```

Required preservation: user question, declared scope, sources, filters, date range, AI activity history, proposed action, and approval path. An AI response alone does not mutate shared state.

## 6. Cross-Workspace Navigation

### 6.1 Approved relationship paths

| Source        | Destination          | Primary reason                                                | Context carried                                         |
| ------------- | -------------------- | ------------------------------------------------------------- | ------------------------------------------------------- |
| Home          | Any owning workspace | Resume work or address attention                              | Canonical object, initiating queue item, return context |
| Portfolio     | Projects             | Inspect source delivery evidence                              | Portfolio, Program, Project, relationship               |
| Portfolio     | Planning             | Inspect cross-project timing or scenario                      | Portfolio, Program, Projects, date range                |
| Portfolio     | Resources            | Inspect shared capability constraint                          | Portfolio/Program, Resources, date range                |
| Projects      | Planning             | Model or inspect Project plan                                 | Project, selected milestone/work item, date range       |
| Projects      | Resources            | Inspect or negotiate assignment                               | Project, assignment/demand, Resource when known         |
| Planning      | Projects             | Inspect execution evidence, risk, or decision                 | Project, Plan, selected plan element                    |
| Planning      | Resources            | Inspect demand, capacity, or proposed assignment              | Project/Program, Plan, date range, demand               |
| Resources     | Projects             | Inspect assignment purpose and commitment                     | Resource, assignment, Project                           |
| Resources     | Planning             | Inspect demand timing or scenario impact                      | Resource/team, Plan, date range                         |
| Intelligence  | Any source workspace | Verify evidence or execute proposed action                    | analysis/brief, source identity, filters, date range    |
| Any workspace | Intelligence         | Analyze a question or exception                               | source workspace, canonical objects, question           |
| Any workspace | Administration       | Resolve access, policy, integration, or data-governance issue | source object, administrative reason, return context    |

### 6.2 Transition contract

Every cross-workspace transition must specify:

- destination workspace and canonical route;
- source and destination object identities;
- relationship that explains the transition;
- context fields retained, transformed, or discarded;
- authorization and sensitive-data re-evaluation;
- return behavior;
- behavior when the destination is unavailable, archived, deleted, or unauthorized.

### 6.3 Failure behavior

If a transition cannot complete:

1. retain the source context;
2. explain whether the cause is missing access, deleted content, invalid relationship, or unavailable capability without leaking protected information;
3. offer the nearest permitted destination or request path;
4. never fall back silently to an unrelated directory or default object.

## 7. Breadcrumb Strategy

### 7.1 Purpose

Breadcrumbs communicate the user’s current place and provide safe movement to meaningful parent contexts. They are not a full history trail and must not mirror arbitrary folder structures.

### 7.2 Breadcrumb grammar

The default grammar is:

```text
[Workspace] / [Scoped context] / [Capability] / [Canonical object]
```

Examples:

```text
Projects / Project Alpha / RAID / Risk R-104
Portfolio / Transformation Portfolio / Program North / Dependencies
Planning / Project Alpha / Live Plan / Milestone M-12
Resources / Resource Jane Doe / Capacity & Availability
Intelligence / Decision Briefs / DB-204
Administration / Roles & Permissions / Project Manager
```

Organization is omitted from the visible breadcrumb when it is already unambiguous in global context. It remains part of route resolution.

### 7.3 Relationship-aware breadcrumbs

When an object has multiple valid parents, breadcrumbs use the current navigation context rather than asserting one universal hierarchy. The canonical object identity remains unchanged.

Example: the same Resource reached from a Project assignment may show:

```text
Projects / Project Alpha / Team & Assignments / Resource Jane Doe
```

The Resource’s canonical destination remains Resources. The final transition clearly enters the Resource Workspace, and return context retains Project Alpha.

### 7.4 Rules

- Workspace is the first visible crumb.
- Breadcrumb items are permission-checked destinations.
- The current location is identified but is not required to be actionable.
- Breadcrumbs never expose inaccessible ancestors.
- Long object names may be represented accessibly without altering canonical identity.
- Filters, date ranges, views, tabs, and transient actions are not breadcrumb levels.
- Back navigation remains history-based; breadcrumbs navigate hierarchy and relationships.
- Mobile may present fewer visible levels but must preserve access to the full hierarchy and current context.

## 8. Search Architecture

### 8.1 Search responsibilities

Search must support four jobs:

1. **Find:** locate a known object, person, workspace, report, or document.
2. **Navigate:** move directly to a destination or recent context.
3. **Explore:** discover related authorized information by structured filters and relationships.
4. **Answer:** synthesize an evidence-backed response from authorized sources.

These jobs share one entry point but have distinct result behavior. A generated answer must not displace canonical search results or hide its sources.

### 8.2 Search scopes

| Scope             | Default behavior                                           | Examples                                    |
| ----------------- | ---------------------------------------------------------- | ------------------------------------------- |
| Current context   | Highest relevance when invoked inside scoped work          | Current Project, Plan, Resource, or Program |
| Current workspace | Searches authorized objects owned or composed by workspace | Projects, Resources, Intelligence           |
| Organization      | Broad authorized search across workspaces                  | All Projects and Resources                  |
| Explicit sources  | User-selected source set for complex analysis              | Projects + Planning + Resources             |

Search always displays active scope. Organization-wide scope is never assumed silently when the user is operating in a narrower sensitive context.

### 8.3 Searchable information classes

- workspaces and capability destinations;
- Portfolios, Programs, Projects, Plans, Resources, and users where permitted;
- delivery work, milestones, dependencies, RAID, decisions, assignments, skills, calendars, evidence, documents, reports, policies, and audit events where permitted;
- saved views, analyses, and decision briefs;
- commands and help entries;
- source-cited AI answers over authorized indexed content.

### 8.4 Result model

Every result must expose enough metadata to disambiguate safely:

- object type and canonical name;
- owning workspace;
- organization and scoped parent where needed;
- status or lifecycle state when relevant;
- relationship to current context;
- freshness or last meaningful change where relevant;
- reason for ranking when generated or inferred;
- access-safe snippet;
- canonical destination.

### 8.5 Retrieval model

Search combines:

- exact identifier lookup;
- lexical and phrase matching;
- structured filters;
- relationship traversal;
- recency and user-authorized relevance;
- semantic retrieval for natural-language intent.

Semantic retrieval cannot override authorization, canonical identity, or structured filters. Search results and AI answers must be evaluated against current permissions at request time.

### 8.6 Search URL behavior

Search result sets may be addressable when sharing is useful:

```text
/o/{orgKey}/search?q={query}&scope={scope}&type={type}
```

Sensitive, excessively long, or personal filters must use an opaque saved-search identifier rather than raw URL values:

```text
/o/{orgKey}/search/saved/{savedSearchId}
```

Search history is personal and must not become organization audit data unless a separate governed security requirement approves it.

## 9. Global Command Palette Architecture

### 9.1 Purpose

The command palette is a universal deterministic access layer for navigation and authorized actions. It complements browse navigation and AI; it does not replace either.

### 9.2 Command classes

```text
Navigate
  Open Project, switch workspace, return to recent context

Find
  Search object, person, decision, report, or command

Create
  Create an object through its owning workspace

Act
  Perform a permission-checked operation in current context

View
  Change view, date range, grouping, or valid filter

Collaborate
  Copy link, request decision, assign review, follow context

Analyze
  Open Intelligence with current question and context

Administer
  Open authorized policy, permission, integration, or audit action
```

### 9.3 Command anatomy

Each command definition requires:

- stable command name and identifier;
- owning workspace;
- description in user language;
- required context;
- effective permission;
- availability conditions;
- consequence class;
- whether preview, confirmation, or approval is required;
- keyboard shortcut eligibility;
- audit behavior;
- deterministic destination or action result.

### 9.4 Context and ranking

Commands relevant to the active workspace and selected object rank first. Recent use may influence ranking within the same relevance class but cannot hide stable commands or change command meaning. Users can search all authorized commands explicitly.

### 9.5 Command safety

- Navigation and view changes may execute immediately.
- Reversible low-consequence edits follow the owning workflow’s normal validation.
- Bulk, destructive, permission-changing, baseline-changing, staffing, financial, external-communication, and risk-acceptance commands require preview and applicable approval.
- Commands cannot bypass domain validation or create hidden side effects.
- Unavailable commands may explain missing context or permission without exposing protected data.
- AI may propose or compose commands, but the resulting deterministic action and scope must be reviewable before consequential execution.

## 10. Notification Architecture

### 10.1 Notification model

A notification is an attention contract, not a raw event. A source event creates a notification only when it passes the relevant policy for materiality, novelty, actionability, ownership, timing, and user preference.

```text
Source event
  -> authorization and sensitivity check
    -> policy evaluation
      -> causal grouping and deduplication
        -> urgency and delivery decision
          -> Home queue, digest, or interrupt
```

### 10.2 Notification classes

| Class                   | Meaning                                                             | Default delivery                                                |
| ----------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------- |
| Direct request          | A named person requests action, review, or input                    | Home attention; interrupt when time-sensitive                   |
| Decision or approval    | Authorized decision is ready or approaching deadline                | Decisions & Approvals; escalated by policy                      |
| Material exception      | Threshold crossing threatens outcome, safety, access, or compliance | Attention queue; interrupt by severity                          |
| Relationship change     | A dependency, assignment, or context changed materially             | Causal digest or attention queue                                |
| Informational change    | Relevant update with no immediate action                            | Scheduled digest                                                |
| Administrative incident | Security, integration, policy, migration, or platform issue         | Role-specific administrative alert                              |
| AI work status          | Requested AI work needs input, review, or has completed             | Originating context and AI history; interrupt only if requested |

### 10.3 Notification destination

Every notification resolves to a canonical destination or decision context in the owning workspace. It carries:

- reason the user received it;
- source and initiating actor or policy;
- material change or requested action;
- deadline or urgency when applicable;
- canonical object and owning workspace;
- grouping relationship;
- read, acknowledged, resolved, or dismissed state as appropriate.

Read state is not resolution. Dismissal does not complete an underlying obligation.

### 10.4 Delivery principles

- Interrupt only for direct, imminent, or materially consequential items.
- Group downstream events by cause when one change affects several objects.
- Do not notify a user about their own successful action unless confirmation is required.
- Respect quiet hours, device preferences, delegation, leave, and role-specific policy.
- Do not expose sensitive content in email, push, or operating-system previews.
- Preserve an in-product record for consequential notifications even when external delivery fails.
- Allow following and watching without turning all activity into interruptive alerts.
- AI-generated notifications must identify their inference status and source basis.

### 10.5 Notification routes

Home owns the personal attention index:

```text
/o/{orgKey}/home/attention
/o/{orgKey}/home/decisions
```

Individual notification records may use an opaque resolver route that immediately authorizes and redirects to the canonical owning destination:

```text
/o/{orgKey}/n/{notificationId}
```

The notification identifier is not the canonical object URL.

## 11. Context Preservation Rules

### 11.1 Context package

```text
OrganizationContext
  organization

BusinessContext
  portfolio?
  program?
  project?
  plan?
  resource?

ViewContext
  capability
  view
  filters
  dateRange
  grouping?
  sort?

JourneyContext
  initiatingObject?
  initiatingQuestion?
  returnLocation?

PreferenceContext
  accessibility
  locale
  density
  notification policy
  personal defaults
```

This is a conceptual contract, not an implementation data structure.

### 11.2 Preservation matrix

| Transition                             | Preserve                                                                    | Re-evaluate                               | Drop unless explicitly compatible          |
| -------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------ |
| Within same capability                 | All valid context                                                           | Permissions and object lifecycle          | Invalid selection                          |
| Between capabilities in same workspace | Organization, scoped objects, compatible date/filter                        | View validity                             | Capability-specific transient state        |
| Projects to Planning                   | Organization, Project, milestone/work relationship, compatible date range   | Plan access and view                      | Project-only filters                       |
| Planning to Resources                  | Organization, Project/Program, demand, date range                           | Resource privacy and assignment authority | Planning-only display state                |
| Portfolio to Project                   | Organization, Portfolio, Program, Project, relationship                     | Project access                            | Aggregate-only filters unless translatable |
| Intelligence to source                 | Organization, source objects, question, filters, date range, return context | Source permission and freshness           | Generated presentation state               |
| Any workspace to Administration        | Organization, affected object, reason, return context                       | Admin permission                          | Business filters not relevant to issue     |
| Organization switch                    | User preferences allowed by policy                                          | All authorization and saved context       | All subordinate business and view context  |

### 11.3 Storage and shareability rules

- Canonical identity and meaningful shareable context belong in the URL.
- Complex reusable context belongs in a saved-view or saved-analysis record referenced by ID.
- Ephemeral UI state belongs in session history and is not part of the canonical URL.
- User defaults and accessibility preferences belong in governed user preferences.
- Sensitive data, private search text, raw prompts, and protected filter values must not be placed in URLs.
- Restored context is always reauthorized and revalidated.
- Invalid or obsolete context is reported and removed explicitly rather than ignored silently.

### 11.4 Context precedence

1. Explicit user selection or confirmation.
2. Trusted canonical or workflow deep link.
3. Active workspace context.
4. Valid saved context.
5. Recent valid context.
6. User default.
7. Organization default.

AI inference may propose context but cannot silently outrank these sources.

## 12. URL Strategy

### 12.1 Canonical grammar

All target authenticated product routes use an organization boundary:

```text
/o/{orgKey}/{workspace}/{context}/{capability}/{object}
```

Not every route uses every segment. Route segments represent stable information hierarchy, not temporary interface state.

### 12.2 Workspace route roots

```text
/o/{orgKey}/home
/o/{orgKey}/portfolio
/o/{orgKey}/projects
/o/{orgKey}/planning
/o/{orgKey}/resources
/o/{orgKey}/intelligence
/o/{orgKey}/admin
```

`admin` is the approved compact URL segment for the Administration workspace; the visible workspace name remains Administration.

### 12.3 Canonical route catalogue

| Destination         | Canonical pattern                                                                 |
| ------------------- | --------------------------------------------------------------------------------- |
| Home                | `/o/{orgKey}/home`                                                                |
| Personal decisions  | `/o/{orgKey}/home/decisions`                                                      |
| Portfolio directory | `/o/{orgKey}/portfolio/portfolios`                                                |
| Portfolio workspace | `/o/{orgKey}/portfolio/portfolios/{portfolioId}`                                  |
| Program workspace   | `/o/{orgKey}/portfolio/programs/{programId}`                                      |
| Project directory   | `/o/{orgKey}/projects`                                                            |
| Project overview    | `/o/{orgKey}/projects/{projectId}`                                                |
| Project capability  | `/o/{orgKey}/projects/{projectId}/{capability}`                                   |
| Project object      | `/o/{orgKey}/projects/{projectId}/{capability}/{objectId}`                        |
| Planning directory  | `/o/{orgKey}/planning`                                                            |
| Project plan        | `/o/{orgKey}/planning/projects/{projectId}/plans/{planId}`                        |
| Plan capability     | `/o/{orgKey}/planning/projects/{projectId}/plans/{planId}/{capability}`           |
| Scenario            | `/o/{orgKey}/planning/projects/{projectId}/plans/{planId}/scenarios/{scenarioId}` |
| Resource directory  | `/o/{orgKey}/resources`                                                           |
| Resource workspace  | `/o/{orgKey}/resources/{resourceId}`                                              |
| Resource capability | `/o/{orgKey}/resources/{resourceId}/{capability}`                                 |
| Demand and capacity | `/o/{orgKey}/resources/demand-capacity`                                           |
| Resource scenario   | `/o/{orgKey}/resources/scenarios/{scenarioId}`                                    |
| Intelligence        | `/o/{orgKey}/intelligence`                                                        |
| Analysis            | `/o/{orgKey}/intelligence/analyses/{analysisId}`                                  |
| Decision brief      | `/o/{orgKey}/intelligence/briefs/{briefId}`                                       |
| Report              | `/o/{orgKey}/intelligence/reports/{reportId}`                                     |
| Administration      | `/o/{orgKey}/admin`                                                               |
| Admin capability    | `/o/{orgKey}/admin/{capability}`                                                  |
| Admin object        | `/o/{orgKey}/admin/{capability}/{objectId}`                                       |
| Search              | `/o/{orgKey}/search`                                                              |

### 12.4 Identifier policy

- `orgKey` is a stable organization-safe key; changing a display name must not break URLs.
- Canonical object routes use immutable, non-sensitive identifiers.
- Display names and mutable slugs are not required for identity. If readable slugs are added, the immutable identifier remains authoritative.
- Sequential identifiers that expose volume or allow enumeration are not approved for externally shareable routes.
- IDs are validated within the organization boundary.

### 12.5 Path versus query versus fragment

Use path segments for canonical hierarchy and identity. Use query parameters for meaningful shareable view state such as:

```text
?view=timeline&from=2026-07-01&to=2026-09-30
```

Use a saved-view ID when filters are complex, sensitive, long, or governed:

```text
?savedView={savedViewId}
```

Fragments may identify a stable section within a canonical document-like object but must not be required for authorization or business identity.

### 12.6 Legacy route migration

Existing routes such as `/dashboard`, `/tasks`, `/risks`, `/issues`, `/raid`, `/users`, `/portfolio`, and `/projects/{id}/planning` remain legacy until migrated.

Migration rules:

1. define the target canonical destination from this blueprint;
2. preserve old inbound links through authorized redirects;
3. migrate bookmarks and internal links gradually;
4. prevent new features from adding to the legacy top-level route model;
5. preserve query context when it has a valid target equivalent;
6. monitor unresolved legacy links before retirement;
7. do not remove a route until its canonical replacement and redirect are verified.

## 13. Deep Linking Strategy

### 13.1 Deep-link classes

| Class                        | Use                                                    | Example                                 |
| ---------------------------- | ------------------------------------------------------ | --------------------------------------- |
| Canonical object link        | Durable identity and normal sharing                    | Project, Resource, Decision             |
| Contextual relationship link | Object plus initiating relationship and return path    | Resource viewed from Project assignment |
| Saved-context link           | Complex repeatable view or analysis                    | Saved capacity view                     |
| Action-request link          | Review, decision, or approval request                  | Baseline approval                       |
| Notification resolver        | Resolve personal notification to canonical destination | `/n/{notificationId}`                   |
| External guest link          | Restricted, time/policy-bound access                   | Future partner review                   |

### 13.2 Resolution sequence

```text
Receive link
  -> authenticate
    -> establish organization
      -> authorize canonical object and relationship
        -> validate object lifecycle
          -> restore safe context
            -> resolve destination
```

### 13.3 Rules

- Authentication return must preserve the intended destination safely.
- A link never confers permission.
- Context parameters are treated as untrusted input and validated.
- Archived objects resolve to an appropriate read-only state when policy permits.
- Soft-deleted or inaccessible objects do not reveal protected metadata.
- Deleted relationships may still resolve the canonical object while explaining that the initiating relationship no longer exists.
- Action links open a reviewable context; they do not execute on resolution.
- External links use explicit audience, expiry, revocation, and content-scope policy.
- AI-generated links use the same canonical resolver and cannot invent route identities.

### 13.4 Link sharing

The share action must distinguish:

- link to canonical object;
- link to current view and filters;
- link to saved governed context;
- request action or review.

The recipient’s permissions determine visible content. The sender must be warned when a contextual link includes a personal or non-shareable saved view.

## 14. Mobile Navigation Principles

### 14.1 Mobile jobs

Mobile navigation prioritizes:

- orientation and catch-up;
- direct requests, decisions, and approvals;
- concise evidence review;
- capture of updates, risks, issues, and decisions;
- communication in context;
- urgent administrative awareness;
- continuity with desktop contexts.

Complex schedule authoring, portfolio modeling, resource scenario construction, bulk administration, and dense comparative analysis remain desktop-primary unless later research validates a safe mobile workflow.

### 14.2 Principles

1. Preserve the same seven-workspace information architecture; do not create a separate mobile product taxonomy.
2. Prioritize Home, current context, search, commands, and attention over exposing every workspace destination simultaneously.
3. Preserve organization and scoped context visibly during action.
4. Restore the same canonical object and meaningful view when moving between desktop and mobile.
5. Use progressive navigation depth without losing a clear return path.
6. Keep direct links and notifications as first-class mobile entry points.
7. Never compress dense desktop planning into an unreadable mobile equivalent; provide review and bounded action modes.
8. Require additional care for consequential approvals: show decision, evidence, impact, authority, and scope before confirmation.
9. Support accessible touch targets, screen readers, dynamic text, orientation changes, external keyboards, and reduced motion without changing information meaning.
10. Allow low-connectivity review or draft capture only where data sensitivity, conflict, and synchronization behavior are explicit.
11. Do not expose sensitive notification content on device previews by default.
12. Keep mobile back behavior consistent with journey history and workspace hierarchy.

### 14.3 Cross-device continuity

A resumable context package may include canonical destination, organization, workspace, scoped object, date range, view, and draft identifier. It must not include unauthorized cached data or silently transfer an unfinished consequential approval between users or sessions.

## 15. Future Extensibility

### 15.1 Adding a capability

A new capability may be added within an existing workspace when it:

- supports the workspace’s approved purpose;
- declares canonical domain ownership;
- fits a defined capability group or justifies a new group;
- follows route, search, command, notification, breadcrumb, and context contracts;
- does not create a duplicate lifecycle or truth;
- includes mobile and accessibility behavior;
- defines AI read and action boundaries.

### 15.2 Adding a primary workspace

A new primary workspace requires a superseding UX ADR and evidence that:

- it represents a durable outcome-oriented job;
- no existing workspace can contain it without losing coherence;
- it needs distinct context and navigation behavior;
- it will remain stable beyond one feature or release;
- its relationship to all existing workspaces is defined;
- migration and global navigation impact are approved.

### 15.3 Extension points

Approved future extension areas include:

- partner and customer participation;
- multi-organization or enterprise-group contexts;
- financial and commercial execution;
- advanced scenario and simulation work;
- governed third-party applications;
- organization-defined saved views and reports;
- AI skills and agents registered through Administration;
- new object types within governed workspace boundaries.

Extensions may contribute authorized commands, search providers, notifications, analyses, and contextual links. They cannot insert arbitrary global workspaces, redefine canonical semantics, or bypass platform authorization and audit.

### 15.4 IA registry

The product should maintain an Information Architecture registry containing:

- workspace and capability identifiers;
- canonical route patterns;
- object types and owning domains;
- breadcrumb definitions;
- search result types;
- command definitions;
- notification types and destinations;
- context compatibility rules;
- legacy redirects;
- extension ownership and lifecycle.

The registry is a governance artifact and may later support automated route, link, search, and navigation consistency checks.

## 16. Information Architecture Diagrams

### 16.1 Product map

```text
                              PM PLATFORM
                                   │
            ┌──────────┬───────────┼───────────┬──────────┐
            │          │           │           │          │
          Home     Portfolio    Projects    Planning   Resources
            │          │           │           │          │
            │          └─────┬─────┴─────┬─────┘          │
            │                │           │                │
            └──────────── Intelligence ────────────────────┘
                             │
                             │ evidence, analysis,
                             │ decisions, AI history
                             │
                       Administration
                    identity, policy, trust
```

Administration governs access and policy across all workspaces. Intelligence composes authorized evidence across all workspaces. Neither replaces source ownership.

### 16.2 Context flow

```text
Organization
  └── Portfolio?
       └── Program?
            └── Project?
                 ├── Plan?
                 └── Resource relationship?

Workspace
  └── Capability
       └── View + Filters + Date Range
            └── Selected Object
                 └── Initiating Question + Return Context
```

Question marks identify optional context, not uncertainty about context meaning.

### 16.3 Canonical object and contextual views

```text
                         ┌──────────────────┐
                         │ Canonical Object │
                         │ identity/owner   │
                         └────────┬─────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
  Project-context view    Planning-context view   Intelligence view
          │                       │                       │
          └──────────── same lifecycle, permissions, ────┘
                         audit, and source truth
```

### 16.4 Navigation and action flow

```text
Global navigation / Search / Command / Notification / Deep link
                              │
                              ▼
                    Resolve organization
                              │
                              ▼
                  Authorize workspace + object
                              │
                              ▼
                   Restore safe context package
                              │
                              ▼
                   Canonical workspace destination
                              │
                     ┌────────┴────────┐
                     ▼                 ▼
                Inspect/Explore   Propose/Act
                                       │
                                       ▼
                              Validate + approve
                                       │
                                       ▼
                              Persist + audit
```

### 16.5 AI information flow

```text
User intent
  -> explicit organization and workspace scope
    -> permission-aware retrieval
      -> cited evidence and inference
        -> analysis or decision brief
          -> proposed deterministic action
            -> owning workspace review
              -> human approval when required
                -> domain validation and persistence
                  -> AI participation history
```

## 17. Approval Recommendation

**Recommendation: APPROVE THE PM PLATFORM INFORMATION ARCHITECTURE BLUEPRINT.**

Approval establishes this document as the authoritative navigation blueprint for future PM Platform pages and experiences.

Approval confirms:

- the seven-workspace product hierarchy;
- stable global navigation and permission-aware visibility;
- capability and context hierarchy within each workspace;
- primary cross-persona journeys and cross-workspace paths;
- relationship-aware breadcrumbs;
- permission-aware lexical, structured, relational, and semantic search;
- a global deterministic command architecture;
- attention-based notification architecture;
- explicit context preservation and precedence;
- organization-scoped canonical URL patterns;
- authorized deep-link resolution;
- one information architecture across desktop and mobile;
- controlled workspace and extension governance; and
- migration of legacy module routes toward canonical workspace routes.

Approval does not require immediate route migration or UI redesign. Implementation may proceed incrementally, but every new page and materially changed route must target this blueprint. Legacy routes must not be treated as precedent for new information architecture.

## References

- [RP-001: Personas and Jobs-to-be-Done](../research/RP-001_PERSONAS_AND_JOBS_TO_BE_DONE.md)
- [RP-002: Modern Product Benchmark](../research/RP-002_MODERN_PRODUCT_BENCHMARK.md)
- [UX-ADR-001: Workspace-First Architecture](UX-ADR-001_WORKSPACE_FIRST_ARCHITECTURE.md)
- [Frontend Architecture](../../architecture/04-FRONTEND-ARCHITECTURE.md)
