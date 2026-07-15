# Project Workspace Specification

## Status

Proposed for approval.

## Document Control

| Field               | Value                                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Initiative          | PM Platform Product UX Evolution                                                                                                     |
| Workspace           | Projects — single Project context                                                                                                    |
| Document type       | Definitive implementation-ready UX workspace specification                                                                           |
| Inputs              | RP-001; RP-002; UX-ADR-001; Information Architecture Blueprint; Home Workspace; Planning Workspace                                   |
| Primary personas    | Engineer or Team Member; Project Manager; Program Manager; Technical or Resource Manager; Executive; authorized stakeholders         |
| Applies to          | Project overview, delivery coordination, RAID, decisions, evidence, documents, team context, and cross-workspace navigation          |
| Excludes            | UI styling, components, frontend code, detailed schedule manipulation, Resource master-data administration, and autonomous AI action |
| Legacy relationship | Supersedes `PROJECT_WORKSPACE.md` as the authoritative UX specification when approved                                                |

## Workspace Authority and Boundaries

Project Workspace is the operational command center for one Project. It assembles canonical Project information, execution evidence, delivery commitments, RAID, decisions, team relationships, documents, and material signals into one coherent working context.

Project Workspace is not a dashboard. It must always support a decision, investigation, coordination step, or next action. Passive summaries exist only to orient a participant toward meaningful work.

The workspace preserves these ownership boundaries:

- Projects owns Project identity, lifecycle, outcomes, ownership, Project roles, execution context, RAID, Project decisions, evidence relationships, and Project-level collaboration.
- Planning owns work breakdown, schedule structure, detailed dependencies, milestones as schedule objects, Scenarios, Baselines, forecasts, float, and critical-path interaction.
- Resources owns Resource profiles, skills, capacity, availability, Calendars, and Resource-centered assignment governance.
- Portfolio owns cross-Project outcome coordination and Program or Portfolio decisions.
- Intelligence owns governed analysis and decision briefs, but not source Project state.
- Administration owns platform identity, permission, policy, integration, and audit configuration, but not Project business authority.

Project Workspace may summarize Planning, Resource, Portfolio, and Intelligence information. It cannot duplicate or independently mutate their canonical state.

## 1. Workspace Purpose

Project Workspace gives every authorized participant a shared, evidence-backed understanding of one Project’s current condition and the safest useful next action.

It answers:

1. What outcome is this Project responsible for?
2. What is the current delivery state, and how trustworthy is that assessment?
3. What materially changed?
4. Which milestone, commitment, dependency, risk, issue, Resource constraint, decision, or document requires attention?
5. Who owns the next action or decision?
6. Which information is fact, calculation, forecast, assessment, or AI inference?
7. Where must the user go for detailed Planning, Resource, Portfolio, or Intelligence work?

### 1.1 Workspace outcomes

A successful Project Workspace session results in at least one of the following:

- a participant resumes or advances delivery work;
- a variance is understood and routed to the correct owner;
- a risk or issue is created, updated, escalated, mitigated, or resolved;
- a decision is framed, reviewed, made, or recorded;
- a milestone or dependency concern is investigated in Planning;
- a Resource concern is investigated or negotiated in Resources;
- evidence or a document is reviewed and connected to its purpose;
- a Project update is prepared from current evidence;
- the user confirms, with known freshness and confidence, that no intervention is needed.

### 1.2 Non-goals

Project Workspace does not:

- reproduce Home’s personal obligation and notification queues;
- provide detailed Gantt or schedule editing;
- administer Resource profiles, skills, capacity policies, availability, or Calendars;
- replace Portfolio-level cross-Project coordination;
- become a report catalogue;
- display every available metric;
- infer Project health solely from task completion;
- treat activity as productivity;
- allow AI recommendations to become canonical state without review.

## 2. Primary Users

### 2.1 Engineer or Team Member

Uses Project Workspace to understand Project intent, delivery context, changes affecting assigned work, blockers, linked decisions, evidence expectations, and collaborators. Detailed personal prioritization remains in Home; detailed schedule editing remains in Planning.

### 2.2 Project Manager

Uses Project Workspace as the primary operational command center: orienting the team, managing Project health, coordinating delivery, governing RAID and decisions, linking evidence, preparing updates, and routing detailed work to Planning or Resources.

### 2.3 Program Manager

Uses Project Workspace to inspect source evidence behind Program signals, understand local decisions and dependencies, and determine whether Program coordination or escalation is required. Cross-Project comparison remains in Portfolio.

### 2.4 Technical or Resource Manager

Uses Project Workspace to understand demand purpose, technical or capability constraints, team commitments, delivery consequences, and decisions requiring Resource input. Detailed capacity and staffing analysis remains in Resources.

### 2.5 Executive or sponsor

Uses Project Workspace to verify evidence behind material change, inspect outcomes, milestones, exposure, decisions, and accountability without being forced through operational detail. Portfolio decisions and formal decision briefs remain in Portfolio or Intelligence.

### 2.6 Other authorized stakeholders

Auditors, customers, partners, governance participants, or subject-matter experts may receive restricted Project views or review requests. Their experience is permission- and purpose-limited; it does not reveal the full Project by default.

### 2.7 Persona adaptation rule

Project Workspace remains one shared Project context. Persona, responsibility, and permission influence priority, default depth, and available action—not canonical meaning or separate versions of health.

## 3. User Goals

### 3.1 Universal goals

- Confirm Project identity, outcome, ownership, lifecycle, and active context.
- Understand current health, confidence, freshness, and material change.
- Move from summary to source evidence without losing context.
- Identify direct decisions, blockers, and next actions.
- Collaborate at the point of work.
- Navigate to specialist workspaces with Project and initiating-question context preserved.

### 3.2 Project Manager goals

- Detect variance before it becomes failure.
- Coordinate commitments and dependencies without duplicating task or schedule data.
- Keep RAID and decision ownership current.
- Prepare evidence-backed stakeholder communication.
- Understand schedule and Resource consequences at an operational level.
- Request the correct decision from the correct authority.

### 3.3 Team goals

- Understand why work matters and what changed.
- See blockers, upcoming milestones, and decisions relevant to delivery.
- Surface evidence, risk, issues, and questions with minimal navigation.
- Avoid maintaining a second status narrative.

### 3.4 Oversight goals

- Inspect the reason behind a health or forecast assessment.
- Understand material options and decisions.
- Verify source evidence, freshness, and dissent.
- Avoid operational noise that does not affect outcome or authority.

## 4. Workspace Zones

Zones define information purpose, workflow sequence, and ownership. They do not prescribe physical layout, card design, or visual styling.

### 4.1 Zone architecture

```text
Project Workspace
├── Zone A: Project Identity & Context
│   ├── identity, outcome, lifecycle, ownership
│   ├── Portfolio/Program relationship
│   ├── permissions, freshness, and collaborators
│   └── current comparison or review context
│
├── Zone B: Health, Change & Decisions
│   ├── multidimensional health model
│   ├── material change since comparison point
│   ├── decisions and approvals
│   └── confidence, evidence, and unknowns
│
├── Zone C: Delivery Command
│   ├── timeline and milestones
│   ├── task progress and blockers
│   ├── RAID and dependencies
│   └── quick actions and ownership
│
├── Zone D: Capability & Stewardship
│   ├── Resource summary
│   ├── financial summary when enabled
│   ├── documents, evidence, and decisions
│   └── Project governance
│
└── Zone E: Activity, Collaboration & Assistance
    ├── causal activity timeline
    ├── comments, reviews, and requests
    ├── AI explanation and preparation
    └── related-workspace transitions
```

### 4.2 Zone A: Project Identity & Context

Always establishes:

- organization;
- immutable Project identity and current name;
- Project outcome or purpose;
- Project lifecycle state;
- Project Manager, sponsor, business owner, and relevant delivery leadership;
- Portfolio and Program relationship where applicable;
- approved start/finish or current forecast context, clearly classified;
- effective permission and current review mode;
- source freshness or degraded coverage;
- return context when entered from Home, Portfolio, Planning, Resources, or Intelligence.

Project identity remains stable while users navigate Project capabilities.

### 4.3 Zone B: Health, Change & Decisions

Answers “what condition is the Project in, what changed, how do we know, and what decision is needed?” It prioritizes evidence and exception over broad metric coverage.

### 4.4 Zone C: Delivery Command

Supports operational coordination across milestones, task flow, blockers, dependencies, risks, and issues. It provides enough context to act or navigate, while detailed schedule and Resource manipulation remain in their owning workspaces.

### 4.5 Zone D: Capability & Stewardship

Provides the Resource, financial, documentary, decision, and governance evidence required to sustain delivery. Information appears only when it supports a Project decision or action.

### 4.6 Zone E: Activity, Collaboration & Assistance

Supports understanding of meaningful change, human coordination, and explainable AI assistance. It does not become an unfiltered event feed or detached chatbot.

### 4.7 Zone priority

- Identity and context precede all Project conclusions.
- A pending decision or critical exception may be the first actionable content after context.
- Health never appears without freshness and evidence status.
- Sections with no relevant authorized content collapse semantically rather than displaying filler.
- Mobile preserves the same semantic order with progressive depth.
- Keyboard and assistive-technology navigation follows the semantic order.

## 5. Project Health Model

### 5.1 Purpose

Project health is a governed assessment of delivery condition and confidence. It is not a decorative status, a manually chosen traffic light, or a simple average of metrics.

### 5.2 Health dimensions

| Dimension                 | Question                                                                             | Canonical evidence                                                           |
| ------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Outcome & Scope           | Is the intended outcome still clear, valuable, and achievable within accepted scope? | Project outcomes, approved scope/change decisions, acceptance evidence       |
| Schedule                  | Is the current forecast credible relative to milestones and Baseline?                | Planning forecast, Baseline, variance, float, critical path, constraints     |
| Delivery Flow             | Is work progressing with manageable blockage and rework?                             | Execution state, blocked work, evidence, review flow                         |
| Risk & Issues             | Is exposure understood, owned, and within accepted tolerance?                        | Project RAID, mitigations, issue resolution, accepted risk                   |
| Resources                 | Is required capability available and sustainable for the forecast period?            | Assignments, demand, authorized capacity/availability signals                |
| Financial                 | Is financial performance within approved tolerance?                                  | Governed budget, commitment, actual, forecast, variance when enabled         |
| Decisions & Governance    | Are material decisions timely, owned, evidenced, and compliant?                      | Decision records, approvals, overdue decisions, governance requirements      |
| Confidence & Data Quality | How reliable, complete, and fresh is the assessment?                                 | Freshness, source completeness, contradictory evidence, confidence rationale |

### 5.3 Health states

Each dimension and the overall assessment use semantic states:

- **On Track:** evidence supports delivery within current approved tolerance; no material intervention required.
- **Watch:** credible early signal or narrowing tolerance requires active observation or preparation.
- **At Risk:** material variance or exposure threatens an approved outcome and requires action or decision.
- **Critical:** outcome failure, major breach, or immediate consequential decision is likely or occurring without intervention.
- **Unknown:** evidence is absent, stale, contradictory, or insufficient for a defensible assessment.
- **Not Applicable:** dimension is explicitly outside the Project’s configured scope, not merely missing.

Health semantics must not rely on color alone.

### 5.4 Overall health

Overall health is a governed synthesis, not a mathematical average. It considers:

- outcome materiality;
- severity and propagation of dimension-level conditions;
- decision deadline;
- accepted tolerance;
- confidence and evidence quality;
- unresolved disagreement;
- recovery path.

A Critical dimension cannot be averaged into On Track. Unknown evidence cannot be interpreted as healthy. The overall assessment includes a concise rationale and the dimensions driving it.

### 5.5 System evidence and accountable assessment

The system may calculate indicators and propose an evidence-based health state. An accountable human may publish or amend the Project assessment when authorized, but must provide rationale when it differs materially from current indicators.

The workspace preserves:

- calculated indicators;
- published assessment;
- author and timestamp;
- rationale and evidence;
- dissent or review request;
- previous assessment and reason for change.

### 5.6 Health change

Health change is reported causally:

```text
Source change
  -> affected dimension
    -> consequence to outcome or tolerance
      -> changed health/confidence
        -> action or decision required
```

The workspace never reports “health changed” without explaining the evidence and accountable assessment.

### 5.7 Health permissions

- Authorized participants may inspect source evidence.
- Only approved roles may publish Project health.
- Reviewers may challenge or request clarification without overwriting the published assessment.
- Financial, Resource, or sensitive risk evidence may be summarized when detail permission is absent.
- AI may recommend or explain health but cannot publish it autonomously.

## 6. Project Summary

### 6.1 Purpose

Project Summary provides the minimum shared understanding required before a participant acts. It is an orientation and decision context, not a miniature dashboard.

### 6.2 Summary content

The summary may include:

- outcome and current success definition;
- lifecycle state and current phase;
- overall health, confidence, freshness, and rationale;
- Project Manager, sponsor, business owner, and delivery lead;
- Portfolio/Program alignment;
- approved Baseline dates and current forecast, explicitly distinguished;
- progress statement grounded in evidence rather than one percentage alone;
- next major milestone or decision;
- highest material exposure;
- current decision or action required;
- last meaningful change.

### 6.3 Progress statement

Progress is not represented by task completion alone. A Project progress statement may combine:

- delivered outcomes or accepted increments;
- milestone evidence;
- work completion appropriate to the plan;
- forecast and remaining uncertainty;
- quality and acceptance state;
- unresolved scope or decision conditions.

Any numeric percentage identifies its definition and source. Competing progress definitions are not blended silently.

### 6.4 Summary actions

Summary supports only actions that follow from its evidence:

- inspect health rationale;
- review material change;
- open next decision;
- view milestone source in Planning;
- request or publish a Project update;
- edit Project identity or ownership when authorized;
- copy a canonical Project context link.

### 6.5 Freshness and partial data

The summary exposes last verified times for material source groups. If Planning, RAID, Resources, financials, or evidence is missing or stale, the summary identifies the limitation and suppresses unsupported conclusions. Missing financial configuration is not presented as zero spend.

## 7. Timeline & Milestone Section

### 7.1 Purpose

Give participants a concise understanding of major phases, milestones, forecast movement, decision gates, and near-term schedule consequence.

### 7.2 Content

- approved Baseline and current forecast at milestone resolution;
- current phase and next significant milestones;
- completed milestones with acceptance evidence where applicable;
- overdue, forecast-moved, or confidence-changed milestones;
- major decision gates and external dependencies;
- critical or near-critical context when calculated and material;
- material constraints and assumptions;
- freshness and calculation status.

### 7.3 Boundary with Planning

Project Workspace does not provide detailed Gantt authoring, WBS editing, dependency creation, duration editing, Baseline mutation, Scenario comparison, or critical-path manipulation.

It may support:

- selecting a milestone;
- inspecting a concise milestone explanation;
- linking to associated risk, issue, decision, evidence, or owner;
- acknowledging or requesting review;
- opening Planning with Project, Plan, milestone, date range, and return context preserved.

### 7.4 Milestone state

Each milestone distinguishes:

- Baseline date;
- current forecast date;
- actual completion date when completed;
- confidence and evidence status;
- owner;
- decision or dependency blockers;
- variance and reason;
- source Plan and calculation timestamp.

### 7.5 Timeline range

The default range centers on the current phase, recent meaningful change, and next significant milestones. Users may select approved horizons. A long Project is not compressed into an unreadable all-time view by default.

### 7.6 Actions

- Open milestone in Planning.
- Open linked decision, risk, issue, or evidence.
- Request an update or decision from the accountable owner.
- Follow the milestone.
- Create a Project-level issue or risk from new evidence, without editing the schedule directly.

## 8. Task Progress Section

### 8.1 Purpose

Explain whether delivery work is flowing and where intervention is needed. This section is not a duplicate task list and does not replace Home’s personal My Work queue.

### 8.2 Content model

Task Progress may include:

- work distribution by governed execution state;
- blocked and aging work;
- work awaiting review, decision, evidence, or external input;
- completed work with acceptance status;
- current phase or iteration focus;
- summary progress by outcome or WBS branch;
- rework or reopened work where meaningful;
- unowned or ambiguous work;
- work whose execution state conflicts with Plan assumptions.

### 8.3 Priority model

Display exception and flow before totals:

1. blocked work affecting outcome or milestone;
2. work awaiting a decision or review;
3. overdue or forecast-relevant work;
4. unowned or evidence-deficient work;
5. current focus;
6. aggregate completion context.

### 8.4 Boundary with Home and Planning

- Home owns personal cross-Project obligations.
- Project Workspace owns Project-level coordination and flow.
- Planning owns creation and structural scheduling of tasks, summary tasks, and milestones.
- Execution updates allowed by Project task workflows do not silently change schedule logic.

### 8.5 Actions

- Open filtered Project delivery work.
- Open a task and its evidence.
- Update permitted execution fields.
- request review, decision, or evidence.
- surface a blocker as an Issue or Risk.
- open the corresponding Planning object.
- identify work lacking owner or acceptance criteria.

### 8.6 Aggregate integrity

Filtered or hidden work remains included in aggregate definitions unless the aggregation explicitly states otherwise. Summary tasks and milestones are not counted as ordinary executable tasks unless the metric definition permits it.

## 9. Risks & Issues

### 9.1 Purpose

Enable active exposure management: identify, assess, own, decide, mitigate, escalate, and learn. The section does not exist to display RAID counts.

### 9.2 Risk model

Risks communicate:

- uncertain event or condition;
- cause and potential consequence;
- likelihood and impact using governed definitions;
- exposure and tolerance;
- owner;
- response strategy and actions;
- trigger or early warning;
- affected outcome, milestone, dependency, Resource, or financial context;
- review date;
- residual risk and acceptance authority;
- evidence and freshness.

### 9.3 Issue model

Issues communicate:

- current problem or realized risk;
- consequence and affected scope;
- severity and urgency;
- owner and accountable resolver;
- containment and resolution actions;
- decision or escalation need;
- linked work, milestone, Resource, document, or evidence;
- target resolution and current state;
- closure evidence and residual effect.

### 9.4 Section behavior

- Lead with material unowned, overdue, escalated, or worsening exposure.
- Group related risks and issues without merging their identity.
- Show trend and response effectiveness, not only current score.
- Distinguish accepted risk from resolved risk.
- Preserve assumptions and dependencies in the broader RAID capability while this section focuses on action-relevant risks and issues.
- Unknown or stale assessment is visible.

### 9.5 Actions

- Create Risk or Issue from current Project context.
- update assessment, owner, response, or evidence when authorized.
- link affected milestone, task, dependency, Resource demand, decision, or document.
- convert a realized Risk into or link it to an Issue without deleting history.
- request decision or accept residual risk through the authorized workflow.
- escalate to Program or Portfolio with source context.
- resolve only with required evidence and residual-state handling.

### 9.6 Boundary

Planning dependency validation remains in Planning. Portfolio-level risk aggregation remains in Portfolio. Intelligence may analyze exposure but cannot close or accept a Risk.

## 10. Resource Summary

### 10.1 Purpose

Explain whether the Project has the capability and sustainable capacity needed for its forecast, and route Resource decisions to the correct workspace.

### 10.2 Content

The Resource Summary may include:

- committed Project team and roles;
- unfilled or proposed demand;
- assignment coverage for upcoming work;
- time-phased overload or availability concern at an authorized summary level;
- critical skills and concentration risk;
- upcoming availability change affecting commitments;
- assignment conflicts requiring negotiation;
- Resource data freshness and confidence;
- pending staffing requests or decisions.

### 10.3 Privacy and dignity

- Show only information required for the Project decision.
- Do not expose private availability reasons, cost, performance, or sensitive profile information without explicit permission and purpose.
- Do not rank people by utilization, inferred productivity, or AI suitability score.
- Distinguish nominal capacity from sustainable and currently available capacity.
- Explain overload through contributing commitments, not blame.

### 10.4 Boundary with Resources

Project Workspace may inspect Project-centered assignments and demand. It does not edit Resource profiles, skills, capacity policies, availability overrides, Calendar assignments, or organization-wide staffing scenarios.

Detailed capacity analysis, Resource comparison, assignment negotiation, and scenarios open Resources with Project, demand, date range, affected commitments, and return context preserved.

### 10.5 Actions

- Open Resource or assignment in Resources.
- Create or update Project demand where the owning workflow permits.
- Request staffing review or assignment decision.
- Open affected work or milestone.
- Create a non-destructive Resource Scenario.
- raise a Risk or Issue from a capability constraint.
- follow a pending assignment request.

## 11. Financial Summary (Future-Ready)

### 11.1 Purpose

Reserve a governed Project financial decision context without inventing calculations or exposing information before the financial domain and permissions are approved.

### 11.2 Future information model

When enabled, Financial Summary may include:

- approved budget and approved changes;
- committed cost;
- actual cost;
- forecast at completion;
- variance and tolerance;
- contingency and drawdown where governed;
- benefit or value evidence where owned by the Project;
- cost data freshness, currency, period, and source;
- financial decision or approval required;
- confidence and unresolved assumptions.

### 11.3 Semantic rules

- Budget, commitment, actual, forecast, estimate, and benefit remain distinct.
- Values state currency, period, and applicable tax or accounting basis where material.
- Missing data is Unknown or Not Configured, never zero.
- Summary values link to their governed source and definition.
- Manual narrative cannot overwrite source financial measures.
- Access is purpose- and role-restricted.

### 11.4 Future actions

- Inspect variance drivers.
- Open financial analysis or source record.
- prepare change or funding decision.
- request review or evidence.
- link financial exposure to Risk, Issue, milestone, or decision.

### 11.5 Current behavior before enablement

If no approved financial capability exists, the section is absent for ordinary users. Authorized configuration owners may receive a clear Not Configured state. Placeholder zeros, fabricated sample values, and generic “coming soon” content are prohibited in operational Project Workspace.

## 12. Activity Timeline

### 12.1 Purpose

Explain meaningful Project change, responsibility, and consequence over time. Activity is an evidence and investigation tool, not an engagement feed.

### 12.2 Included activity

- Project lifecycle and ownership change;
- published health or confidence change;
- approved Baseline or material forecast change;
- milestone completion or material movement;
- material Risk or Issue change;
- decision request, outcome, or accepted risk;
- significant scope change;
- assignment or capacity change affecting commitments;
- document approval or evidence publication;
- governance or permission change affecting Project operation;
- AI-proposed and human-approved consequential change;
- integration event with material Project effect.

Routine field saves, automated recalculations without material consequence, view changes, and presence are excluded from the default timeline.

### 12.3 Causal grouping

Related events form one causal group:

```text
Change or decision
  -> affected objects
    -> consequence
      -> actor/authority
        -> evidence and resulting action
```

Users can expand a group into its permitted audit detail.

### 12.4 Timeline filters

Filter by date, event class, object type, actor, decision, milestone, or materiality. Filters affect presentation only. Audit retention and source history remain governed elsewhere.

### 12.5 Actions

- Open the canonical changed object.
- compare before and after where authorized.
- inspect reason, approval, evidence, or AI participation.
- follow or share a contextual link.
- raise a question or review request.

### 12.6 Boundary

Activity Timeline is not the complete security audit log. Administrative and forensic audit remains in Administration with additional permission and retention controls.

## 13. Documents & Decisions

### 13.1 Purpose

Connect durable knowledge and explicit decisions to delivery context so participants do not reconstruct rationale from chat, meetings, or unrelated repositories.

### 13.2 Document model

Project Workspace may reference or govern, according to approved document capabilities:

- Project charter or mandate;
- scope and outcome definition;
- architecture or design evidence;
- plans and review packs;
- requirements and acceptance evidence;
- meeting outcomes;
- reports and external evidence;
- approved change records;
- linked documents in governed external repositories.

Each document reference includes owner, source system, audience, status, version or freshness, relationship to Project work, and access behavior.

### 13.3 Decision model

Each durable decision includes:

- decision question;
- accountable decision-maker;
- decision type and authority basis;
- options and trade-offs;
- recommendation status;
- source evidence;
- affected outcomes, milestones, work, risks, Resources, or financials;
- deadline;
- outcome, reason, dissent, and residual risk;
- resulting actions and verification;
- history and approvals.

### 13.4 Section behavior

- Prioritize pending and recently consequential decisions.
- Surface required or stale key documents only when they affect action or confidence.
- Distinguish draft, reviewed, approved, superseded, archived, and external source states.
- Preserve links between a decision, its evidence, and resulting actions.
- Do not treat a comment or meeting transcript as an approved decision automatically.

### 13.5 Actions

- Open or link a document.
- request review or approval.
- create a decision request from current evidence.
- record an authorized decision.
- link a decision to Risk, Issue, milestone, task, Resource demand, or change.
- mark a document superseded without destroying history.
- ask AI to prepare a brief or extract candidate decisions for human review.

## 14. AI Assistant Behaviour

### 14.1 AI role

AI reduces Project reconstruction and decision-preparation effort. It may retrieve, synthesize, explain, compare, challenge, and draft within declared authorized context.

AI is not the Project Manager, sponsor, decision-maker, Risk owner, Resource Manager, financial authority, or source of canonical health.

### 14.2 Approved AI jobs

- Produce a cited Project orientation brief.
- Explain overall or dimension-level health and evidence gaps.
- Summarize material change since a selected comparison point.
- Identify contradictory status, stale evidence, missing owner, or unclosed decision.
- Trace a milestone or delivery concern to Planning, RAID, Resource, document, or decision sources.
- Draft a Project update from current evidence.
- Prepare a meeting brief and candidate agenda focused on unresolved decisions.
- Extract candidate actions or decisions from reviewed notes or transcripts.
- Compare current forecast with Baseline and explain major drivers.
- Identify likely Risk or Issue signals for human assessment.
- Prepare a decision brief with options and known trade-offs.
- Explain Resource pressure without ranking people.
- Translate a question into Project search, filter, or Intelligence analysis.
- Propose updates as a reviewable change set.

### 14.3 Recommendation contract

Every consequential AI recommendation states:

- declared organization and Project scope;
- question or objective;
- sources and freshness;
- fact, calculation, inference, forecast, and recommendation distinctions;
- important uncertainty and contradictory evidence;
- affected objects and outcomes;
- proposed action and accountable human owner;
- why the recommendation is timely;
- how to inspect, correct, reject, or request alternatives.

### 14.4 AI proposed changes

AI changes remain drafts or proposed change sets. They identify current and proposed state, rationale, sources, validation, consequence, and required approval. Users may accept, edit, or reject individual changes.

### 14.5 Prohibited autonomy

AI cannot autonomously:

- publish Project health or status;
- change Project outcome, scope, ownership, lifecycle, or commitment;
- close or accept Risk;
- resolve Issue without evidence;
- make or record a business decision as approved;
- alter Plan, Baseline, dependency, or milestone dates;
- assign people or change Resource availability;
- change budget or financial forecast;
- grant access;
- send external communication;
- hide dissent, uncertainty, or stale data.

### 14.6 Proactive AI

AI may proactively surface an insight only when it is material, novel, evidence-supported, within the user’s responsibility, timely, and actionable. Low-confidence or speculative insights remain available on request and do not interrupt.

### 14.7 AI failure

Project Workspace remains fully operable without AI. If synthesis fails, deterministic source summaries, decisions, RAID, navigation, search, and actions remain available. Failed AI output cannot alter Project health or source state.

## 15. Quick Actions

### 15.1 Purpose

Quick actions accelerate common, well-understood Project workflows. They are permission-aware commands, not generic creation buttons.

### 15.2 Action catalogue

| Action                          | Primary users                   | Result                                                               |
| ------------------------------- | ------------------------------- | -------------------------------------------------------------------- |
| Resume current delivery context | All                             | Opens canonical work or saved Project context                        |
| Open Planning                   | PM, Planner, reviewer           | Preserves Project, Plan relationship, date range, and return context |
| Open Resource context           | PM, Resource Manager            | Preserves Project demand, assignment, or affected commitment         |
| Create Risk                     | Authorized Project participants | Opens Project Risk workflow with current context                     |
| Create Issue                    | Authorized Project participants | Opens Project Issue workflow with source context                     |
| Request decision                | Authorized participants         | Creates a draft decision request with evidence links                 |
| Publish Project update          | Project Manager or delegate     | Opens evidence-backed review and publication workflow                |
| Request status/evidence         | Project Manager, reviewer       | Sends contextual request through owning workflow                     |
| Add or link document            | Authorized participants         | Opens document/evidence linking workflow                             |
| Review material change          | Authorized participants         | Opens causal comparison or Intelligence analysis                     |
| Share Project context           | Authorized participants         | Creates canonical or saved-context link                              |
| Follow Project or object        | Authorized participants         | Updates personal attention preference                                |

### 15.3 Action ranking

Quick actions rank by current selection, direct obligation, material exception, permission, and role responsibility. They do not reorder unpredictably based on engagement.

### 15.4 Safety

- Creating scheduled tasks, milestones, or dependencies routes to Planning.
- Resource assignment negotiation routes to Resources.
- Consequential decisions open a review context.
- Destructive, bulk, Baseline, staffing, financial, access, and risk-acceptance actions are not condensed into a one-step Project quick action.
- Successful actions reconcile from canonical source state.

## 16. Navigation to Related Workspaces

### 16.1 Navigation map

```text
Home
  -> Project Workspace
       ├── Planning
       ├── Resources
       ├── Portfolio
       ├── Intelligence
       └── Administration when resolving policy/access
```

### 16.2 Transition contracts

| Destination    | Trigger                                                               | Context preserved                                             |
| -------------- | --------------------------------------------------------------------- | ------------------------------------------------------------- |
| Home           | Return to personal work or attention                                  | Project, initiating item, responsibility filter, return state |
| Planning       | Milestone, schedule, dependency, forecast, Baseline, or Scenario work | Project, Plan, object, date range, initiating question        |
| Resources      | Demand, assignment, capacity, skill, Calendar, or staffing concern    | Project, Resource/demand, date range, affected commitments    |
| Portfolio      | Program dependency, escalation, outcome, or Portfolio decision        | Project, Program/Portfolio relationship, exposure, decision   |
| Intelligence   | Deeper analysis, comparison, brief, or AI investigation               | Project, sources, filters, time range, question               |
| Administration | Permission, policy, integration, data-quality, or audit problem       | Project/object, administrative reason, return context         |

### 16.3 Transition behavior

- Related-workspace links explain why the destination is appropriate.
- Cross-workspace movement does not duplicate an object or create a parallel edit path.
- Returning restores Project section, filters, selected object, and position where valid.
- Unauthorized destinations are absent or safely unavailable without leaking data.
- If a source object is archived, deleted, or changed during navigation, return behavior explains the new state.

### 16.4 Deep links

Canonical Project routes follow the Information Architecture Blueprint:

```text
/o/{orgKey}/projects/{projectId}
/o/{orgKey}/projects/{projectId}/{capability}
/o/{orgKey}/projects/{projectId}/{capability}/{objectId}
```

Meaningful shareable view state may include approved query parameters or a saved-view identifier. Sensitive filters and private AI prompts are not encoded in links.

## 17. Notifications

### 17.1 Project notification model

Project Workspace emits attention only for direct, material, actionable, or explicitly followed events. Routine activity belongs in Activity Timeline or digest, not interruption.

### 17.2 Notification triggers

- direct request, mention, review, or evidence request;
- Project decision or approval request;
- material health or confidence change;
- milestone or forecast movement crossing threshold;
- significant Risk or Issue change;
- dependency change affecting the Project;
- Resource conflict affecting commitment;
- published Project update;
- required document review or approval;
- lifecycle, ownership, scope, or governance change;
- integration or data-quality problem affecting Project conclusions;
- requested AI work requiring input or review.

### 17.3 Suppressed events

Do not create interruptive notifications for:

- routine field saves;
- ordinary task progress;
- repeated recalculations with no material effect;
- user’s own successful action;
- presence or page views;
- AI observations that do not pass materiality and confidence thresholds.

### 17.4 Grouping

Group by cause, change set, affected outcome, or decision. One Baseline-approved change moving several milestones creates one causal notification with effects, not one notification per object.

### 17.5 Destination and state

Every notification resolves to a canonical Project object, decision, comparison, or related owning workspace with Project and return context preserved. Read, acknowledged, dismissed, and source-resolved states remain distinct.

### 17.6 User control

Users may follow the Project, milestones, Risks, Issues, decisions, documents, or updates. Mandatory direct obligations and critical governance notices cannot be hidden by ordinary watch preferences.

## 18. Search

### 18.1 Project-scoped search

Search within Project Workspace finds authorized:

- Project capabilities and saved contexts;
- tasks, summary work, milestones, and dependencies;
- Risks, Assumptions, Issues, and Project Dependencies;
- decisions and approvals;
- Project team and assignments;
- documents and evidence;
- comments and reviewed meeting outcomes where indexed;
- activity and change records;
- reports and governed metrics;
- related Resource, Program, Portfolio, or external references;
- commands available in current context.

### 18.2 Search intent

Search supports:

- known-item retrieval;
- identifier lookup;
- navigation to a capability;
- relationship questions such as “what affects this milestone?”;
- evidence questions such as “where was this decided?”;
- contextual AI answers with citations.

### 18.3 Ranking

Exact identity, canonical identifier, direct Project relationship, active context, lifecycle relevance, and freshness rank before semantic similarity. AI-derived relevance must be explainable and cannot expose inaccessible information.

### 18.4 Result anatomy

Each result identifies:

- object type and name;
- owning workspace;
- Project relationship and hierarchy path;
- lifecycle or status where relevant;
- source freshness;
- reason for relevance when inferred;
- canonical destination.

### 18.5 Filters

Project search may filter by object type, owner, status, date, milestone, WBS branch, RAID class, decision state, document state, activity type, and source workspace. Filters remain visible and shareable only when policy permits.

### 18.6 Search continuity

Opening a result preserves query, filters, initiating question, and return position. Opening a Planning, Resource, Portfolio, or Intelligence result preserves Project context and explicitly changes workspace.

## 19. Personalisation

### 19.1 Permitted personalization

Users may:

- select a default Project section appropriate to permission;
- reorder or collapse optional secondary sections within governed zones;
- choose approved time horizons and comparison points;
- save Project views and filters;
- follow Project objects;
- set Activity Timeline filters;
- choose summary depth within role-appropriate limits;
- configure digest and notification preferences;
- apply accessibility, locale, density, and time-zone preferences;
- reset to role defaults.

### 19.2 Prohibited personalization

Users may not:

- hide direct decisions, critical obligations, or mandatory governance notices;
- redefine Project health, progress, financial, schedule, Risk, or Resource semantics;
- suppress freshness, confidence, or Unknown state;
- create parallel manual Project status fields;
- expose sensitive Resource or financial information;
- make a personal view the organization default without governance;
- give AI broader source or action authority;
- change canonical ownership through layout preferences.

### 19.3 Role adaptation

- Team Members default toward delivery context, blockers, relevant milestones, and decisions.
- Project Managers default toward health, change, decisions, delivery flow, RAID, and stewardship.
- Program Managers default toward outcome, milestones, dependencies, exposure, and escalation.
- Resource Managers default toward demand, assignments, capability constraint, and affected commitments.
- Executives default toward outcome, health rationale, material change, milestones, exposure, and decisions.

All adaptations use the same source truth and remain inspectable.

### 19.4 Shared views

Shared Project views require a name, owner, audience, filter definition, time behavior, included sections, permission evaluation, and version behavior. A shared view cannot bypass source permission or replace the canonical Project route.

## 20. Performance Expectations

Performance is part of Project command quality. Project Workspace must become useful before every optional source or AI synthesis completes.

### 20.1 Loading sequence

1. authenticated shell, organization, Project identity, permissions;
2. health source status, direct decisions, and material exceptions;
3. Project summary, milestone and delivery evidence;
4. RAID and documents/decisions;
5. Resource and future financial summaries;
6. Activity Timeline;
7. optional AI synthesis.

### 20.2 Experience targets

| Experience                                  | Target                                                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Project identity and usable workspace shell | Within 1 second at p75 and 2 seconds at p95 under supported desktop conditions             |
| First meaningful Project content            | Within 2 seconds at p75 and 4 seconds at p95                                               |
| Direct action acknowledgement               | Within 100 milliseconds, followed by unambiguous progress or durable result                |
| Section navigation with loaded data         | Meaningful response within 300 milliseconds                                                |
| Project-scoped search initial results       | Within 1 second at p75                                                                     |
| Cross-workspace transition                  | Begins immediately; meaningful destination within 2 seconds at p75 under normal conditions |
| Activity Timeline initial meaningful events | Within 2 seconds at p75, progressively loaded                                              |
| Health explanation                          | Deterministic source evidence available without waiting for AI                             |
| AI assistance                               | Progress feedback within 1 second; never blocks canonical Project use                      |

### 20.3 Scale expectations

Project Workspace must not load every task, event, document, Resource, or schedule object to produce initial orientation. Summaries use governed read models and progressively retrieve detail.

It must remain stable for Projects with:

- large task and milestone sets handled through scoped summaries and specialist Planning views;
- extensive RAID history;
- large team and stakeholder groups;
- long Activity Timeline history;
- numerous documents and evidence relationships;
- multiple Program, Portfolio, integration, and Resource relationships.

### 20.4 Stability

- Progressive loading does not reorder high-priority content unexpectedly.
- Source updates identify what changed before replacing a user’s current context.
- User drafts and filters survive safe refresh.
- One failed source degrades its section, not the full workspace.
- Stale data is not presented as current.
- A permission change removes inaccessible cached content promptly.
- AI and optional financial capability failures do not block Project operations.

### 20.5 Accessibility performance

Logical focus, heading, table, and relationship structures remain available with progressive or virtualized content. Assistive-technology users receive meaningful loading and update announcements without being flooded by routine changes.

## 21. Success Metrics

### 21.1 Outcome metrics

| Metric                        | Definition                                                                                              | Desired direction                                |
| ----------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Time to Project understanding | Time to correctly identify outcome, condition, material change, and next action                         | Decrease                                         |
| Next-action success           | Sessions leading to appropriate action, decision, investigation, or justified no-action                 | Increase                                         |
| Health comprehension          | Participants correctly explain health drivers, confidence, and evidence                                 | Increase                                         |
| Decision readiness            | Project decisions with complete owner, options, evidence, consequence, and deadline                     | Increase                                         |
| Decision latency              | Time from decision-ready to governed outcome                                                            | Decrease without increased reversal              |
| Surprise variance             | Material schedule, Risk, Resource, or financial variance discovered after effective intervention window | Decrease                                         |
| RAID ownership quality        | Material Risks and Issues with current owner, response, review, and evidence                            | Increase                                         |
| Context transition success    | Users reach Planning, Resources, Portfolio, or Intelligence without reconstructing Project scope        | Increase                                         |
| Duplicate status effort       | Time spent recreating Project status already derivable from source evidence                             | Decrease                                         |
| Evidence traceability         | Material Project conclusions linked to inspectable sources                                              | Increase                                         |
| Notification precision        | Project notifications that are material and appropriately actionable                                    | Increase                                         |
| AI recommendation quality     | Accepted recommendations remain supported and avoid later correction                                    | Increase with rejection and correction monitored |

### 21.2 Guardrail metrics

- False On Track rate.
- Unknown or stale evidence presented as healthy.
- Unauthorized Project, Resource, financial, or document exposure.
- Schedule mutation initiated outside Planning authority.
- Resource mutation initiated outside Resources authority.
- Decision or Risk acceptance without correct authority.
- Cross-organization or wrong-Project context rate.
- Silent concurrent overwrite.
- Notification volume per resolved material event.
- Accessibility task-completion parity.
- Performance by Project scale, role, and device.
- AI unsupported claim, stale-source use, and unreviewed-action rate.

### 21.3 Metrics not approved as primary success measures

- Time spent in Project Workspace.
- Number of sections viewed.
- Total activity events.
- Task update volume per person.
- Notification opens alone.
- AI prompt or generated-summary volume.
- Percentage of all possible data displayed.
- Individual utilization or presence.

### 21.4 Evaluation

Evaluate through scenario-based usability testing, role and permission testing, accessibility testing, longitudinal Project observation, production telemetry under privacy governance, decision and audit sampling, and cross-workspace journey testing.

## 22. Extensibility

### 22.1 Approved future areas

- Financial and commercial Project governance.
- Customer, partner, vendor, and restricted guest participation.
- Benefits realization and strategic outcome evidence.
- Change-request and scope-control workflows.
- Quality, acceptance, and compliance evidence.
- Procurement and external dependency context.
- Advanced Project confidence and probabilistic forecasting.
- Organization-approved Project extensions.
- Additional document repositories and collaboration sources.
- Mobile capture, review, and bounded decision workflows.
- Governed AI Project skills and agents.

### 22.2 Adding a section

A new Project Workspace section must:

1. support a recurring Project decision or action;
2. have a canonical source and accountable owner;
3. not duplicate Home, Planning, Resources, Portfolio, Intelligence, or Administration;
4. define summary and deep-link behavior;
5. define permission, freshness, partial, empty, loading, and error states;
6. define search, notification, personalization, performance, and mobile behavior;
7. preserve Project and return context;
8. include a success measure and retirement condition.

### 22.3 Extension fields and objects

Organization-defined Project fields or object types require semantic definition, domain owner, validation, lifecycle, permission, search, audit, reporting, AI, migration, and deprecation behavior. Extensions cannot override core Project identity, health semantics, schedule authority, Resource authority, or decision governance.

### 22.4 Integration extensions

External systems may contribute evidence, documents, execution state, financial data, or proposed changes through approved integration contracts. Source, freshness, mapping, conflict, authorization, and failure remain visible. An integration does not become canonical merely because it appears in Project Workspace.

### 22.5 AI extensions

An AI Project skill declares source scope, allowed output types, proposed actions, evaluation criteria, authority limits, approval points, audit behavior, and deterministic fallback. It cannot gain Project authority through a different invocation surface.

### 22.6 Governance

Material changes to Project health semantics, workspace ownership, Planning or Resource boundaries, financial authority, external access, or AI autonomy require architecture review before this specification is extended.

## Approval Recommendation

**Recommendation: APPROVE THE PROJECT WORKSPACE SPECIFICATION.**

Approval establishes:

- Project Workspace as the operational command center for one Project;
- one shared Project truth adapted by role and permission;
- the five-zone Project architecture;
- an evidence-backed multidimensional health model;
- decision-oriented Project Summary, milestone, task-flow, RAID, Resource, financial, activity, document, and decision behavior;
- strict boundaries with Home, Planning, Resources, Portfolio, Intelligence, and Administration;
- explainable and reviewable AI assistance;
- governed quick actions, notifications, search, personalization, performance, and extensibility;
- preservation of Project context across all related-workspace transitions.

On approval, this document becomes authoritative and `PROJECT_WORKSPACE.md` becomes a legacy historical architecture reference. Approval authorizes detailed interaction design, delivery decomposition, acceptance criteria, and frontend implementation planning consistent with this specification. It does not authorize UI styling, backend changes outside engineering governance, autonomous AI action, detailed schedule manipulation outside Planning, or Resource administration outside Resources.

## References

- [RP-001: Personas and Jobs-to-be-Done](../research/RP-001_PERSONAS_AND_JOBS_TO_BE_DONE.md)
- [RP-002: Modern Product Benchmark](../research/RP-002_MODERN_PRODUCT_BENCHMARK.md)
- [UX-ADR-001: Workspace-First Architecture](../architecture/UX-ADR-001_WORKSPACE_FIRST_ARCHITECTURE.md)
- [Information Architecture Blueprint](../architecture/INFORMATION_ARCHITECTURE_BLUEPRINT.md)
- [Home Workspace](HOME_WORKSPACE.md)
- [Planning Workspace](PLANNING_WORKSPACE.md)
- [Resource Workspace](RESOURCE_WORKSPACE.md)
- [Legacy Project Workspace Architecture](PROJECT_WORKSPACE.md)
