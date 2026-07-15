# RP-001: Personas and Jobs-to-Be-Done

| Field           | Value                                                                    |
| --------------- | ------------------------------------------------------------------------ |
| Initiative      | PM Platform Product UX Evolution                                         |
| Research paper  | RP-001                                                                   |
| Status          | Proposed research baseline                                               |
| Scope           | Personas, jobs-to-be-done, cross-persona workflows, and AI participation |
| Product context | AI-native Enterprise Project Execution Platform                          |
| Research type   | Secondary research, product-context synthesis, and testable hypotheses   |
| Exclusions      | Screen design, wireframes, visual language, and component specification  |

## 1. Executive Summary

Enterprise project software typically organizes work around records, modules, and reporting hierarchies. Users organize their work around a different question: **what must I understand, decide, coordinate, or complete next to keep delivery moving?** The PM Platform should make that question its primary unit of experience.

This paper defines seven first-class participants: Engineer or Team Member, Project Manager, Program Manager, Technical or Resource Manager, Executive, System Administrator, and AI Assistant. They do not need seven isolated products. They need a shared execution system that preserves one governed truth while adapting context, depth, cadence, and authority to each participant.

Five findings should govern future UX decisions:

1. **The primary product object is a decision in context, not a dashboard.** Workspaces and summaries are useful only when they connect evidence, commitments, dependencies, risks, owners, and the next safe action.
2. **Trust is an operational capability.** Data freshness, provenance, uncertainty, permissions, and change history must travel with consequential information. A polished answer without traceable evidence is not enterprise-grade decision support.
3. **Coordination load is the hidden tax.** Users spend disproportionate effort reconstructing status, translating between levels, chasing updates, and reconciling contradictory artifacts. The platform should reduce this work before adding more places to enter data.
4. **AI should compress and connect work before it creates or changes work.** Summarization, retrieval, anomaly detection, scenario framing, and draft preparation are high-value starting points. Commitments, baselines, staffing changes, access grants, destructive actions, and external communications require explicit accountable human control.
5. **One truth does not mean one view.** Each persona needs different resolution, time horizon, and interruption policy. Adaptation must be explainable and user-controlled, never a silent filter bubble.

The AI Assistant is modeled as a participant but not as an accountable persona. It can observe authorized context, prepare evidence, propose actions, and execute bounded reversible actions. It cannot own outcomes, accept organizational risk, manufacture certainty, or become the unrecorded channel through which governance is bypassed.

This is an authoritative **research baseline**, not a claim of completed field research. Persona statements are hypotheses derived from the product architecture, enterprise delivery practice, and benchmark principles. They require validation with representative users before detailed interaction architecture is approved.

## 2. Research Objectives

This research establishes a durable foundation for Product UX Evolution by answering:

- What progress is each participant trying to make, independent of current software categories?
- Which decisions create delivery value, and what evidence makes those decisions safe?
- Where do handoffs, translation, interruption, and status reconstruction create avoidable effort?
- Which needs are universal, and which genuinely differ by role, authority, cadence, or context?
- Where can AI reduce cognitive and coordination load without weakening accountability?
- Which activities must remain human-led because they create commitments, allocate scarce resources, affect people, or carry material risk?
- What principles should guide future workspace, navigation, search, notification, automation, and adaptive-experience decisions?

The research does not define screens or presume that every need requires a new feature. Its purpose is to create testable product principles and evaluation criteria.

## 3. Methodology

### 3.1 Approach

The study combines four inputs:

1. **Repository-grounded domain review.** Existing PM Platform vision, architecture, roadmap, security, scheduling, project workspace, reporting, and Enterprise Resource Management documentation were reviewed to avoid inventing capabilities or violating bounded contexts.
2. **Jobs-to-be-Done framing.** Personas are described by the progress they seek in recurring situations, including functional, emotional, collaborative, and decision jobs.
3. **Workflow and decision analysis.** Each role is examined across daily, weekly, and monthly cadences, including information consumed, information produced, handoffs, failure modes, and authority boundaries.
4. **Benchmark-principle synthesis.** Principles were extracted from modern collaborative, developer, enterprise, and AI products without copying interface patterns.

### 3.2 Benchmark evidence

The benchmark synthesis supports these principles:

- Apple advises designers of machine-learning experiences to anticipate mistakes, support correction, communicate limitations and attribution, and calibrate proactive behavior to consequence and confidence ([Apple Human Interface Guidelines: Machine learning](https://developer.apple.com/design/human-interface-guidelines/machine-learning)).
- Microsoft’s evidence-based human-AI guidance spans initial expectations, interaction, error recovery, and learning over time; the underlying study validated 18 guidelines through practitioner evaluation ([Microsoft HAX Toolkit](https://www.microsoft.com/en-us/haxtoolkit/ai-guidelines/), [Microsoft Research](https://www.microsoft.com/en-us/research/publication/guidelines-for-human-ai-interaction/)).
- Figma demonstrates that shared, current artifacts reduce version reconciliation and enable collaboration without forcing every participant into the same editing role ([Figma multiplayer collaboration](https://www.figma.com/blog/multiplayer-editing-in-figma/)).
- Linear emphasizes visible direction and a shared understanding of why work matters, allowing independent decisions to remain aligned ([Linear Method: Product direction](https://linear.app/method/product-direction)).
- GitHub Projects shows the value of multiple adaptable views over shared underlying work, typed organizational metadata, and explicit dependency relationships ([GitHub Projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects), [GitHub issue fields](https://docs.github.com/en/issues/planning-and-tracking-with-projects/understanding-fields/about-issue-fields)).
- VS Code demonstrates that expert efficiency and accessibility reinforce one another when commands are discoverable, keyboard-operable, customizable, and consistently navigable ([VS Code accessibility](https://code.visualstudio.com/docs/configure/accessibility/accessibility)).
- Slack exposes the importance of user-controlled interruption policies across device, topic, channel, and time ([Slack notification guidance](https://slack.com/help/articles/201355156-Configure-your-Slack-notifications)).
- Enterprise AI requires administrative visibility, access control, privacy boundaries, and usage governance in addition to model capability ([OpenAI enterprise controls](https://openai.com/index/chatgpt-enterprise-spend-controls/)).

Broader lessons associated with Notion, Asana, Jira, ClickUp, Monday, Smartsheet, Wrike, Power BI, Microsoft Project, ChatGPT, and Claude are treated as hypotheses to validate, not evidence for copying their interfaces.

### 3.3 Evidence levels

| Level | Meaning                                                                   | Permitted use                          |
| ----- | ------------------------------------------------------------------------- | -------------------------------------- |
| E1    | Existing PM Platform architecture, policy, or implemented domain behavior | Constraint or established product fact |
| E2    | First-party benchmark documentation or peer-reviewed human-AI research    | Supporting design principle            |
| H1    | Strong enterprise-work hypothesis requiring user validation               | Research and prototype input           |
| H2    | Exploratory future expectation                                            | Discovery backlog only                 |

Most persona needs below are H1. They should not be converted directly into requirements without primary research.

### 3.4 Limitations

- No interviews, diary studies, contextual inquiries, workflow-shadowing, or usability sessions were conducted for RP-001.
- Job titles vary substantially by organization size, delivery model, geography, regulation, and industry.
- Executives and administrators are heterogeneous groups; authority should be modeled separately from title.
- The current repository is stronger in backend domain architecture than in validated end-user behavior.
- AI capability, cost, regulation, and organizational tolerance will change. AI principles must outlive individual models.

## 4. Persona Profiles

### 4.1 Engineer / Team Member

**Purpose.** Turn intent into dependable outcomes while preserving enough focus to do skilled work.

**Responsibilities.** Understand commitments; clarify acceptance and dependencies; complete work; surface risk early; collaborate on decisions; keep evidence current; protect quality.

**Primary goals.** Know what matters now, why it matters, what is blocked, who can unblock it, and what “done” means. Minimize administrative reconstruction and context switching.

**Success metrics.** Meaningful work completed; quality and rework; predictable flow; blocked time; response time to critical clarification; sustainable workload—not raw activity count.

**Cadence.** Daily work centers on selecting, understanding, executing, and updating the next commitment. Weekly work includes planning, dependency review, demonstration, retrospective learning, and capacity negotiation. Monthly work focuses on outcome progress, recurring friction, skills, workload sustainability, and future commitments.

**Typical decisions.** What to do next; whether work is ready; whether new evidence changes scope; whether to escalate; what can be safely deferred; when quality or capacity is at risk.

**Information consumed.** Intent, acceptance conditions, priority rationale, dependencies, decisions, relevant conversations, technical context, ownership, due constraints, and change history.

**Information produced.** Progress evidence, deliverables, estimates or forecasts, blockers, questions, decisions, risks, reviews, and learning.

**Collaboration patterns.** Dense collaboration with peers and technical leaders; periodic negotiation with project managers; asynchronous review; short synchronous resolution for ambiguity.

**Frustrations and workarounds.** Duplicate status entry, ambiguous priority, notification overload, stale plans, fragmented decisions, meetings used to reconstruct state. Workarounds include private notes, chat reminders, personal task lists, spreadsheets, and manual digests—creating shadow truth.

**Workspace and dashboard needs.** A calm, current working context centered on commitments, blockers, recent changes, and decisions requiring input. The dashboard job is re-entry and orientation, not performance surveillance.

**Search and notifications.** Search begins with an object, phrase, person, or recent context and should preserve relationships. Notifications should be interruptive only for direct requests, imminent material risk, or newly unblocked work; everything else belongs in a digestible review queue.

**Device and input.** Desktop is primary for production and complex reasoning. Mobile supports capture, acknowledgement, concise review, and urgent coordination. Keyboard-driven navigation, universal command access, quick capture, state changes, link copying, and recent-context switching offer high leverage.

**AI and automation.** AI can assemble context, summarize changes, draft updates, detect missing acceptance information, and suggest related evidence. It must not claim completion, alter estimates or commitments, submit consequential work, or evaluate individual performance without explicit human action and review.

**Future expectation.** The system should remember working context across sessions and explain why priorities changed without making the person maintain a second administrative narrative.

### 4.2 Project Manager

**Purpose.** Convert a bounded objective into coordinated, credible delivery.

**Responsibilities.** Establish shared intent; sequence work; manage dependencies, RAID, scope, milestones, resources, stakeholders, and governance; facilitate decisions; maintain forecast credibility.

**Primary goals.** Detect variance early, create timely decisions, preserve alignment, and communicate confidence without manufacturing certainty.

**Success metrics.** Outcome and milestone reliability; decision latency; risk exposure; dependency health; stakeholder confidence; forecast calibration; team sustainability; avoidable rework.

**Cadence.** Daily: triage changes, blockers, dependencies, decisions, and stakeholder requests. Weekly: update forecast, facilitate planning, review RAID and capacity, align stakeholders. Monthly: re-baseline when authorized, evaluate trends, prepare governance, and improve delivery system health.

**Typical decisions.** Escalate or absorb variance; change sequence; request scope, capacity, or date decisions; accept evidence; identify the accountable decision-maker; distinguish signal from normal volatility.

**Information consumed.** Work state, milestones, dependencies, capacity, risks, issues, decisions, changes, quality evidence, financial constraints, and stakeholder expectations.

**Information produced.** Integrated plan, forecast, RAID record, decision requests, meeting outcomes, status narrative, escalation, and change proposals.

**Collaboration patterns.** Acts as translator and connector across delivery, governance, technical, commercial, and executive contexts. Needs asynchronous evidence before synchronous decisions.

**Frustrations and workarounds.** Status-chasing, contradictory tools, false precision, plans detached from execution, manual slide preparation, and weak decision ownership. Workarounds include spreadsheet control rooms, slide decks, meeting notes, and private dependency maps.

**Workspace and dashboard needs.** A project control context organized by deviation, decision, dependency, and confidence—not a wall of generic metrics. It must support movement from outcome to evidence and owner without losing filters or time horizon.

**Search and notifications.** Search is relationship-heavy: “what affects this milestone?”, “where was this decided?”, “which commitments changed?” Notifications should group causal chains and suppress redundant downstream alerts.

**Device and input.** Desktop dominates analysis and planning. Mobile supports approvals, escalation, meeting capture, and executive questions. Keyboard workflows matter for triage, bulk review, linking, and command execution.

**AI and automation.** AI can reconcile updates, draft narratives, identify inconsistencies, suggest risk questions, map dependency impact, prepare meeting briefs, and compare scenarios. It must not approve baselines, commit dates, assign people, close risks, or send sensitive status externally without review.

**Future expectation.** Planning becomes a living model of commitments and evidence, not a document that decays between reporting cycles.

### 4.3 Program Manager

**Purpose.** Coordinate interdependent projects so the combined outcome succeeds, even when local optimization would fail.

**Responsibilities.** Maintain program outcomes, cross-project dependencies, benefits, shared risks, governance, sequencing, and executive decision flow.

**Primary goals.** Reveal systemic constraints, resolve cross-boundary conflicts, and preserve strategic coherence across heterogeneous projects.

**Success metrics.** Benefit realization; critical dependency reliability; cross-project decision latency; aggregate forecast calibration; systemic risk reduction; resource conflict resolution.

**Cadence.** Daily attention is exception-driven. Weekly work integrates project forecasts, dependency changes, resource conflicts, and program decisions. Monthly work tests strategic assumptions, benefits, funding, roadmap coherence, and governance readiness.

**Typical decisions.** Which conflict requires program intervention; where to trade scope, sequence, funding, or capacity; which local plan threatens the program outcome; what executives must decide now.

**Information consumed.** Normalized project evidence, cross-project dependencies, shared resources, program risks, benefits, financials, decisions, and confidence trends.

**Information produced.** Program forecast, integrated roadmap, dependency and decision records, strategic options, escalation narratives, and governance evidence.

**Collaboration patterns.** Brokers decisions among project managers, functional leaders, executives, finance, and governance. Requires comparability without erasing project-specific context.

**Frustrations and workarounds.** Incompatible reporting, status aggregation that hides causality, manual normalization, optimistic roll-ups, and local tools that cannot represent shared constraints. Workarounds are portfolio spreadsheets, presentation layers, and recurring reconciliation forums.

**Workspace and dashboard needs.** A multi-project decision environment that reveals concentration, contagion, and trend. Aggregation must remain drillable to source evidence and clearly distinguish reported fact, derived measure, and forecast.

**Search and notifications.** Searches traverse programs, outcomes, dependencies, resources, and decisions. Notifications should prioritize new systemic impact rather than every local change.

**Device and input.** Desktop for synthesis and scenarios; mobile for executive interaction and approvals. Keyboard support is valuable for portfolio triage and rapid traversal.

**AI and automation.** AI can normalize status, expose conflicting assumptions, identify correlated risks, trace dependency propagation, and generate scenario comparisons. It must not choose portfolio trade-offs, alter funding, or conceal uncertainty behind a single health score.

**Future expectation.** Program control shifts from monthly aggregation to continuously explainable situational awareness.

### 4.4 Technical Manager / Resource Manager

**Purpose.** Ensure scarce capability is sustainable, available, appropriately matched, and developed across competing demand.

**Responsibilities.** Maintain resource truth; understand skills and capacity; negotiate assignments; protect technical quality and team health; develop capability; resolve contention.

**Primary goals.** Put appropriate capability against valuable work without creating hidden overload, single points of failure, or long-term skill erosion.

**Success metrics.** Sustainable utilization; assignment fit; overload and bench duration; critical skill coverage; staffing lead time; continuity risk; development progress; forecast accuracy.

**Cadence.** Daily: resolve staffing exceptions and availability changes. Weekly: review demand, capacity, assignment conflicts, skills, and team health. Monthly: plan capability, hiring or contracting signals, succession, and scenario capacity.

**Typical decisions.** Who can contribute and when; whether an assignment is sustainable; whether to split, delay, contract, hire, or develop; when a local delivery request creates systemic risk.

**Information consumed.** Demand, allocations, calendars, availability, skills, proficiency evidence, role requirements, location constraints, cost visibility where authorized, and team feedback.

**Information produced.** Capacity and availability updates, staffing options, assignment decisions, capability risks, development plans, and constraint explanations.

**Collaboration patterns.** Negotiates with project and program managers while remaining accountable to people, technical systems, and organizational capability. Sensitive people data requires strict purpose limitation.

**Frustrations and workarounds.** Percentages without time context, stale skill inventories, resources treated as interchangeable units, hidden work, and political priority conflicts. Workarounds include private staffing sheets and manager memory, which reduce transparency and resilience.

**Workspace and dashboard needs.** A demand-capability context with calendar-aware capacity, confidence, assignment rationale, and privacy-aware depth. It should expose trade-offs without reducing people to utilization numbers.

**Search and notifications.** Search combines skills, availability, role, time, team, location, and constraints. Notifications should focus on meaningful capacity changes, conflicts, expiring assumptions, and requests requiring negotiation.

**Device and input.** Desktop for allocation and scenario analysis; mobile for availability changes and approvals. Keyboard efficiency matters for filtering, comparison, and review.

**AI and automation.** AI can identify possible matches, explain constraints, detect overload, surface skill concentration, and propose scenarios. It must not autonomously assign people, infer sensitive traits, rank human worth, make employment decisions, or expose private data beyond purpose and permission.

**Future expectation.** Resource planning incorporates skill adjacency, learning goals, uncertainty, and human preferences—not merely nominal capacity.

### 4.5 Executive

**Purpose.** Allocate attention and organizational resources to maximize outcomes while controlling material risk.

**Responsibilities.** Set direction; fund and stop work; resolve cross-organizational trade-offs; sponsor outcomes; govern risk; demand accountable evidence.

**Primary goals.** Know whether strategy is becoming reality, where intervention changes the outcome, and how confident the organization should be.

**Success metrics.** Strategic outcome realization; capital efficiency; forecast quality; time to consequential decision; risk exposure; organizational focus—not volume of green status.

**Cadence.** Daily engagement is event-driven. Weekly work reviews material exceptions and pending decisions. Monthly or quarterly work examines portfolio choices, benefits, investment, systemic constraints, and strategic adaptation.

**Typical decisions.** Continue, stop, accelerate, defer, fund, de-scope, accept risk, change ownership, or remove an organizational constraint.

**Information consumed.** Concise outcome trends, material variance, confidence, options, exposure, decision deadlines, resource concentration, benefits, and source evidence on demand.

**Information produced.** Direction, priorities, trade-offs, risk acceptance, funding decisions, sponsorship, and escalation resolution.

**Collaboration patterns.** Works through accountable leaders but must be able to inspect evidence without triggering a manual reporting exercise.

**Frustrations and workarounds.** Decorative dashboards, lagging indicators, traffic-light optimism, incomparable projects, excessive detail, and presentations detached from live evidence. Workarounds include trusted-person networks and parallel analyst briefs.

**Workspace and dashboard needs.** A decision brief, not an operational cockpit: what changed, why it matters, choices, recommendation, confidence, deadline, owner, and evidence. Details should be progressively available without forcing navigation through project mechanics.

**Search and notifications.** Natural-language and entity search should answer strategic questions with provenance. Interruptions are reserved for material threshold crossings, expiring decisions, or changed assumptions; routine status belongs in scheduled briefs.

**Device and input.** Mobile and tablet are important for briefing, annotation, and approval; desktop supports deeper portfolio review. Keyboard shortcuts are secondary to fast retrieval and reliable continuity across devices.

**AI and automation.** AI can prepare evidence-backed briefs, challenge assumptions, compare scenarios, identify omitted risk, and translate operational data into strategic implications. It must not accept risk, allocate capital, evaluate people covertly, or present generated narrative as verified fact.

**Future expectation.** Every executive summary is interrogable: users can ask why, inspect evidence, and see what would change the conclusion.

### 4.6 System Administrator

**Purpose.** Keep the platform secure, governed, reliable, supportable, and appropriately configured as the organization changes.

**Responsibilities.** Identity and access, configuration, policy, lifecycle operations, audit, integration governance, support, data stewardship, and incident response.

**Primary goals.** Enable legitimate work with minimal friction while preventing unauthorized access, uncontrolled automation, and silent configuration drift.

**Success metrics.** Access correctness; provisioning time; policy compliance; audit completeness; incident rate and recovery; integration health; support resolution; configuration drift.

**Cadence.** Daily: requests, failures, audit events, and integration health. Weekly: access reviews, support patterns, automation failures, and change preparation. Monthly: compliance evidence, role design, lifecycle cleanup, usage and cost review, and resilience testing.

**Typical decisions.** Grant or deny access; choose least-privilege scope; quarantine integration behavior; approve configuration; respond to anomalies; determine whether an issue is user, policy, data, or system-related.

**Information consumed.** Identities, roles, permissions, policies, audit events, integration states, health signals, usage, cost, data classification, and change history.

**Information produced.** Access and configuration changes, audit evidence, incident records, policy exceptions, support knowledge, and governance reports.

**Collaboration patterns.** Coordinates security, IT, legal, compliance, data owners, product owners, and end users. Must separate platform administration from business authority.

**Frustrations and workarounds.** Opaque permission inheritance, one-off exceptions, weak audit context, automation without ownership, and configuration spread across tools. Workarounds include ticket queues, scripts, spreadsheets, and informal administrator knowledge.

**Workspace and dashboard needs.** An exception-oriented operational context with policy impact, before-and-after state, affected users, reversibility, and auditable reason.

**Search and notifications.** Search must support identity, permission, event, configuration, integration, and correlation across time. Alerts require severity, blast radius, evidence, ownership, and deduplication.

**Device and input.** Desktop is required for consequential administration; mobile is appropriate for awareness and narrowly bounded emergency approval. Keyboard and command workflows are valuable but must preserve confirmation and audit controls.

**AI and automation.** AI can explain permissions, correlate events, draft policies, detect anomalies, simulate access impact, and prepare remediation. It must not silently grant privilege, weaken controls, delete audit evidence, or execute high-impact changes without authorization and recoverability.

**Future expectation.** Governance becomes policy-as-explainable-behavior: administrators can understand not only what is configured, but why a person or agent can act.

### 4.7 AI Assistant

**Purpose.** Reduce the effort required to understand, coordinate, decide, and act while preserving human accountability and organizational policy.

**Participant status.** The AI Assistant is first-class in workflow, identity, authorization, attribution, and audit. It is **not** a moral, legal, managerial, or delivery-accountable actor. Every AI action must resolve to a human or policy-defined sponsor and an explicit authority scope.

**Responsibilities.** Maintain authorized context; retrieve and synthesize evidence; expose uncertainty; prepare options; ask for missing information; execute only permitted actions; record sources, transformations, approvals, and outcomes.

**Primary goals.** Improve decision quality and flow without creating hidden work, false certainty, notification noise, or governance bypass.

**Success metrics.** Accepted useful assistance; verified time saved; correction rate; unsupported-claim rate; approval burden; avoided rework; decision latency; policy compliance; user trust calibration. Engagement alone is not success.

**Cadence.** Continuous monitoring should be narrowly scoped and policy-controlled. Daily assistance supports orientation and execution. Weekly assistance synthesizes patterns and prepares reviews. Monthly assistance evaluates trends, stale assumptions, and governance evidence.

**Typical decisions.** The AI may decide how to retrieve, structure, summarize, and rank authorized information within bounded policy. It should escalate when evidence conflicts, confidence is inadequate, authority is unclear, or consequences exceed its action tier.

**Information consumed.** Only authorized project, resource, conversation, document, policy, audit, and user-provided context, with freshness and provenance metadata.

**Information produced.** Summaries, citations, options, drafts, questions, predictions, recommendations, proposed actions, and an audit record distinguishing observation, inference, and execution.

**Collaboration patterns.** Works privately with an individual, transparently in a team context, or on behalf of a governed workflow. It must never imply that private context is shared, or that generated content represents team consensus.

**Failure modes.** Hallucinated status, stale synthesis, authority confusion, automation bias, verbosity, invisible personalization, sensitive inference, prompt injection, and actions whose blast radius exceeds user intent.

**Workspace needs.** The AI requires structured context and explicit task boundaries rather than a separate destination. Users need to see scope, sources, assumptions, proposed changes, required approvals, and the durable record of action.

**Search and notifications.** AI retrieval must be permission-aware and source-preserving. Proactive messages should require materiality, novelty, actionability, and timing tests; otherwise they become a digest or remain silent.

**Automation.** The AI may automate reversible, observable, low-consequence steps under policy. It must request approval for commitments, external publication, people allocation, baseline changes, access changes, destructive operations, material financial actions, and accepted risk.

**Future expectation.** AI becomes a governed coordination layer that can explain the state of execution and prepare safe action across systems, while humans retain intent, judgment, consent, and accountability.

## 5. Jobs To Be Done Analysis

### 5.1 Engineer / Team Member

**Core job story.** When priorities and context change around my work, help me regain an accurate understanding of what matters and why, so I can make dependable progress without spending my attention reconstructing the plan.

- **Functional jobs:** orient; clarify; execute; record evidence; manage blockers; request decisions; protect focus.
- **Emotional jobs:** feel competent rather than monitored; feel safe surfacing uncertainty; trust that completed work will not be invalidated by hidden decisions.
- **Collaboration jobs:** keep others informed with minimal ceremony; obtain timely review; preserve context for the next contributor.
- **Decision jobs:** select next work; judge readiness and done; decide when risk requires escalation.
- **Desired outcomes:** less status duplication, faster clarification, fewer interruptions, earlier blocker resolution, and durable context.
- **Success criteria:** a returning user can identify the next meaningful action and its rationale in minutes; updates generated from evidence remain editable and attributable.

### 5.2 Project Manager

**Core job story.** When delivery evidence changes, help me understand the effect on outcomes and assemble the right decision before variance becomes failure.

- **Functional jobs:** integrate state; forecast; manage RAID and dependencies; prepare governance; coordinate commitments.
- **Emotional jobs:** feel credibly in control without pretending certainty; reduce anxiety caused by invisible risk.
- **Collaboration jobs:** align actors around decisions and ownership; translate between technical and stakeholder contexts.
- **Decision jobs:** choose intervention, escalation, trade-off, and timing.
- **Desired outcomes:** shorter decision latency, less status chasing, calibrated forecasts, fewer surprise dependencies.
- **Success criteria:** every material variance connects to evidence, impact, owner, decision need, and next review point.

### 5.3 Program Manager

**Core job story.** When local plans compete or interact, help me see the systemic consequence and coordinate a program-level trade-off that preserves the combined outcome.

- **Functional jobs:** normalize, aggregate, trace dependencies, govern benefits, and coordinate scarce resources.
- **Emotional jobs:** feel confident that aggregation has not hidden material dissent or risk.
- **Collaboration jobs:** make cross-project conflicts discussable and assign decisions to the correct authority.
- **Decision jobs:** balance local and program outcomes across time, funding, scope, and capacity.
- **Desired outcomes:** fewer reconciliation cycles, visible contagion paths, earlier conflict resolution.
- **Success criteria:** program summaries remain traceable; systemic risks cannot be made green by averaging.

### 5.4 Technical Manager / Resource Manager

**Core job story.** When demand competes for scarce capability, help me understand feasible options and human consequences so I can make a sustainable staffing decision.

- **Functional jobs:** maintain capability truth; compare demand and capacity; negotiate assignments; develop resilience.
- **Emotional jobs:** avoid treating people as fungible inventory; feel able to defend sustainable choices with evidence.
- **Collaboration jobs:** make constraint and trade-off reasoning visible to delivery leaders and individuals.
- **Decision jobs:** match, defer, split, develop, hire, contract, or escalate.
- **Desired outcomes:** lower overload, better fit, reduced staffing latency, fewer single points of failure.
- **Success criteria:** every staffing option exposes assumptions, time context, conflicts, and privacy-appropriate evidence.

### 5.5 Executive

**Core job story.** When strategy meets changing delivery reality, help me identify the few decisions where my intervention improves the outcome and show me the evidence and uncertainty behind them.

- **Functional jobs:** allocate attention, capital, authority, and risk; inspect strategic execution.
- **Emotional jobs:** feel informed rather than reassured; trust that bad news is not filtered out.
- **Collaboration jobs:** give clear direction and close decisions without bypassing accountable leaders.
- **Decision jobs:** continue, change, accelerate, stop, fund, or accept risk.
- **Desired outcomes:** faster material decisions, less reporting theatre, better portfolio focus.
- **Success criteria:** briefs distinguish fact, inference, forecast, and recommendation and remain interrogable to source.

### 5.6 System Administrator

**Core job story.** When the organization, policy, or threat environment changes, help me preserve safe access and reliable operation without becoming a bottleneck to legitimate work.

- **Functional jobs:** provision, govern, audit, diagnose, recover, and manage lifecycle.
- **Emotional jobs:** feel confident that changes are understood and reversible; avoid being surprised by hidden privilege.
- **Collaboration jobs:** explain policy effects to business owners and coordinate incidents.
- **Decision jobs:** approve scope, contain risk, grant exceptions, and choose remediation.
- **Desired outcomes:** least privilege with low friction, faster diagnosis, complete auditability.
- **Success criteria:** consequential changes show requester, approver, reason, before-and-after state, impact, and recovery path.

### 5.7 AI Assistant

**Core job story.** When a participant has an authorized goal but fragmented context, assemble relevant evidence, expose uncertainty, and prepare or execute the safest permitted next step so progress accelerates without obscuring accountability.

- **Functional jobs:** retrieve, connect, summarize, draft, compare, monitor, and execute bounded actions.
- **Emotional jobs:** create justified confidence without encouraging over-trust; reduce cognitive burden without disempowering users.
- **Collaboration jobs:** preserve shared context, translate between roles, and make handoffs complete.
- **Decision jobs:** determine when evidence is sufficient to assist, when to offer options, and when to stop and escalate.
- **Desired outcomes:** less reconstruction, better prepared decisions, fewer missed dependencies, lower coordination load.
- **Success criteria:** outputs are attributable, correctable, permission-safe, and proportionate to consequence; users understand what the AI did and did not establish.

## 6. Persona Comparison Matrix

| Dimension               | Team Member                   | Project Manager                    | Program Manager                     | Resource Manager                      | Executive                     | Administrator                     | AI Assistant                        |
| ----------------------- | ----------------------------- | ---------------------------------- | ----------------------------------- | ------------------------------------- | ----------------------------- | --------------------------------- | ----------------------------------- |
| Primary horizon         | Today to sprint               | Sprint to milestone                | Quarter to program                  | Weeks to capability horizon           | Quarter to strategy           | Immediate to policy cycle         | Task-dependent                      |
| Core unit               | Commitment                    | Delivery outcome                   | Cross-project outcome               | Capability and demand                 | Strategic decision            | Policy-controlled system          | Authorized goal                     |
| Dominant mode           | Create and execute            | Coordinate and forecast            | Synthesize and arbitrate            | Match and sustain                     | Decide and sponsor            | Govern and recover                | Retrieve and assist                 |
| Needed resolution       | Detailed current context      | Integrated causal context          | Comparable, drillable aggregation   | Time- and skill-specific              | Concise material implications | Exact state and audit             | Adaptive, source-preserving         |
| Main anxiety            | Hidden change or interruption | Surprise variance                  | Local optimism hiding systemic risk | Overload and poor fit                 | False confidence              | Hidden privilege or drift         | Acting beyond evidence or authority |
| Interruption tolerance  | Low                           | Medium, exception-led              | Low, material exceptions            | Medium for conflicts                  | Very low                      | High for true incidents           | Must be policy-limited              |
| Mobile role             | Capture and acknowledge       | Approve and coordinate             | Brief and approve                   | Availability and exception            | Brief and decide              | Alert and emergency approval      | Cross-device continuity             |
| Consequential authority | Own work evidence             | Project commitments within mandate | Program trade-offs within mandate   | Staffing recommendations or decisions | Funding, direction, risk      | Access and configuration          | None beyond delegated policy        |
| AI sweet spot           | Context and drafting          | Reconciliation and foresight       | Cross-project synthesis             | Feasible scenarios                    | Interrogable briefs           | Explanation and anomaly detection | Governed orchestration              |

## 7. Common Pain Points

### 7.1 Status reconstruction

The system of record rarely contains the whole story. Users reconstruct it from tasks, chat, documents, meetings, code, spreadsheets, and memory. The opportunity is not “better status fields”; it is evidence-linked state with clear freshness and responsibility.

### 7.2 Translation between levels

Team evidence becomes project narrative, then program normalization, then executive summary. Each translation loses nuance and introduces bias. The platform should preserve a traceable semantic chain while adapting resolution.

### 7.3 Decision debt

Work often waits not for execution but for an unnamed or poorly framed decision. Decisions need owner, deadline, options, evidence, consequence, and durable outcome. A decision is not merely another task status.

### 7.4 Notification debt

Most products treat every change as potentially important and transfer prioritization cost to users. Notifications should be evaluated by materiality, novelty, actionability, authority, and timing. Causal grouping is preferable to event flooding.

### 7.5 False precision

Single dates, percentages, health colors, and utilization figures can conceal assumptions and uncertainty. Enterprise confidence grows when estimates show basis, range, freshness, and drivers—not when ambiguity is cosmetically removed.

### 7.6 Fragmented ownership

Objects have assignees, but outcomes, decisions, risks, and data quality often lack accountable owners. Ownership must represent the responsibility being assumed and never imply that assignment equals consent.

### 7.7 Administrative duplication

The same reality is re-entered for execution, reporting, governance, and executive communication. Derived narratives should be generated from evidence, with human review where interpretation matters.

### 7.8 Human reductionism

Capacity systems often convert people into interchangeable percentages. Sustainable performance requires skills, time, context, preference, learning, continuity, and privacy—not only available hours.

### 7.9 Search without meaning

Keyword search retrieves artifacts but does not reconstruct relationships. Users need to find decisions, causes, dependencies, ownership, changes, and evidence across authorized contexts.

### 7.10 AI trust mismatch

Fluent output can cause over-trust; visible warnings everywhere can cause under-use. Trust should be calibrated through source attribution, consequence-aware approval, uncertainty, correction, and observable action history.

## 8. AI Opportunity Matrix

| Opportunity                                    | Primary beneficiaries       | AI role                                               | Autonomy ceiling | Required controls                                         |
| ---------------------------------------------- | --------------------------- | ----------------------------------------------------- | ---------------- | --------------------------------------------------------- |
| Context assembly                               | All                         | Retrieve and summarize authorized evidence            | Assist           | Sources, freshness, permission filtering                  |
| Change digest                                  | All                         | Explain what changed and why it matters               | Assist/proactive | Materiality threshold, user cadence, mute/control         |
| Status drafting                                | Team, PM, program           | Draft from current evidence                           | Draft only       | Human edit/approval, evidence links                       |
| Dependency impact                              | PM, program                 | Trace likely downstream effects                       | Recommend        | Explain path, uncertainty, scenario comparison            |
| Risk sensing                                   | PM, program, executive      | Identify patterns and missing signals                 | Recommend        | Avoid false certainty; feedback and dismissal reason      |
| Decision preparation                           | PM, program, executive      | Frame question, options, evidence, deadline           | Assist           | Named decision owner; no implied approval                 |
| Resource scenarios                             | Resource manager, PM        | Compare feasible matches and constraints              | Recommend        | Privacy, fairness review, no autonomous assignment        |
| Meeting preparation                            | All                         | Assemble goals, changes, decisions, prior commitments | Assist           | Scope control, private/shared-context boundaries          |
| Meeting follow-through                         | All                         | Draft decisions and actions                           | Draft only       | Participant confirmation; dissent preservation            |
| Forecast support                               | PM, program, executive      | Detect drivers and present ranges                     | Recommend        | Model basis, confidence calibration, override reason      |
| Knowledge retrieval                            | All                         | Answer relationship-aware questions                   | Assist           | Citation, authorization, “insufficient evidence” behavior |
| Access explanation                             | Administrator               | Explain effective access and impact                   | Assist           | Exact policy trace; no privilege mutation                 |
| Low-risk housekeeping                          | Authorized users            | Normalize metadata, link duplicates, prepare queues   | Bounded execute  | Reversible, logged, rate-limited, previewable             |
| External communication                         | PM, program, executive      | Draft audience-specific narrative                     | Draft only       | Explicit approval, recipient and sensitivity check        |
| Baseline or commitment change                  | PM, sponsor                 | Analyze and prepare change                            | Never autonomous | Accountable approval and immutable history                |
| Staffing, performance, employment              | Resource manager, executive | Provide policy-safe evidence and scenarios            | Never decide     | Human decision, fairness, privacy, appeal                 |
| Financial allocation or risk acceptance        | Executive                   | Compare options                                       | Never decide     | Named authority and recorded approval                     |
| Permission grant or destructive administration | Administrator               | Simulate and prepare                                  | Never silent     | Strong authentication, approval, audit, rollback          |

### 8.1 AI action tiers

1. **Observe:** retrieve and organize without changing shared state.
2. **Advise:** infer, compare, and recommend with evidence and uncertainty.
3. **Draft:** prepare a change that has no effect until reviewed.
4. **Execute bounded action:** perform reversible, low-consequence, authorized work with visible confirmation and audit.
5. **Prohibited autonomous action:** commitments, destructive changes, sensitive people decisions, material financial decisions, access escalation, external representation, or risk acceptance.

Autonomy should be determined by consequence, reversibility, observability, confidence, and authority—not by whether a model is technically capable.

## 9. Cross-Persona Workflow Analysis

### 9.1 Intent to executable commitment

Executive direction becomes program outcome, project commitment, resource demand, and team work. Failure occurs when rationale is stripped away at each handoff. The platform should preserve a two-way chain:

```text
Strategic intent
  -> program outcome
    -> project outcome
      -> commitment
        -> execution evidence
          -> outcome confidence
```

Every level should answer both “why does this exist?” and “what evidence supports its state?”

### 9.2 Evidence to decision

Team members produce evidence and surface uncertainty. Project managers integrate impact. Program managers identify systemic consequence. Executives or delegated owners make material trade-offs. AI may compress and connect the chain, but must preserve minority evidence and distinguish reported fact from inference.

### 9.3 Demand to assignment

Projects express capability demand; resource managers assess availability, skills, continuity, and human constraints; individuals contribute preferences and reality; accountable managers approve assignment. A capacity number alone is insufficient. The workflow must surface conflicts and negotiation rather than silently “optimize” people.

### 9.4 Risk to resolution

Risks emerge locally, aggregate systemically, and may require authority elsewhere. Effective flow is:

```text
Signal -> interpretation -> exposure -> owner -> options -> decision -> action -> residual risk
```

Products commonly stop at signal registration. The PM Platform should optimize for resolution and learning.

### 9.5 Change to shared understanding

A change should update the governed source once, identify affected commitments, notify only impacted participants at the appropriate urgency, and preserve the prior assumption. Multiple role-specific narratives may be generated, but they must resolve to the same evidence.

### 9.6 Meeting to durable outcome

Meetings are valuable when ambiguity, negotiation, trust, or creativity requires synchronous interaction. They are wasteful when used to read status. Before a meeting, context should be assembled; during it, unresolved decisions should be explicit; after it, decisions, dissent, actions, and changed assumptions should become durable shared state.

### 9.7 Administration to legitimate work

Access should follow purpose and least privilege. Business ownership determines who should act; system administration implements and verifies policy. AI can explain or simulate access, but cannot blur business approval with technical capability.

## 10. Design Implications

These are principles and evaluation tests, not screen requirements.

### 10.1 Workspace first means outcome context first

A workspace should assemble the objects, evidence, people, decisions, and tools needed for a coherent outcome. It should not merely be a navigational container or a customizable homepage.

**Evaluation test:** Can a user enter a context, understand current state and change, and take the next meaningful action without reconstructing relationships across modules?

### 10.2 Workflow before module boundaries

Backend bounded contexts should remain architecturally clean, but the user should not have to know which domain owns each record. Cross-domain experiences should compose through governed application boundaries, not duplicate data.

### 10.3 Decisions deserve first-class semantics

Decision requests, options, evidence, owner, deadline, outcome, and consequences should remain connected. Comments alone are insufficient because they do not make authority or closure explicit.

### 10.4 Progressive disclosure must preserve truth

Executives need less detail than engineers, but summarization must not remove uncertainty, dissent, provenance, or material exceptions. Progressive disclosure changes resolution, not reality.

### 10.5 High information density requires hierarchy

Density is valuable when relationships, change, and priority are legible. Density without hierarchy increases scan cost. Default attention should be drawn by materiality and workflow state, not decoration.

### 10.6 Search is a universal action layer

Search should find entities and relationships, answer contextual questions, preserve permissions, and allow users to act on results. It must disclose source and freshness when synthesizing.

### 10.7 Notifications are promises about attention

An interruption claims that immediate attention is worth more than the user’s current work. That claim requires a high threshold. Users need role-sensitive defaults, explicit control, digest modes, quiet hours, causal grouping, and clear reasons for notification.

### 10.8 Adaptive experience must remain inspectable

Adaptation may change ordering, suggested actions, depth, and cadence based on role and behavior. Users must be able to understand, correct, and disable it. Stable shared semantics should not adapt invisibly.

### 10.9 Desktop depth, mobile continuity

Desktop should support analysis, comparison, planning, and high-throughput work. Mobile should preserve continuity through review, capture, acknowledgement, and carefully bounded decisions. Shrinking desktop complexity is not a mobile strategy.

### 10.10 Keyboard efficiency and accessibility are core quality

Every frequent action should be reachable through a consistent command model, and every essential workflow should be keyboard and assistive-technology operable. Customization should not destroy organizational supportability.

### 10.11 AI appears at the point of work

AI should be accessible where context already exists, while retaining a consistent identity, authority model, and history. A separate chat destination cannot be the only AI experience because it makes users manually transport context.

### 10.12 AI outputs must be epistemically legible

Users should distinguish:

- source fact;
- user-reported state;
- system-derived measure;
- AI inference;
- forecast;
- recommendation;
- proposed action;
- completed action.

Fluency must never collapse these categories.

### 10.13 Correction is part of the workflow

AI and automation will be wrong. Corrections should be immediate, reversible where possible, and useful without forcing users to become model trainers. Repeated correction is a quality signal, not a substitute for quality.

### 10.14 Metrics must resist surveillance incentives

Activity volume, message counts, task touches, and online presence are weak proxies for value and can distort behavior. Persona success should be measured through outcomes, flow, quality, decision latency, and sustainability.

## 11. Risks

| Risk                                         | Consequence                               | Mitigation principle                                                      |
| -------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------- |
| Personas become stereotypes                  | Wrong defaults and exclusion              | Validate by behavior, context, authority, and organization type           |
| Title equals permission                      | Governance failure                        | Separate persona, role, authority, and effective permission               |
| AI fluency creates false trust               | Poor decisions                            | Provenance, uncertainty, correction, consequence-aware approval           |
| AI becomes an ungoverned shadow actor        | Security and accountability loss          | First-class agent identity, scoped authorization, audit, sponsor          |
| Personalization fragments shared truth       | Coordination failure                      | Adapt presentation, not semantic state; make adaptation inspectable       |
| Executive simplicity hides risk              | Late surprises                            | Preserve drill-down, exceptions, dissent, and evidence                    |
| Density becomes clutter                      | Cognitive overload                        | Hierarchy, progressive disclosure, and task-based evaluation              |
| Automation creates approval fatigue          | Rubber-stamping                           | Automate only low-risk work; batch and prioritize meaningful approvals    |
| Resource optimization harms people           | Ethical, legal, and retention risk        | Human authority, purpose limits, fairness review, privacy, appeal         |
| Proactive AI creates interruption debt       | Abandonment and distrust                  | Materiality thresholds, cadence controls, novelty and actionability tests |
| Historical data encodes poor practice        | Biased recommendations                    | Data-quality review, policy constraints, counterfactual evaluation        |
| Research baseline is mistaken for validation | Premature requirements                    | Mandatory primary-research gates and evidence labels                      |
| Existing architecture constrains discovery   | Incremental rather than transformative UX | Preserve domain integrity while testing cross-domain user workflows       |

## 12. Recommendations

### 12.1 Adopt a product-level execution model

Define shared semantics for outcome, commitment, evidence, dependency, risk, decision, owner, confidence, change, and next action. This model should connect existing domains without erasing their ownership.

### 12.2 Make decision latency a primary product measure

Measure time from a material signal to a correctly owned, evidence-ready decision and from decision to verified effect. This reveals more value than counting tasks created or dashboards viewed.

### 12.3 Establish an AI authority architecture before AI features

Define agent identity, delegated authority, data scope, action tiers, approval policy, provenance, audit, reversal, and incident handling before permitting autonomous state changes.

### 12.4 Design one evidence chain with multiple resolutions

Team, project, program, and executive experiences should derive from shared evidence while presenting different horizons and depth. Generated summaries must remain traceable.

### 12.5 Treat attention as a governed resource

Create platform-wide notification principles covering severity, materiality, novelty, actionability, ownership, timing, aggregation, quiet periods, and user override.

### 12.6 Measure coordination load

Baseline time spent chasing status, preparing reports, reconciling tools, finding decisions, and repeating context. Product UX Evolution should demonstrate that these burdens decline.

### 12.7 Protect human dignity in resource decisions

Explicitly prohibit autonomous staffing and performance decisions. Define sensitive attributes, permitted purposes, explanation expectations, bias testing, human review, and appeal paths.

### 12.8 Validate workflows before navigation

Research complete journeys—such as resolving a slipping milestone or staffing a constrained project—before defining information architecture. Navigation should emerge from recurring user intent and relationships.

### 12.9 Support novice clarity and expert fluency together

Use consistent commands, discoverable shortcuts, stable semantics, reversible actions, and progressive depth. Do not create separate “simple” and “power” products that diverge in truth.

### 12.10 Create research governance

Each material UX decision should cite evidence, identify affected personas and jobs, document trade-offs, state confidence, and define how the decision will be evaluated after release.

## 13. Future Research

### 13.1 Required primary research

Recruit representative participants across organization sizes, regulated and non-regulated environments, delivery methods, accessibility needs, and geographic contexts:

- 8–12 team members across technical and non-technical delivery work;
- 6–8 project managers;
- 5–7 program or portfolio leaders;
- 6–8 technical or resource managers;
- 5–7 executives or senior sponsors;
- 5–7 system administrators, security, or governance practitioners.

Use role counts as a starting range, not a statistical claim. Continue until major behavioral patterns stabilize and meaningful minority needs are understood.

### 13.2 Recommended studies

1. **Contextual inquiry:** Observe planning, status reconstruction, staffing, governance, and incident workflows in their actual tool ecosystem.
2. **Decision diary:** Capture material decisions, evidence sought, delays, participants, confidence, and outcome over four weeks.
3. **Interruption diary:** Record notification source, perceived urgency, actionability, and cost of interruption.
4. **Artifact ecology:** Map spreadsheets, slides, chat, tickets, documents, code, and private notes used to produce official status.
5. **Search study:** Collect real questions users ask when they cannot find context; classify entity, relationship, and synthesis intent.
6. **AI trust calibration:** Test source visibility, uncertainty, correction, proactive recommendations, and approval boundaries at different consequence levels.
7. **Resource ethics study:** Examine staffing fairness, privacy, preference, manager authority, and employee recourse.
8. **Accessibility research:** Include screen-reader, keyboard-only, low-vision, cognitive-accessibility, and motor-access participants in core workflows.
9. **Cross-device continuity:** Study what users begin, review, approve, or capture on desktop, tablet, and mobile.
10. **Longitudinal pilot:** Measure coordination load, decision latency, forecast calibration, and correction behavior over at least one delivery cycle.

### 13.3 Questions that must remain open

- Is “Engineer / Team Member” too broad to support meaningful defaults?
- When do project and program management behaviors diverge enough to require different workspace models?
- Which resource data is legitimately visible to project managers, peers, and AI?
- What evidence creates executive confidence without driving reporting theatre?
- Which proactive AI interventions are welcomed, tolerated, or rejected by role and consequence?
- What is the smallest useful shared execution vocabulary across delivery methods?
- How should AI represent conflicting sources and unresolved disagreement?
- When should an AI-generated insight become a durable governed record?

## 14. Review Checklist

### Research integrity

- [ ] Primary research limitations are visible and not obscured by confident prose.
- [ ] Persona hypotheses have named validation plans.
- [ ] Minority and accessibility needs are represented in recruitment.
- [ ] Recommendations cite evidence or are explicitly labeled as hypotheses.

### Jobs-to-be-Done quality

- [ ] Jobs describe user progress rather than software features.
- [ ] Functional, emotional, collaboration, and decision jobs are covered.
- [ ] Success criteria measure outcomes rather than activity.
- [ ] Cross-persona handoffs and authority are explicit.

### AI governance

- [ ] AI identity, sponsor, authority, and data scope are explicit.
- [ ] Outputs distinguish facts, inference, prediction, recommendation, and action.
- [ ] Human approval exists for commitments and consequential actions.
- [ ] AI actions are attributable, auditable, and reversible where possible.
- [ ] Sensitive people decisions cannot be autonomous.
- [ ] Proactive behavior has materiality and interruption controls.

### Product architecture

- [ ] Shared truth is preserved across persona-specific resolution.
- [ ] Domain ownership is not duplicated for UX convenience.
- [ ] Search, notification, mobile, desktop, keyboard, and accessibility implications are covered.
- [ ] No wireframe, visual style, or component decision has been smuggled into research conclusions.

### Approval readiness

- [ ] Product, UX research, architecture, security, accessibility, and data-governance reviewers have participated.
- [ ] Conflicting feedback and rejected assumptions are recorded.
- [ ] Follow-up research has an owner, timing, and decision it will inform.
- [ ] Approval establishes a research baseline, not final requirements or designs.

## 15. Approval Recommendation

**Recommendation: APPROVE AS A PROVISIONAL PRODUCT RESEARCH BASELINE.**

RP-001 is suitable to guide primary research planning, shared product vocabulary, AI-governance exploration, and evaluation criteria. It should not independently authorize information architecture, workflow design, UI design, or implementation.

Approval conditions:

1. Conduct representative primary research before persona-specific experience architecture is frozen.
2. Maintain traceability from future UX decisions to validated jobs, evidence, and trade-offs.
3. Define AI authority, audit, privacy, and human-approval policy before enabling state-changing AI behavior.
4. Revisit RP-001 after the first primary-research cycle and version it when evidence materially changes the persona or job model.

The enduring product direction is: **help every participant move from fragmented evidence to shared understanding, from shared understanding to a well-owned decision, and from that decision to verifiable progress—with AI increasing leverage without diluting human agency or accountability.**
