# Project Workspace — Low-Fidelity Desktop Wireframe

## Status and Scope

| Field     | Value                                                                  |
| --------- | ---------------------------------------------------------------------- |
| Artifact  | UX validation wireframe                                                |
| Workspace | Project                                                                |
| Fidelity  | Low                                                                    |
| Target    | Desktop, wide and standard laptop viewports                            |
| Source    | Project Workspace Specification and Information Architecture Blueprint |
| Excludes  | Branding, visual styling, typography, components, and implementation   |

The Project Workspace is a command center, not a dashboard. Every region below must help a participant understand evidence, make a decision, coordinate work, or reach the next action.

## 1. Overall Page Layout

```text
+------------------------------------------------------------------------------------------------+
| P1 GLOBAL HEADER                                                                               |
| [Organisation] [Global search / command] [Attention] [Decisions] [User controls]                |
+------------------+-----------------------------------------------------------------------------+
| P2 GLOBAL NAV    | P3 PROJECT IDENTITY & CONTEXT                                                |
| Home             | Projects / Project Alpha       [Lifecycle] [Permission] [Freshness]          |
| Portfolio        | Outcome: [concise outcome]     Owner / Sponsor / Program relationship        |
| [Projects]       +-----------------------------------------------------------------------------+
| Planning         | P4 PROJECT NAVIGATION                                                       |
| Resources        | [Overview] [Delivery] [Milestones] [RAID] [Decisions] [Team] [Evidence]      |
| Intelligence     +-----------------------------------------------+-----------------------------+
| Administration*  | P5 HEALTH, CHANGE & DECISIONS                 | P6 CONTEXTUAL DETAIL        |
|                  | Overall assessment / confidence / freshness   | Selected driver, source,    |
|                  | Drivers by health dimension                   | owner, evidence, actions    |
|                  | Material change since comparison point        | [Open source] [Request]     |
|                  | Pending decision and accountable owner        |                             |
|                  +-----------------------------------------------+-----------------------------+
|                  | P7 PROJECT SUMMARY                                                           |
|                  | Outcome progress / current phase / next action / highest exposure            |
|                  +-----------------------------------------------+-----------------------------+
|                  | P8 TIMELINE & MILESTONES                    | P9 TASK PROGRESS            |
|                  | Baseline vs forecast / next milestones       | Flow / blockers / review    |
|                  | [Open in Planning]                            | [Open delivery work]        |
|                  +-----------------------------------------------+-----------------------------+
|                  | P10 RISKS & ISSUES                          | P11 RESOURCE SUMMARY        |
|                  | Material exposure / owners / decisions       | Demand / coverage / conflict|
|                  | [Create risk] [Create issue] [Escalate]      | [Open Resources]            |
|                  +-----------------------------------------------+-----------------------------+
|                  | P12 DOCUMENTS & DECISIONS                    | P13 FINANCIAL SUMMARY*      |
|                  | Key evidence / pending review / decisions    | Budget / forecast / variance|
|                  | [Link evidence] [Request decision]           | or Not Configured           |
|                  +-----------------------------------------------+-----------------------------+
|                  | P14 ACTIVITY TIMELINE                        | P15 AI ASSISTANT            |
|                  | Causally grouped material Project changes    | Explain / draft / analyse   |
|                  | [Filter] [Open changed object]               | sources and review required |
+------------------+-----------------------------------------------+-----------------------------+
| P16 QUICK ACTION / STATUS: contextual commands, source degradation, support                     |
+------------------------------------------------------------------------------------------------+
```

`*` Administration and Financial Summary appear only when authorised and configured.

### Layout intent

- Project identity persists above all Project capabilities.
- Workspace navigation follows operational jobs rather than backend modules.
- Health, material change, and decisions occupy the first command region because they determine what requires intervention.
- Timeline, delivery, RAID, and Resource evidence form the operational core.
- Documents, decisions, financials, and activity support stewardship and audit.
- Detail remains adjacent to selected evidence so users can inspect without losing Project context.
- AI supports explanation and preparation after canonical evidence is available.

## 2. Header and Navigation

### P1 — Global Header

- **Purpose:** Establish organisation and global utilities.
- **User goal:** Confirm security scope and reach search, commands, attention, or decisions.
- **Reason for placement:** Global scope precedes Project scope.

### P2 — Global Navigation

- **Purpose:** Move among approved workspaces.
- **User goal:** Enter Home, Portfolio, Planning, Resources, Intelligence, or Administration without losing valid Project return context.
- **Reason for placement:** Stable navigation prevents Project sections from becoming global modules.

### P3 — Project Identity & Context

- **Purpose:** Establish immutable Project identity, outcome, lifecycle, ownership, Program/Portfolio relationship, permission, and freshness.
- **User goal:** Know exactly which Project and authority context is active.
- **Reason for placement:** Every health conclusion and action depends on correct Project context.
- **Primary actions:** Inspect or edit Project identity when authorised; copy canonical Project link.
- **Secondary actions:** Open Program/Portfolio relationship; inspect permission or freshness.

### P4 — Project Navigation

- **Purpose:** Provide stable access to Project capability groups.
- **User goal:** Move among Overview, Delivery, Milestones, RAID, Decisions, Team, Evidence, Activity, and Settings where authorised.
- **Reason for placement:** Remains close to Project identity and preserves the Project across capabilities.

## 3. Main Content Areas

### P5 — Health, Change & Decisions

- **Purpose:** Explain Project condition, evidence quality, material change, and required decision.
- **User goal:** Identify whether intervention is required and why.
- **Reason for placement:** It is the primary command region, not a decorative status banner.
- **Information:** Overall health; dimension drivers; confidence; freshness; material change; pending decision; accountable owner.
- **Primary actions:** Inspect driver; open decision; publish or review health when authorised.
- **Secondary actions:** Challenge assessment; request evidence; compare with prior assessment.

### P6 — Contextual Detail Panel

- **Purpose:** Show source, rationale, owner, relationships, history, and applicable actions for the selected object.
- **User goal:** Understand enough detail to choose the next action without leaving the Project unnecessarily.
- **Reason for placement:** Keeps source evidence adjacent to the selected health, milestone, Risk, Issue, task-flow, Resource, or decision signal.
- **Rule:** Detailed schedule and Resource changes route to their owning workspaces.

### P7 — Project Summary

- **Purpose:** Provide minimum shared understanding of outcome, phase, forecast, progress basis, next decision, and highest exposure.
- **User goal:** Orient quickly and communicate a consistent Project narrative.
- **Reason for placement:** Follows health so summary does not become a passive executive dashboard.

### P8 — Timeline & Milestones

- **Purpose:** Show current phase, Baseline versus forecast, next milestones, decision gates, and material movement.
- **User goal:** Understand time consequence and open detailed Planning context when needed.
- **Reason for placement:** Schedule is central to Project health but detailed authoring belongs in Planning.
- **Primary action:** Open selected milestone in Planning with date range and return context.
- **Secondary actions:** Follow milestone; open linked decision, Risk, Issue, or evidence.

### P9 — Task Progress

- **Purpose:** Explain delivery flow, blockage, review, evidence, and current focus.
- **User goal:** Coordinate Project work without duplicating Home’s personal queue or Planning’s WBS editor.
- **Reason for placement:** Paired with milestone context to connect schedule and execution evidence.
- **Primary action:** Open filtered Project delivery work.
- **Secondary actions:** Request evidence or review; surface blocker as Risk or Issue.

### P10 — Risks & Issues

- **Purpose:** Manage material exposure, ownership, response, decision, and escalation.
- **User goal:** Act on risks and issues rather than review counts.
- **Reason for placement:** RAID is a core Project governance responsibility.
- **Primary actions:** Create or update Risk/Issue; escalate; request decision; record resolution evidence.
- **Secondary actions:** Link milestone, task, Resource, document, or decision.

### P11 — Resource Summary

- **Purpose:** Show Project demand coverage, assignment conflicts, critical capability, and upcoming capacity concerns.
- **User goal:** Determine whether staffing or capacity negotiation is needed.
- **Reason for placement:** Resource feasibility affects delivery but detailed analysis belongs in Resources.
- **Primary action:** Open Resources with Project, demand, date range, and affected commitment.
- **Secondary actions:** Request staffing review; create Risk/Issue; follow assignment request.

### P12 — Documents & Decisions

- **Purpose:** Connect durable evidence and explicit decisions to Project work.
- **User goal:** Find the authoritative rationale and advance pending review or decisions.
- **Reason for placement:** Stewardship follows operational delivery evidence and remains accessible without entering a separate document hierarchy.

### P13 — Financial Summary

- **Purpose:** Provide governed budget, commitment, actual, forecast, variance, confidence, and decision context when enabled.
- **User goal:** Understand financial exposure and open the correct review or source.
- **Reason for placement:** Financials support Project decisions but may be restricted or not configured.
- **Rule:** Missing configuration is never displayed as zero.

### P14 — Activity Timeline

- **Purpose:** Explain causally grouped material Project change.
- **User goal:** Investigate what changed, who acted, what was approved, and what resulted.
- **Reason for placement:** Historical evidence supports investigation after current operational state.
- **Rule:** Routine field saves and presence are excluded from default activity.

### P15 — AI Assistant

- **Purpose:** Explain health, change, evidence, and options; prepare updates, meeting briefs, decisions, or reviewable proposed changes.
- **User goal:** Reduce reconstruction and decision-preparation effort.
- **Reason for placement:** AI remains next to, but subordinate to, canonical evidence and activity.
- **Rule:** Recommendations expose scope, sources, freshness, uncertainty, and review path.

### P16 — Quick Action / Status

- **Purpose:** Expose current-context commands and degraded-source status.
- **User goal:** Act without scanning unrelated controls and understand what remains reliable.
- **Reason for placement:** Persistent support for workflow completion, not a generic creation bar.

## 4. Information Hierarchy

```text
1. Organisation and Project identity
2. Project health, confidence, freshness, and decisions
3. Outcome summary and material change
4. Milestones and delivery flow
5. Risks, issues, and Resource feasibility
6. Documents, decisions, and financial stewardship
7. Material activity history
8. AI explanation and secondary assistance
```

No aggregate metric may outrank a direct critical decision merely because it is visually compact.

## 5. Primary and Secondary User Paths

### Primary path — Respond to Project variance

```text
P3 confirm Project
  -> P5 inspect health driver and material change
    -> P6 inspect source, owner, evidence, and consequence
      -> P8/P9/P10/P11 identify operational source
        -> take Project action or open Planning/Resources
          -> create or complete decision
            -> return with Project state reconciled
```

### Secondary path — Understand Project before a review

```text
P3 Project outcome and ownership
  -> P5 health/confidence
    -> P7 Project Summary
      -> P8 milestones
        -> P10 exposure
          -> P12 decisions/evidence
            -> P15 ask for cited review brief
```

### Team Member path — Resolve blocker

```text
P9 blocked work
  -> P6 blocker detail and related decision/dependency
    -> update evidence or create Issue/request decision
      -> return to delivery context
```

## 6. Expected Eye Flow

```text
Project identity and navigation
            ↓
Health / change / decision  →  Contextual detail
            ↓
Project Summary
            ↓
Milestones  ↔  Task progress
            ↓
Risks/issues ↔ Resource feasibility
            ↓
Documents/decisions ↔ Financials
            ↓
Activity ↔ AI assistance
```

The flow connects conclusion to driver, then operational evidence, then stewardship and history.

## 7. Keyboard Focus Order

```text
1  Skip to Project content
2  Organisation selector
3  Global search / command
4  Global workspace navigation
5  Project identity actions
6  Project capability navigation
7  Health, change, and decision items
8  Contextual Detail Panel when opened
9  Project Summary actions
10 Timeline and milestone objects
11 Task Progress signals and actions
12 Risks and Issues
13 Resource Summary
14 Documents and Decisions
15 Financial Summary when authorised
16 Activity Timeline
17 AI Assistant
18 Quick action and status/help
```

- Within sections, focus follows information priority and canonical object order.
- Opening Detail moves focus to its heading; closing returns focus to the source.
- Cross-workspace actions preserve a return target.
- Context menus and commands provide equivalents for pointer actions.

## 8. Empty State Wireframe

```text
+------------------------------------------------------------------------------------------------+
| GLOBAL HEADER / NAVIGATION                                                                     |
+------------------+-----------------------------------------------------------------------------+
| GLOBAL NAV       | PROJECT IDENTITY: Project Alpha / Outcome / Owner                            |
|                  +-----------------------------------------------------------------------------+
|                  | HEALTH & CONFIDENCE                                                         |
|                  | Assessment unavailable: required Project sources are not configured.         |
|                  | [Inspect missing sources] [Open Project setup if authorised]                  |
|                  +-----------------------------------------------+-----------------------------+
|                  | DELIVERY                                     | RAID                        |
|                  | No planned or execution work in this Project. | No Risks or Issues recorded.|
|                  | [Open Planning]                               | [Create Risk] [Create Issue]|
|                  +-----------------------------------------------+-----------------------------+
|                  | DOCUMENTS & DECISIONS                                                       |
|                  | No authoritative evidence or decisions linked to this Project.               |
|                  | [Link evidence] [Request decision]                                           |
|                  +-----------------------------------------------------------------------------+
|                  | RECENT ACTIVITY: Project created / ownership established                     |
+------------------+-----------------------------------------------------------------------------+
```

### Empty-state variants

- **New Project:** Explain which source contexts are absent and offer valid setup actions.
- **No immediate exposure:** State that sources were verified and no material intervention is required.
- **Filtered view empty:** Display active filters and allow reset.
- **Restricted stakeholder:** Omit inaccessible sections without leaking names or counts.
- **Financial not configured:** Omit for ordinary users; show Not Configured only to authorised owners.
- **AI unavailable:** Preserve deterministic Project understanding and actions.

## 9. Loading State Wireframe

```text
+------------------------------------------------------------------------------------------------+
| GLOBAL HEADER: organisation and utilities available                                            |
+------------------+-----------------------------------------------------------------------------+
| GLOBAL NAV       | PROJECT IDENTITY loads first: identity / permission / lifecycle              |
|                  +-----------------------------------------------------------------------------+
|                  | HEALTH: [loading source status; no false On Track state]                      |
|                  +-----------------------------------------------+-----------------------------+
|                  | MILESTONES [progressive]                      | DELIVERY [progressive]      |
|                  +-----------------------------------------------+-----------------------------+
|                  | RAID [loads independently]                    | RESOURCES [loads independently]|
|                  +-----------------------------------------------+-----------------------------+
|                  | ACTIVITY [progressive history]                | AI waits for useful sources |
+------------------+-----------------------------------------------+-----------------------------+
```

### Loading-state rules

- Identity and permissions load before Project conclusions.
- Health shows Unknown/loading until required sources are verified.
- Sections load independently without shifting the active selection.
- Last-known values include timestamps and stale status.
- Loaded actions and navigation remain usable.
- AI synthesis never blocks deterministic Project content.

## 10. Side Panel States

### Closed

The main workspace uses the full available content region. Selection remains visible and may be opened through keyboard, command, or direct activation.

### Open with selected object

```text
+---------------------------------------------------+--------------------------+
| Main Project context                              | DETAIL                   |
| Selected source remains identifiable              | Purpose / owner / state |
|                                                   | Evidence / freshness     |
|                                                   | Relationships            |
|                                                   | Primary action           |
|                                                   | Open canonical source    |
+---------------------------------------------------+--------------------------+
```

### Conflicting or stale source

Detail states what changed, what remains reliable, and whether the user must refresh, compare, request evidence, or leave the draft unchanged.

## UX Strengths

- Makes Project health an evidence-backed command model rather than a traffic-light summary.
- Connects schedule, delivery, RAID, Resources, documents, decisions, and activity without duplicating specialist workspaces.
- Gives all personas one canonical Project truth with role-appropriate depth.
- Provides clear source drill-through and return behavior.
- Keeps AI explainable and subordinate to evidence.
- Supports empty and loading states without creating false confidence.

## Open Questions

1. How many health dimensions can be scanned effectively before progressive disclosure is required?
2. Should the Contextual Detail Panel remain available across every Project capability or only Overview?
3. What threshold defines a material milestone, Resource, or health change for default placement?
4. How should published human assessment and calculated indicators appear when they disagree?
5. Which Project decisions contain enough context for completion without opening Intelligence or a dedicated decision view?
6. Should Documents and Decisions remain one combined region after primary usability testing?
7. What minimum evidence is required before Project health may be published?

## Suggested Improvements Before High-Fidelity Design

1. Test the command-center hierarchy using one healthy, one uncertain, and one critical Project dataset.
2. Validate whether users can distinguish Project Summary, Health, and Activity without perceiving duplication.
3. Test milestone-to-Planning and Resource-summary-to-Resources transitions with return-context restoration.
4. Validate health disagreement, Unknown, stale, and partial-source states.
5. Define content limits for Project Summary and causal Activity groups.
6. Test the layout with restricted Executive, Team Member, and Resource Manager permissions.
7. Validate keyboard focus and Detail Panel behavior across all operational sections.

## References

- [Project Workspace Specification](../workspaces/PROJECT_WORKSPACE_SPECIFICATION.md)
- [Planning Workspace](../workspaces/PLANNING_WORKSPACE.md)
- [Resource Workspace](../workspaces/RESOURCE_WORKSPACE.md)
- [Information Architecture Blueprint](../architecture/INFORMATION_ARCHITECTURE_BLUEPRINT.md)
- [UX-ADR-001](../architecture/UX-ADR-001_WORKSPACE_FIRST_ARCHITECTURE.md)
