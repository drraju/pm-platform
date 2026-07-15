# Home Workspace

## Status

Proposed for approval.

## Document Control

| Field            | Value                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| Initiative       | PM Platform Product UX Evolution                                                                    |
| Workspace        | Home                                                                                                |
| Document type    | Implementation-ready UX workspace specification                                                     |
| Inputs           | RP-001; RP-002; UX-ADR-001; Information Architecture Blueprint                                      |
| Primary personas | Engineer or Team Member; Project Manager; Program Manager; Technical or Resource Manager; Executive |
| Applies to       | Desktop, tablet, mobile, global Home entry, and authenticated landing behavior                      |
| Excludes         | Visual design, colors, component styling, React, API design, and implementation code                |

## Specification Principles

The Home Workspace is one shared product experience with role-adaptive priority. It is not a set of persona dashboards and not a collection of independently configurable tiles.

Home follows five non-negotiable rules:

1. **Orient before summarizing.** A user must understand organization, current scope, material change, and the most useful next step.
2. **Action before activity.** Direct commitments, decisions, and exceptions rank above passive updates.
3. **Canonical truth remains elsewhere.** Home summarizes and routes to owning workspaces; it does not create parallel task, risk, decision, assignment, or status records.
4. **Adaptation remains visible and controllable.** Priority may respond to responsibility, permission, deadlines, and explicit preferences. Shared meaning and critical exceptions cannot be personalized away.
5. **AI reduces reconstruction, not accountability.** AI may assemble, explain, and propose. Consequential action remains inside the authorized owning workflow.

## 1. Workspace Purpose

Home is the intelligent landing and re-entry workspace for every authenticated user. It helps a person regain situational awareness, identify what needs attention, and continue work in the correct workspace with minimal reconstruction.

Home answers five questions in order:

1. **Where am I?** Which organization, responsibilities, and time horizon are active?
2. **What needs me?** Which commitments, decisions, approvals, or direct requests require action?
3. **What materially changed?** Which new facts affect outcomes, priorities, dependencies, capacity, or risk?
4. **What should I do next?** What is the highest-value authorized next action or destination?
5. **Where was I?** Which recent or saved contexts allow work to resume without rebuilding scope?

Home is not intended to provide complete Project, Portfolio, Planning, Resource, or Intelligence functionality. Its job is to create a trustworthy transition into those workspaces.

### 1.1 Home boundary

Home may:

- aggregate authorized references to canonical work;
- rank items using governed priority rules;
- summarize material change;
- provide bounded actions that resolve through owning workflows;
- restore valid recent or saved contexts;
- provide evidence-linked AI orientation and assistance.

Home must not:

- maintain separate status fields;
- duplicate canonical lists merely for convenience;
- become an executive reporting warehouse;
- expose every available metric;
- infer role from title alone;
- hide mandatory obligations through personalization;
- mark underlying work resolved when a Home item is read or dismissed;
- allow AI to execute consequential actions outside the owning workspace.

## 2. Workspace Goals

### 2.1 Primary goals

1. Reduce time required to resume meaningful work after sign-in, interruption, or device change.
2. Make direct obligations and decision requests difficult to miss.
3. Explain material change without forcing users to inspect raw event streams.
4. Preserve context when moving into another workspace and returning Home.
5. Adapt priority to responsibility and permission while retaining one coherent product model.
6. Minimize notification and dashboard scanning burden.
7. Build calibrated trust through source, freshness, uncertainty, and reason-for-priority.
8. Give AI a bounded, auditable role in orientation and preparation.

### 2.2 Non-goals

- Replacing specialist workspaces.
- Displaying a comprehensive organization status.
- Maximizing time spent on Home.
- Supporting unrestricted widget construction.
- Ranking individual employee performance.
- Using activity volume as productivity evidence.
- Turning every source event into a Home item.

### 2.3 Desired Home session outcome

A successful Home session ends in one of four states:

- the user resumes a meaningful context;
- the user completes or advances an authorized obligation;
- the user understands a material change and chooses the appropriate response;
- the user confirms that no immediate action is required and leaves with justified confidence.

Remaining on Home is not itself a success measure.

## 3. Workspace Layout Zones

Zones define information purpose and priority. They do not prescribe physical columns, cards, dimensions, or visual styling.

### 3.1 Zone model

```text
Home Workspace
├── Zone A: Context & Orientation
│   ├── active organization and responsibility context
│   ├── time horizon and freshness
│   └── orientation brief
│
├── Zone B: Action Required
│   ├── direct commitments
│   ├── decisions and approvals
│   └── direct requests and overdue obligations
│
├── Zone C: Material Change & Exposure
│   ├── causal change digest
│   ├── exceptions, blockers, dependencies, and risk
│   └── capacity or portfolio exposure when relevant
│
├── Zone D: Forthcoming Work
│   ├── upcoming milestones and deadlines
│   ├── scheduled reviews
│   └── likely near-term decisions
│
└── Zone E: Continuity & Assistance
    ├── recent contexts
    ├── saved contexts
    ├── watched/delegated contexts
    └── AI assistance and AI work status
```

### 3.2 Zone A: Context & Orientation

**Purpose.** Establish scope and provide a concise evidence-backed explanation of what matters now.

**Required information.** Current organization; active responsibility context where relevant; current date and user time zone; data freshness; changes since the last meaningful Home review; any degraded or incomplete source coverage.

**Behavior.** The zone must remain concise. It may state that no material change was detected. It must not produce motivational copy, a generic greeting as the dominant content, or a broad AI narrative unsupported by source state.

### 3.3 Zone B: Action Required

**Purpose.** Present obligations where the current user is the named actor, decision-maker, approver, reviewer, or accountable owner.

**Required order.** Consequence and deadline take priority over creation time. A decision expiring today may rank above an older low-impact task. Items must explain why the user is responsible.

**Behavior.** The zone supports rapid triage and routing. Bounded actions may be completed from Home only when full decision context is present and the owning workflow permits it. Reading, opening, or dismissing an item never resolves its underlying obligation.

### 3.4 Zone C: Material Change & Exposure

**Purpose.** Explain important changes that affect the user’s outcomes, even when the user is not the direct actor.

**Behavior.** Changes are grouped causally. One plan shift affecting six milestones should appear as one causal change with six effects, not six unrelated notifications. Each group identifies source, affected contexts, materiality, freshness, and whether action is required.

### 3.5 Zone D: Forthcoming Work

**Purpose.** Provide an intentional near-term horizon so users can prepare rather than only react.

**Behavior.** The default horizon adapts by role and explicit preference within governed limits. The user can change it. Dates must distinguish target, forecast, baseline, and decision deadline where applicable.

### 3.6 Zone E: Continuity & Assistance

**Purpose.** Restore working context and provide user-requested AI help without competing with direct obligations.

**Behavior.** Recent contexts are personal and permission-checked. Saved contexts preserve explicit scope. AI work shows current status, required input, and destination. This zone must not promote AI suggestions above material human obligations merely to increase engagement.

### 3.7 Zone ordering rules

- Zone A always precedes detailed work because scope errors invalidate everything below it.
- Zone B precedes Zone C when direct action exists.
- A critical material exception in Zone C may be elevated adjacent to Zone B, but its reason must be explicit.
- Zones with no relevant content collapse semantically; they do not leave meaningless placeholders.
- Mobile preserves the same semantic order even when information is progressively disclosed.
- Keyboard and assistive-technology navigation follows the semantic zone order.

## 4. Role-Adaptive Behaviour

### 4.1 Adaptation model

Home adaptation uses four inputs in precedence order:

1. effective permissions and explicit responsibility assignments;
2. active obligations, decision authority, and material exposure;
3. explicit user preferences and saved contexts;
4. role profile defaults.

Title alone does not determine content. A Project Manager with no Portfolio permission does not receive inaccessible Portfolio summaries. An Engineer temporarily assigned decision authority receives the relevant decision item.

Adaptation may change:

- widget priority;
- default time horizon;
- summary resolution;
- default grouping;
- initial scope of AI orientation;
- which optional widgets are initially enabled.

Adaptation may not change:

- canonical meaning;
- authorization;
- mandatory direct obligations;
- critical safety, compliance, or delivery exceptions;
- source evidence;
- decision authority;
- the distinction between facts, forecasts, and AI inference.

### 4.2 Engineer or Team Member

**Default focus.** Current commitments, blockers, review requests, recent requirement or decision changes, and immediate team dependencies.

**Default horizon.** Today through the current iteration or the next two working weeks, whichever is meaningful in context.

**Orientation behavior.** Explain what changed in assigned work and what can be resumed. Avoid organization-wide performance summaries.

**Priority behavior.** Direct request, blocked work newly unblocked, imminent commitment, failed review, or changed acceptance condition ranks high. Passive project status ranks low.

**AI assistance.** Assemble working context, summarize changes to assigned work, identify missing acceptance evidence, and draft an update. AI must not claim completion or evaluate performance.

### 4.3 Project Manager

**Default focus.** Project exceptions, decisions, overdue dependencies, milestone forecast changes, RAID exposure, stakeholder requests, and required approvals.

**Default horizon.** Current week through the next major milestone, with explicit date-range control.

**Orientation behavior.** Explain material variance across owned Projects and name the decision or coordination need.

**Priority behavior.** Decision latency, critical dependency, forecast movement, unowned risk, and capacity constraint outrank routine task activity.

**AI assistance.** Reconcile evidence, explain variance, draft status, identify missing owners or decisions, and prepare a meeting or decision brief. AI must not commit dates, rebaseline, close risks, or communicate externally without review.

### 4.4 Program Manager

**Default focus.** Cross-Project dependencies, shared constraints, systemic risks, Program decisions, forecast divergence, and Portfolio escalation.

**Default horizon.** Current month through the next Program governance or outcome checkpoint.

**Orientation behavior.** Aggregate only where sources remain traceable. Highlight concentration and propagation rather than average health.

**Priority behavior.** Cross-Project consequence and decision deadlines outrank local activity. A local issue appears only when it materially affects Program outcomes or requires Program authority.

**AI assistance.** Normalize status, identify conflicting assumptions, trace dependency effects, and prepare decision options. AI must preserve dissent and uncertainty rather than compress them into one health score.

### 4.5 Technical or Resource Manager

**Default focus.** Capacity conflicts, assignment requests, availability changes, critical-skill concentration, staffing decisions, and team sustainability.

**Default horizon.** Current week through the organization’s approved staffing or capacity-planning horizon.

**Orientation behavior.** Explain demand-capability changes and affected commitments without exposing sensitive personal information outside purpose.

**Priority behavior.** Imminent overload, unstaffed critical demand, changed availability, and time-sensitive assignment negotiation rank above general utilization.

**AI assistance.** Explain constraints, assemble feasible scenarios, identify skill adjacency, and prepare negotiation evidence. AI must not autonomously assign people, infer sensitive attributes, rank employee worth, or make employment decisions.

### 4.6 Executive

**Default focus.** Material decisions, strategic outcome movement, Portfolio exposure, confidence changes, shared constraints, and expiring risk acceptance.

**Default horizon.** Current governance period through the next strategic checkpoint.

**Orientation behavior.** Present concise material change, options, recommendation status, confidence, deadline, owner, and evidence. Operational detail remains available through drill-through.

**Priority behavior.** Items requiring executive authority rank above informational Portfolio movement. Routine Project variance is suppressed unless material to strategic outcome or threshold.

**AI assistance.** Prepare interrogable briefs, challenge assumptions, compare scenarios, and translate operational evidence. AI must not accept risk, allocate capital, evaluate people covertly, or present generated narrative as verified fact.

### 4.7 Multiple-role behavior

Users with multiple responsibilities receive one Home, not multiple persona modes. They may filter or save responsibility contexts such as “Project delivery” or “Resource management,” but urgent obligations remain visible across valid contexts.

When role priorities conflict:

1. direct named obligation;
2. material consequence and deadline;
3. explicit active responsibility context;
4. user preference;
5. role default.

## 5. Workspace Widgets

Widgets are governed information units with defined jobs and source contracts. They are not freely programmable dashboard tiles.

### 5.1 Widget catalogue

| Widget                      | User job                                                 | Canonical sources                             | Primary destination                       |
| --------------------------- | -------------------------------------------------------- | --------------------------------------------- | ----------------------------------------- |
| Orientation Brief           | Understand what matters now and what changed             | Authorized source summaries and Intelligence  | Source workspace or Intelligence analysis |
| My Work                     | Resume direct commitments and reviews                    | Projects, Planning, delegated workflows       | Canonical work item                       |
| Decisions & Approvals       | Make or advance authorized decisions                     | Owning decision workflows                     | Reviewable decision context               |
| Direct Requests             | Respond to named requests for input or action            | Owning workspace                              | Request source                            |
| Material Change Digest      | Understand causal changes since last review              | Cross-workspace event relationships           | Affected context or analysis              |
| Blockers & Exceptions       | Address blocked, overdue, or threshold-crossing work     | Projects, Planning, Resources, Administration | Owning exception context                  |
| Upcoming Commitments        | Prepare for near-term deadlines and reviews              | Projects, Planning, Portfolio                 | Milestone, commitment, or review          |
| Dependency Watch            | Understand dependencies that need attention              | Portfolio, Projects, Planning                 | Dependency relationship                   |
| Project Pulse               | See material state across directly owned Projects        | Projects and governed metrics                 | Project Workspace                         |
| Program & Portfolio Pulse   | See material cross-Project outcome movement              | Portfolio and Intelligence                    | Program, Portfolio, or brief              |
| Capacity & Assignment Watch | See relevant demand, availability, or assignment changes | Resources and Planning                        | Resource or scenario context              |
| Recent Contexts             | Resume recently used valid scope                         | Personal context history                      | Restored canonical context                |
| Saved Contexts              | Open intentional repeatable scope                        | Saved-view service                            | Saved canonical context                   |
| Watched & Delegated         | Monitor explicitly followed or delegated work            | Owning workflows                              | Canonical source                          |
| AI Work                     | Continue, review, or supply input to requested AI work   | Intelligence AI participation history         | AI analysis or owning review workflow     |

### 5.2 Widget contract

Every widget requires:

- one defined user job;
- named canonical sources;
- effective-permission behavior;
- freshness and partial-data behavior;
- ranking and grouping policy;
- maximum default scope or result count;
- primary and secondary actions;
- canonical destination and return behavior;
- empty, loading, partial, stale, and error states;
- desktop and mobile behavior;
- accessibility semantics;
- success measure;
- owner and lifecycle review date.

### 5.3 Orientation Brief

The Orientation Brief is the only synthesis widget expected for all roles. It states:

- scope used;
- time since the user’s last meaningful review;
- highest material changes;
- immediate obligations;
- unresolved uncertainty or missing source coverage;
- suggested next destination when justified.

The brief must be concise, evidence-linked, and stable enough to scan. If generated or assisted by AI, it must be labeled as synthesis and allow source inspection. A deterministic fallback must exist when AI is unavailable.

### 5.4 My Work

My Work includes items where the user is the direct assignee, reviewer, accountable owner, or explicitly delegated actor. It excludes items merely followed for awareness.

Default grouping prioritizes:

1. blocked or at-risk direct work;
2. time-sensitive work;
3. work awaiting the user;
4. resumable in-progress work;
5. upcoming work.

Item ordering must not imply employee performance ranking.

### 5.5 Decisions & Approvals

Each item must expose decision type, accountable authority, deadline, consequence, evidence readiness, and whether the current user can decide, recommend, or only review.

Home may support a bounded decision only when:

- evidence required by policy is present;
- consequence and affected scope are visible;
- the action is unambiguous;
- the owning workflow supports remote decision;
- applicable authentication and confirmation are satisfied.

Otherwise, Home routes to the full decision context.

### 5.6 Material Change Digest

Digest entries group related source events into a causal statement:

```text
Cause
  -> affected outcomes or commitments
    -> significance
      -> owner or decision need
        -> source evidence
```

The digest distinguishes new, updated, resolved, and no-longer-relevant changes. The user can acknowledge a digest entry without resolving its source object.

### 5.7 Pulse widgets

Project, Program, Portfolio, and Capacity Pulse widgets appear only when the user has relevant responsibility and scope. A Pulse is not a miniature dashboard. It contains material movement, exception count with definition, confidence, and next decision—not a broad catalogue of metrics.

## 6. Widget Priority

### 6.1 Priority levels

| Level       | Meaning                                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------------- |
| P0          | Always considered for immediate placement when relevant; cannot be hidden while an unresolved mandatory item exists |
| P1          | High-value default for the role; user may reposition within allowed zones                                           |
| P2          | Useful secondary context; user may disable or collapse                                                              |
| Contextual  | Appears only when triggered by explicit responsibility, watch, or material condition                                |
| Not default | Available through another workspace or explicit personalization, but not initially shown                            |

### 6.2 Role priority matrix

| Widget                      | Engineer      | Project Manager | Program Manager | Technical Manager | Executive   |
| --------------------------- | ------------- | --------------- | --------------- | ----------------- | ----------- |
| Orientation Brief           | P0            | P0              | P0              | P0                | P0          |
| My Work                     | P0            | P1              | P2              | P1                | Not default |
| Decisions & Approvals       | Contextual/P0 | P0              | P0              | P0                | P0          |
| Direct Requests             | P0            | P0              | P0              | P0                | P0          |
| Material Change Digest      | P1            | P0              | P0              | P0                | P0          |
| Blockers & Exceptions       | P0            | P0              | P0              | P0                | Contextual  |
| Upcoming Commitments        | P1            | P1              | P1              | P1                | P2          |
| Dependency Watch            | P1            | P0              | P0              | P1                | Contextual  |
| Project Pulse               | P2            | P0              | P1              | P2                | Contextual  |
| Program & Portfolio Pulse   | Not default   | Contextual      | P0              | Contextual        | P0          |
| Capacity & Assignment Watch | Contextual    | P1              | P1              | P0                | Contextual  |
| Recent Contexts             | P1            | P1              | P1              | P1                | P2          |
| Saved Contexts              | P2            | P1              | P1              | P1                | P1          |
| Watched & Delegated         | P2            | P2              | P2              | P2                | P2          |
| AI Work                     | Contextual    | Contextual      | Contextual      | Contextual        | Contextual  |

### 6.3 Dynamic priority score

Within the same priority level, ranking considers:

1. direct responsibility;
2. consequence severity;
3. decision or action deadline;
4. blocked downstream work;
5. novelty since last meaningful review;
6. confidence and evidence readiness;
7. user’s explicit responsibility context;
8. user preference.

The product must be able to explain a high-priority item in user language. Engagement likelihood, organizational politics, sender seniority alone, and raw activity volume are not approved ranking factors.

## 7. AI Assistant Behaviour

### 7.1 AI role in Home

AI acts as an orientation and preparation layer. It may:

- generate the Orientation Brief from authorized current evidence;
- explain why an item is important;
- summarize causal change;
- answer questions about visible Home content with citations;
- prepare a transition into Intelligence for deeper analysis;
- draft updates, questions, or decision briefs;
- identify conflicting evidence, missing ownership, or incomplete context;
- propose the safest next destination or action;
- continue user-requested AI work and request missing input.

AI must not:

- create a hidden ranking model that users cannot inspect;
- silently widen organization or business scope;
- mark work complete;
- approve decisions;
- change baselines, assignments, access, funding, or accepted risk;
- send external communication without review;
- create facts from inference;
- use inaccessible information to influence visible rankings;
- infer individual performance or sensitive personal attributes.

### 7.2 Invocation modes

**Passive deterministic Home.** Home functions fully without AI. Queues, deadlines, direct requests, source changes, and recent contexts remain available.

**AI-assisted orientation.** AI synthesizes visible authorized Home evidence. Scope and sources are inspectable.

**User-requested question.** The user asks about Home or a selected item. AI retains current organization and declared context.

**Deeper investigation.** The user moves to Intelligence with the question, source package, and return context preserved.

### 7.3 Proactive AI threshold

AI may proactively surface an insight only when it is:

- materially relevant to the user’s responsibility;
- novel since the last meaningful review;
- supported by identifiable evidence;
- actionable or useful for a near-term decision;
- appropriately timed;
- not a duplicate of a deterministic obligation or alert.

Low-confidence, speculative, or non-actionable observations remain available on request and do not interrupt.

### 7.4 Transparency and correction

AI content identifies:

- declared scope;
- source evidence;
- data freshness;
- inference or forecast status;
- important uncertainty;
- actions taken, if any;
- how to correct scope, sources, or interpretation.

User correction updates the current result immediately where safe. It does not silently rewrite shared business truth. Durable corrections route to the owning workspace.

## 8. Workspace Actions

### 8.1 Action classes

| Class            | Examples                                                 | Home behavior                                                                      |
| ---------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Navigate         | Open Project, Plan, Resource, brief, or recent context   | Immediate canonical transition with return context                                 |
| Orient           | Change responsibility context, time horizon, or grouping | Immediate when authorized; active scope remains visible                            |
| Manage attention | Acknowledge, follow, unfollow, defer personal reminder   | Changes personal attention state only                                              |
| Collaborate      | Request input, copy context link, assign review          | Uses owning workflow and permission checks                                         |
| Draft            | Draft update, question, brief, or action proposal        | No shared effect until reviewed and submitted                                      |
| Decide           | Approve, reject, request changes, defer decision         | Bounded only when full policy context is present; otherwise routes to owner        |
| Act              | Update, assign, resolve, archive, or change state        | Normally routes to owning workspace; limited quick actions require full validation |
| Analyze          | Explain change, compare evidence, investigate exception  | Opens contextual analysis or Intelligence                                          |

### 8.2 Action safety

- Home action availability reflects effective permission and current object state.
- Consequential actions disclose affected scope and outcome before confirmation.
- Bulk actions are not a primary Home behavior.
- Destructive actions, baseline changes, staffing commitments, access changes, financial decisions, and risk acceptance do not execute from condensed context.
- Successful action updates Home from the canonical source; Home does not optimistically invent final state.
- Partial failure preserves unresolved items and explains what changed.
- Undo is provided for personal attention changes and reversible low-consequence actions where the owning workflow supports it.

### 8.3 Return behavior

After completing work in another workspace, returning Home restores:

- organization;
- responsibility filter;
- time horizon;
- prior zone and item position where feasible;
- updated canonical item state;
- a concise confirmation only when the result is not otherwise evident.

## 9. Notification Behaviour

### 9.1 Relationship between Home and notifications

Home is the durable personal attention index. External notifications and the global notification utility resolve into Home or the canonical owning workflow. Home does not display a raw chronological event feed.

### 9.2 Home attention classes

1. Direct request.
2. Decision or approval.
3. Material exception.
4. Relationship change requiring awareness.
5. Informational change suitable for digest.
6. Requested AI work requiring input or review.

### 9.3 State model

Notification state is distinct from source-work state:

```text
Notification: new -> seen -> acknowledged/dismissed
Source work: open -> in progress -> resolved/closed
```

Seeing or dismissing a notification cannot resolve the source. When the source is resolved elsewhere, related Home attention is reconciled automatically.

### 9.4 Grouping and suppression

- Group by cause and affected context.
- Suppress duplicate notifications for the user’s own successful action.
- Replace superseded information instead of stacking contradictory messages, while retaining history where consequential.
- Do not suppress a direct request merely because a related digest exists.
- Delegation and leave rules reroute obligations according to policy and preserve the original accountable owner.
- Personal dismissal may hide informational items but cannot hide mandatory compliance, decision, or critical obligations.

### 9.5 Delivery preference

Users control digest cadence, quiet hours, device channels, watched contexts, and optional informational categories. Organization policy may require critical administrative or safety communication and must explain the override.

## 10. Search Behaviour

### 10.1 Search from Home

Search invoked from Home begins with organization scope and personal relevance, while clearly offering broader authorized scope. It supports:

- finding a canonical object or person;
- resuming a recent or saved context;
- locating a direct obligation or decision;
- navigating to a workspace or command;
- asking an evidence-backed question.

### 10.2 Default ranking

Search relevance considers exact match, identifier match, current organization, active responsibility, direct relationship, recent valid use, and source freshness. Home priority does not distort canonical search results: an urgent item may be identified as urgent, but a weaker textual match cannot displace a known exact object.

### 10.3 Search result behavior

Each result identifies object type, owning workspace, scoped parent, relationship to the user, lifecycle state, and canonical destination. Generated answers remain separate from results and cite authorized sources.

### 10.4 Search continuity

Opening a result from Home preserves the search query or initiating question as return context. Sensitive queries are not encoded in shareable URLs or organization-level history.

## 11. Empty States

Empty states distinguish absence, completion, scope, permission, configuration, and unavailable evidence. “Nothing here” is insufficient.

### 11.1 Workspace-level empty states

| Condition                            | Message purpose                                                              | Approved next step                                                        |
| ------------------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| New user with no assigned context    | Explain what Home will provide and why it is empty                           | Find authorized Projects, accept invitation, or contact responsible owner |
| No immediate obligations             | Confirm that no direct action is currently required                          | Resume recent context or review upcoming horizon                          |
| No material changes                  | State review period and source freshness                                     | Continue work or change explicit horizon                                  |
| Filters exclude all items            | Explain active filters                                                       | Clear or modify filter                                                    |
| No permission for an optional widget | Omit widget without leaking existence                                        | None unless access request is explicitly supported                        |
| Source capability not configured     | Explain missing organizational configuration when user is authorized to know | Open appropriate setup or contact owner                                   |
| AI unavailable                       | Preserve deterministic Home                                                  | Continue without AI or retry later                                        |

### 11.2 Positive empty states

Home may state “No decisions currently require your approval” or “No material changes since your last review” only when the relevant source set loaded successfully and freshness is known. It must not claim calm when data is incomplete.

### 11.3 Widget empty-state rules

- Explain scope and time horizon.
- Distinguish zero results from unavailable results.
- Offer one relevant next action at most.
- Avoid celebratory language when absence might result from missing data.
- Do not prompt users to create artificial work merely to populate Home.

## 12. Loading States

### 12.1 Loading sequence

Home loads in dependency order:

1. authenticated shell, organization, permissions, and saved preferences;
2. deterministic direct obligations and decision counts;
3. material change and forthcoming work summaries;
4. recent and saved contexts;
5. optional Pulse widgets;
6. AI synthesis.

Home must not wait for AI or the slowest optional source before becoming useful.

### 12.2 Loading behavior

- Preserve stable zone structure to avoid context movement during progressive loading.
- Identify which scope is loading.
- Allow already-loaded actions and navigation to remain available.
- Do not show zero values while data is still loading.
- Use last-known data only when labeled with timestamp and stale status.
- Keep user input, filters, and selected responsibility stable during refresh.
- Announce material loading completion appropriately for assistive technology without excessive interruption.

### 12.3 Long-running AI work

AI work shows requested outcome, declared scope, current phase, sources or tools in use at an appropriate level, elapsed state, cancellation or interruption option, and whether user input is required. The user may leave Home and return without losing the governed AI work record.

## 13. Error States

### 13.1 Error taxonomy

| Error                             | Home behavior                                                                                         |
| --------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Organization unavailable          | Stop business-data loading; preserve safe account controls and recovery guidance                      |
| Permission changed                | Remove inaccessible content, explain context invalidation where safe, and offer permitted destination |
| One widget source failed          | Preserve other zones; mark widget unavailable and avoid false empty claims                            |
| Stale source                      | Show last verified time, suppress unsupported conclusions, allow source inspection                    |
| Canonical object archived/deleted | Reconcile Home item and provide permitted lifecycle explanation                                       |
| Action conflict                   | Refresh canonical state, preserve user intent, explain changed condition                              |
| Network interruption              | Preserve loaded authorized information according to policy; queue drafts only when safe               |
| AI synthesis failed               | Show deterministic Home and source items; allow retry without blocking work                           |
| Search unavailable                | Preserve direct navigation and recent valid contexts                                                  |
| Unknown systemic failure          | Provide traceable support reference without exposing sensitive diagnostics                            |

### 13.2 Error principles

- Degrade by widget or source rather than failing the entire workspace when safe.
- Never turn unavailable data into a positive empty state.
- State what is affected, what remains reliable, and what the user can do.
- Preserve entered draft content where safe.
- Avoid repeated automatic retries that cause churn or load.
- Record consequential action failures through the owning workflow.
- Do not ask the user to understand technical subsystem names.

## 14. Personalisation

### 14.1 Permitted personalization

Users may:

- choose a default responsibility context;
- select permitted time horizons;
- reposition optional widgets within compatible zones;
- enable, disable, expand, or collapse P1/P2 widgets;
- create personal saved contexts;
- choose grouping and sort options within governed semantics;
- set digest, notification, device, and quiet-hour preferences;
- manage watched contexts;
- choose accessibility, density, locale, and time-zone preferences;
- reset Home to role defaults.

### 14.2 Prohibited personalization

Users may not:

- hide unresolved mandatory decisions or critical obligations;
- redefine metric, status, risk, priority, or confidence semantics;
- remove organization or source context from consequential information;
- create arbitrary executable widget logic;
- make personal layout the shared organization default without governance;
- personalize away permission, privacy, or approval controls;
- permit AI to use broader sources than authorization and policy allow.

### 14.3 Adaptive recommendations

Home may recommend a widget or saved context based on repeated explicit behavior. It must explain the recommendation and allow dismissal. Dismissal affects the recommendation, not source obligations. Implicit behavior cannot automatically alter shared workflow or notification policy.

### 14.4 Portability and reset

Personalization follows the user within the same organization unless constrained by device or policy. Organization-specific preferences do not automatically transfer to another organization. Users can inspect and reset personalization without losing canonical work.

## 15. Performance Expectations

Performance expectations are experience-level service objectives. Exact technical budgets belong to implementation planning, but delivered behavior must meet these outcomes under defined representative loads.

### 15.1 Experience targets

| Experience                                  | Target                                                                                                                        |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Home shell and organization context         | Visible and usable within 1 second at p75 and 2 seconds at p95 on supported desktop conditions                                |
| First meaningful deterministic content      | Available within 2 seconds at p75 and 4 seconds at p95                                                                        |
| Direct action feedback                      | Acknowledged within 100 milliseconds; durable result or progress state presented without ambiguity                            |
| Workspace transition                        | Begins immediately; meaningful destination content within 2 seconds at p75 under normal conditions                            |
| Filter, grouping, and responsibility change | Immediate feedback; settled content within 1 second when source data is available                                             |
| Search initial results                      | Useful initial results within 1 second at p75; progressive refinement permitted                                               |
| Home refresh                                | Preserves interaction and loaded content; no full-workspace blocking refresh                                                  |
| AI orientation                              | Deterministic Home is never blocked; first progress feedback within 1 second and synthesis streams or completes progressively |

### 15.2 Stability expectations

- Priority order must not churn during a session without new evidence or user action.
- Progressive loading must reserve semantic position for high-priority zones.
- Ranking changes caused by new data must be explainable.
- Home must remain usable when one source or AI is degraded.
- Large organizations must not require loading every authorized object to calculate initial Home state.
- Recent and saved contexts must resolve with current authorization, not stale cached permission.

### 15.3 Freshness expectations

Direct obligations, decisions, and critical exceptions require near-current state appropriate to their source. Summaries expose freshness. A widget that cannot meet its defined freshness threshold must show stale or unavailable status and must not support consequential quick action.

## 16. Success Metrics

### 16.1 Outcome metrics

| Metric                           | Definition                                                                          | Desired direction                             |
| -------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------- |
| Time to meaningful continuation  | Time from Home entry to opening or advancing relevant work                          | Decrease                                      |
| Decision readiness               | Proportion of Home decision items with required evidence and authority context      | Increase                                      |
| Decision latency                 | Time from ready-for-decision to recorded decision                                   | Decrease without increased reversal           |
| Material change comprehension    | Users correctly identify what changed, why it matters, and required response        | Increase                                      |
| Context restoration success      | Resumed contexts restore valid scope without manual reconstruction                  | Increase                                      |
| Notification-to-action precision | Actionable Home items that lead to appropriate action or conscious deferral         | Increase                                      |
| Duplicate status effort          | Time spent recreating status already derivable from source evidence                 | Decrease                                      |
| False calm rate                  | Sessions showing no action/change when required source data was incomplete or stale | Approach zero                                 |
| AI citation coverage             | Consequential AI Home claims linked to inspectable sources                          | Reach policy target                           |
| AI correction and rejection rate | Corrections, rejected recommendations, and scope fixes                              | Monitor for calibration, not minimize blindly |

### 16.2 Guardrail metrics

- Critical obligation miss rate.
- Incorrect or unauthorized content exposure.
- Cross-organization context error rate.
- Quick-action reversal and conflict rate.
- Notification volume per resolved material event.
- Accessibility task-completion parity.
- Performance by organization size and device class.
- User-reported surveillance or ranking concern.
- AI unsupported-claim and stale-source rate.
- Personalization reset and disable rates.

### 16.3 Metrics not approved as primary success measures

- Time spent on Home.
- Number of widgets viewed.
- Notification open rate alone.
- AI prompt volume.
- Task updates per person.
- Presence, online time, or interaction count.
- Percentage of Home space populated.

### 16.4 Evaluation cadence

Home must be evaluated through usability testing, accessibility testing, telemetry with privacy governance, and longitudinal workflow observation. Metrics are segmented by role, permission, organization size, device, and relevant accessibility need without exposing individual performance.

## 17. Future Extensibility

### 17.1 Approved extension areas

- System Administrator Home priorities under a separate role extension.
- Partner, customer, contractor, and guest landing behavior.
- Cross-organization executive and service-provider contexts.
- Financial, commercial, procurement, and benefits decisions.
- Additional governed decision types.
- Organization-approved widget extensions.
- Third-party source summaries with freshness and ownership contracts.
- Offline or low-connectivity draft and review behavior.
- Voice and multimodal orientation where privacy and accessibility permit.
- Governed AI skills and agents registered through Administration.

### 17.2 Adding a widget

A new Home widget requires evidence that it:

1. supports a recurring Home job rather than specialist workspace work;
2. reduces orientation, attention, or continuity cost;
3. has canonical sources and a canonical destination;
4. defines priority, grouping, freshness, and permission behavior;
5. cannot be represented adequately by an existing widget;
6. has complete state behavior and performance targets;
7. does not create a new source of truth;
8. has a retirement condition and accountable owner.

### 17.3 Extension governance

Third-party or organization-defined widgets cannot:

- bypass zone priority;
- insert advertising or engagement-driven content;
- expose unauthorized data;
- execute unregistered actions;
- redefine shared metrics;
- make unsupported AI claims;
- prevent deterministic Home operation;
- degrade initial Home performance beyond approved budgets.

### 17.4 Compatibility with future workspaces

If a future primary workspace is approved, Home integrates it through the same contracts: canonical references, direct obligations, material change, recent/saved context, search, notifications, AI scope, and owning-workspace action routing. Home does not require a separate persona dashboard or new layout model for each workspace.

## Approval Recommendation

**Recommendation: APPROVE THE HOME WORKSPACE SPECIFICATION.**

Approval establishes:

- Home as the intelligent orientation and re-entry workspace;
- one shared role-adaptive experience rather than persona dashboards;
- the five-zone semantic architecture;
- the governed widget catalogue and priority matrix;
- deterministic operation with optional evidence-linked AI assistance;
- canonical action and navigation routing;
- attention-based notification behavior;
- explicit empty, loading, error, and stale-data states;
- constrained personalization;
- measurable performance and outcome expectations; and
- governed future extensibility.

Approval authorizes subsequent interaction-flow and delivery planning for Home. It does not authorize visual design, component selection, frontend implementation, or changes to canonical domain ownership.

## References

- [RP-001: Personas and Jobs-to-be-Done](../research/RP-001_PERSONAS_AND_JOBS_TO_BE_DONE.md)
- [RP-002: Modern Product Benchmark](../research/RP-002_MODERN_PRODUCT_BENCHMARK.md)
- [UX-ADR-001: Workspace-First Architecture](../architecture/UX-ADR-001_WORKSPACE_FIRST_ARCHITECTURE.md)
- [Information Architecture Blueprint](../architecture/INFORMATION_ARCHITECTURE_BLUEPRINT.md)
