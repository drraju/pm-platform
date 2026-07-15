# Home Workspace — Low-Fidelity Desktop Wireframe

## Status and Scope

| Field     | Value                                                                |
| --------- | -------------------------------------------------------------------- |
| Artifact  | UX validation wireframe                                              |
| Workspace | Home                                                                 |
| Fidelity  | Low                                                                  |
| Target    | Desktop, wide and standard laptop viewports                          |
| Source    | Home Workspace Specification and Information Architecture Blueprint  |
| Excludes  | Branding, visual styling, typography, components, and implementation |

All boxes represent information regions, not prescribed components. Borders, spacing, and proportions are approximate. Labels such as `P1` identify annotated regions, not final interface text.

## 1. Overall Page Layout

```text
+--------------------------------------------------------------------------------------+
| P1 GLOBAL HEADER                                                                     |
| [Organisation]   [Global search / command]   [Attention] [Decisions] [User controls] |
+------------------+-------------------------------------------------------------------+
| P2 GLOBAL NAV    | P3 HOME CONTEXT                                                   |
|                  | Home / [Responsibility context] / [Time horizon]                  |
| [Home]           | Scope: Organisation A     Freshness: [verified time]              |
| Portfolio        +-------------------------------------------------------------------+
| Projects         | P4 ORIENTATION BRIEF                                              |
| Planning         | What needs attention, what changed, and why it matters            |
| Resources        | [Inspect sources] [Ask about this] [Resume recommended context]   |
| Intelligence     +--------------------------------------+----------------------------+
| Administration*  | P5 ACTION REQUIRED                   | P6 MATERIAL CHANGE         |
|                  | Decisions & approvals                | Causal change digest       |
|                  | Direct requests                      | Exceptions and blockers    |
|                  | My work requiring attention          | [Review affected context]  |
|                  | [Open] [Review] [Defer personal]     |                            |
|                  +--------------------------------------+----------------------------+
|                  | P7 FORTHCOMING WORK                  | P8 CONTINUITY              |
|                  | Upcoming commitments and reviews     | Recent contexts            |
|                  | Near-term milestones                 | Saved contexts             |
|                  | [Change horizon]                     | [Resume]                   |
|                  +--------------------------------------+----------------------------+
|                  | P9 OPTIONAL ROLE CONTEXT                                           |
|                  | Project / Program / Capacity / Portfolio pulse when relevant       |
|                  +----------------------------------------------------+---------------+
|                  | P10 AI WORK & ASSISTANCE                            | P11 DETAIL    |
|                  | Requested AI work, scope, status, sources           | Contextual    |
|                  | [Continue] [Review] [Cancel when safe]              | explanation  |
+------------------+----------------------------------------------------+---------------+
| P12 STATUS / HELP: source degradation, keyboard help, support reference              |
+--------------------------------------------------------------------------------------+
```

`*` Administration appears only when authorized.

### Layout intent

- Global navigation remains stable across all workspaces.
- Orientation spans the content width because every downstream conclusion depends on correct scope.
- Action Required precedes Material Change because direct obligations have the clearest next action.
- Forthcoming Work and Continuity support preparation and re-entry after immediate obligations.
- Role context is secondary and appears only when it contributes a decision or action.
- AI remains subordinate to canonical obligations and source evidence.
- Contextual detail is optional and opens only when a selected item requires explanation without leaving Home.

## 2. Header and Navigation

### P1 — Global Header

- **Purpose:** Establish organisation, expose universal retrieval and attention utilities, and provide account controls.
- **User goal:** Confirm the security context and reach any known destination quickly.
- **Reason for placement:** Organisation scope and global utilities affect every Home conclusion and must be available before content navigation.
- **Primary actions:** Change authorised organisation; search; open command palette; inspect attention or decisions.
- **Secondary actions:** Help; preferences; accessibility; account/session controls.

### P2 — Global Navigation

- **Purpose:** Move among the seven approved workspaces.
- **User goal:** Leave Home for the correct durable work context.
- **Reason for placement:** Stable global navigation provides predictable orientation and avoids turning widgets into primary navigation.
- **Behavior:** Home is current. Unauthorised destinations are omitted. Navigation order does not adapt unpredictably.

### P3 — Home Context

- **Purpose:** Show responsibility context, time horizon, organisation, and freshness.
- **User goal:** Understand which obligations and evidence Home is prioritising.
- **Reason for placement:** Scope must be understood before summaries or actions are trusted.
- **Primary actions:** Change responsibility context or approved time horizon.
- **Secondary actions:** Inspect source coverage; reset to default context.

## 3. Main Content Areas and Widgets

### P4 — Orientation Brief

- **Purpose:** Explain what needs attention and what materially changed since the last meaningful review.
- **User goal:** Regain situational awareness without inspecting multiple workspaces.
- **Reason for placement:** It provides the reading frame for all content below.
- **Content rule:** Concise, evidence-linked, scope-aware, and explicit about missing or stale sources.
- **AI location:** AI-assisted synthesis may appear here, but deterministic source summaries remain available.

### P5 — Action Required

- **Purpose:** Present direct commitments, decisions, approvals, reviews, and named requests.
- **User goal:** Identify and advance obligations where the current user is the actor or authority.
- **Reason for placement:** This is the primary action zone and follows orientation immediately.
- **Widget placement:** Decisions & Approvals, Direct Requests, My Work, Blockers requiring the user.
- **Primary actions:** Open canonical context; review a bounded decision; respond to request.
- **Secondary actions:** Follow; acknowledge; defer a personal reminder. Reading does not resolve source work.

### P6 — Material Change

- **Purpose:** Explain causal changes, exceptions, blockers, and exposure relevant to the user.
- **User goal:** Understand whether intervention or preparation is required.
- **Reason for placement:** Material change informs action but is not always a direct obligation.
- **Widget placement:** Material Change Digest; Blockers & Exceptions; Dependency Watch.
- **Primary action:** Open affected source or analysis.
- **Secondary action:** Acknowledge informational change; follow context.

### P7 — Forthcoming Work

- **Purpose:** Show upcoming commitments, milestones, reviews, and likely decisions.
- **User goal:** Prepare before work becomes urgent.
- **Reason for placement:** Supports proactive planning after immediate and material concerns.
- **Primary action:** Open upcoming item.
- **Secondary action:** Change explicit horizon; follow.

### P8 — Continuity

- **Purpose:** Restore recently used or intentionally saved contexts.
- **User goal:** Resume work without reconstructing organisation, Project, filter, date, or view state.
- **Reason for placement:** High-frequency re-entry is valuable but must not displace direct obligations.
- **Widgets:** Recent Contexts; Saved Contexts; Watched & Delegated.

### P9 — Optional Role Context

- **Purpose:** Provide Project, Program, Resource, or Portfolio movement relevant to current responsibility.
- **User goal:** Monitor accountable scope without opening a full specialist workspace.
- **Reason for placement:** Role summaries are useful after direct work and material change, not as the leading content.
- **Rule:** No generic metric wall. Every displayed signal identifies a decision, exception, or source destination.

### P10 — AI Work & Assistance

- **Purpose:** Continue or review explicitly requested AI work.
- **User goal:** Inspect progress, provide missing input, or review a result without losing Home context.
- **Reason for placement:** AI is an assistance layer, not the primary Home destination.
- **Content:** Requested outcome, declared scope, progress, sources, required input, and review destination.

### P11 — Contextual Detail Panel

- **Purpose:** Explain a selected Home item, sources, urgency, or action requirements.
- **User goal:** Decide whether to act without unnecessary navigation.
- **Reason for placement:** Preserves Home context while allowing temporary depth.
- **Rule:** Consequential actions route to the canonical owning workflow unless full governed context is present.

## 4. Information Hierarchy

```text
1. Organisation and responsibility scope
2. Orientation and freshness
3. Direct action required
4. Material change and exposure
5. Forthcoming commitments
6. Recent and saved continuity
7. Optional role context
8. AI work and secondary assistance
```

Mandatory direct obligations and critical exceptions cannot be personalised below optional content.

## 5. Primary and Secondary User Paths

### Primary path — Resume or advance work

```text
P1 confirm organisation
  -> P3 confirm responsibility/horizon
    -> P4 understand current situation
      -> P5 select highest relevant obligation
        -> canonical Project / Planning / Resource / Decision context
          -> complete or advance work
            -> return to Home with state reconciled
```

**Highlighted behavior:** Home carries the initiating item and return context. The destination restores the relevant Project, Plan, Resource, date range, and selection.

### Secondary path — Investigate material change

```text
P4 orientation
  -> P6 causal change
    -> P11 inspect sources and affected contexts
      -> open Intelligence or canonical source
        -> decide, follow, or take no action with rationale
```

### Continuity path

```text
P8 recent/saved context
  -> validate current permission and object state
    -> restore canonical workspace context
```

## 6. Expected Eye Flow

```text
Global scope
   ↓
Orientation brief
   ↓
Action Required  →  Material Change
   ↓                    ↓
Forthcoming Work → Continuity
   ↓
Role context
   ↓
AI work / secondary assistance
```

The eye flow prioritises scope, meaning, and action. Counts and decorative summaries must not pull attention above direct obligations.

## 7. Keyboard Focus Order

```text
1  Skip to Home content
2  Organisation selector
3  Global search / command
4  Attention and decisions utilities
5  Global workspace navigation
6  Responsibility context and time horizon
7  Orientation Brief actions and sources
8  Action Required items, ordered by governed priority
9  Material Change groups
10 Forthcoming Work
11 Recent and Saved Contexts
12 Optional role context
13 AI Work
14 Contextual Detail Panel when open
15 Status/help actions
```

- Focus follows semantic order, not visual column geometry.
- Opening Detail moves focus to its heading; closing returns focus to the originating item.
- Enter opens the selected item. Context-menu commands remain available through the keyboard.
- Escape closes the current transient layer before changing workspace context.

## 8. Empty State Wireframe

```text
+--------------------------------------------------------------------------------------+
| GLOBAL HEADER / NAVIGATION                                                           |
+------------------+-------------------------------------------------------------------+
| GLOBAL NAV       | HOME CONTEXT: Organisation A / Current responsibility             |
|                  +-------------------------------------------------------------------+
|                  | ORIENTATION                                                       |
|                  | No direct action is currently required.                           |
|                  | Sources verified: [time]   Horizon: [range]                       |
|                  +--------------------------------------+----------------------------+
|                  | ACTION REQUIRED                      | MATERIAL CHANGE             |
|                  | No decisions, requests, or blocked   | No material changes since  |
|                  | work need you in this scope.         | the last verified review.  |
|                  | [Change scope]                       | [Inspect source coverage]  |
|                  +--------------------------------------+----------------------------+
|                  | CONTINUITY                                                        |
|                  | [Resume recent context] [Open saved context] [Find a Project]     |
|                  +-------------------------------------------------------------------+
|                  | AI unavailable or not needed; deterministic Home remains complete |
+------------------+-------------------------------------------------------------------+
```

### Empty-state rules

- A positive empty state appears only after required sources load successfully.
- New users receive an explanation and a valid discovery or access-request path.
- Active filters are stated when they produce no results.
- Missing permission does not expose hidden widgets or object counts.
- Home does not prompt users to create artificial work to fill space.

## 9. Loading State Wireframe

```text
+--------------------------------------------------------------------------------------+
| GLOBAL HEADER: organisation and account controls available                           |
+------------------+-------------------------------------------------------------------+
| GLOBAL NAV       | HOME CONTEXT: loading permissions and preferences                 |
| available        +-------------------------------------------------------------------+
|                  | ORIENTATION: [structured loading placeholder]                     |
|                  +--------------------------------------+----------------------------+
|                  | ACTION REQUIRED                      | MATERIAL CHANGE             |
|                  | [loading direct obligations]         | [loading source changes]   |
|                  | Do not display zero counts           |                            |
|                  +--------------------------------------+----------------------------+
|                  | CONTINUITY: recent valid contexts load independently              |
|                  +-------------------------------------------------------------------+
|                  | AI synthesis begins only after deterministic sources are useful   |
+------------------+-------------------------------------------------------------------+
```

### Loading-state rules

- Load identity, organisation, permission, and deterministic obligations first.
- Preserve stable zone positions during progressive loading.
- Loaded navigation and actions remain usable.
- Never show zero while the value is unknown.
- Last-known data includes a timestamp and stale label.
- AI does not block first meaningful content.

## 10. Responsive Validation Notes

This artifact is desktop-first. For narrower desktop widths:

- P5 and P6 may become sequential while retaining semantic order.
- P7 and P8 may become sequential.
- P11 may use an alternate temporary presentation but must preserve selection and return focus.
- Global navigation may reduce its footprint without changing the workspace hierarchy.
- No widget may be removed solely because the viewport narrows; content may be progressively disclosed.

## UX Strengths

- Prioritises orientation and direct obligations over generic dashboard metrics.
- Keeps one canonical truth and routes actions to owning workspaces.
- Supports all approved personas through priority rather than separate Home products.
- Provides clear places for causal change, continuity, and AI without letting them dominate.
- Creates a predictable semantic and keyboard order.
- Includes trustworthy empty and loading states that distinguish calm from missing data.

## Open Questions

1. How much text can the Orientation Brief contain before it slows scanning?
2. Should Decisions & Approvals remain embedded in Action Required or support a persistent dedicated Home destination simultaneously?
3. Which consequence thresholds elevate Material Change beside direct obligations?
4. How should multiple concurrent responsibility contexts be named and selected without implying separate personas?
5. Which bounded decisions, if any, contain sufficient evidence for completion directly from Home?
6. What is the acceptable maximum number of visible Action Required items before grouping is mandatory?
7. How should delegation and leave affect priority without obscuring original accountability?

## Suggested Improvements Before High-Fidelity Design

1. Test the information hierarchy with all five primary personas using realistic mixed-priority data.
2. Validate whether users correctly distinguish notification state from source-work state.
3. Test the Orientation Brief with deterministic, AI-assisted, stale-source, and conflicting-evidence variants.
4. Validate keyboard navigation through mixed two-column and sequential arrangements.
5. Prototype causal grouping for one source change affecting many Project objects.
6. Establish content limits and truncation rules for each widget before visual design.
7. Define permission and privacy test cases for role context, Resource signals, and Executive summaries.

## References

- [Home Workspace](../workspaces/HOME_WORKSPACE.md)
- [Information Architecture Blueprint](../architecture/INFORMATION_ARCHITECTURE_BLUEPRINT.md)
- [UX-ADR-001](../architecture/UX-ADR-001_WORKSPACE_FIRST_ARCHITECTURE.md)
