# Planning Workspace — Low-Fidelity Desktop Wireframe

## Status and Scope

| Field     | Value                                                                   |
| --------- | ----------------------------------------------------------------------- |
| Artifact  | UX validation wireframe                                                 |
| Workspace | Planning                                                                |
| Fidelity  | Low                                                                     |
| Target    | Desktop, wide and standard laptop viewports                             |
| Source    | Planning Workspace Specification and Information Architecture Blueprint |
| Excludes  | Branding, visual styling, typography, components, and implementation    |

The wireframe represents the default Integrated Plan authoring view. Grid, Timeline, Gantt, Network, Resource Demand, Scenario Compare, and Review remain synchronized views of the same canonical Plan.

## 1. Overall Page Layout — Integrated Plan

```text
+----------------------------------------------------------------------------------------------------------+
| P1 GLOBAL HEADER                                                                                         |
| [Organisation] [Global search / command] [Attention] [Decisions] [User controls]                          |
+------------------+---------------------------------------------------------------------------------------+
| P2 GLOBAL NAV    | P3 PLAN IDENTITY & GOVERNANCE                                                         |
| Home             | Planning / Project Alpha / Live Plan     [Live] [Calculated time] [Permission]        |
| Portfolio        | [Scenario selector] [Baseline comparison] [Collaborators] [Save/calc/validation state]|
| Projects         +---------------------------------------------------------------------------------------+
| [Planning]       | P4 TOOLBAR                                                                             |
| Resources        | [Undo/Redo] [Add] [Structure] [Link] [View] [Columns] [Filter] [Zoom] [Analyse] [AI] |
| Intelligence     +-----------------------------------------------+---------------------------------------+
| Administration*  | P5 HIERARCHICAL GRID                          | P6 GANTT / TIME CANVAS                |
|                  | [Select] WBS | Task | Start | Finish | ...    | Date scale / today / Baseline         |
|                  | > 1 Summary phase                             | [summary span================]        |
|                  |   1.1 Work task                               |     [task==========]                  |
|                  |   1.2 Work task                               |             [task=======]            |
|                  |   1.3 Milestone                               |                    [milestone]        |
|                  | > 2 Summary phase                             |                       [summary====]   |
|                  |                                               | dependency relationships              |
|                  | [shared vertical selection and scroll]        | [independent horizontal time pan]     |
|                  +-----------------------------------------------+---------------------------+-----------+
|                  | P7 SELECTION / VALIDATION / CONSEQUENCE        | P8 DETAIL PANEL            |
|                  | 3 selected; 1 hidden by filter                 | Identity / schedule         |
|                  | Proposed change: milestone +5 working days     | Dependencies / constraints |
|                  | Affects 4 tasks; critical path changed         | Resource demand / evidence |
|                  | [Review] [Apply draft] [Cancel]                | History / comments / AI     |
+------------------+-----------------------------------------------+---------------------------+-----------+
| P9 COLLABORATION / STATUS: comments, review request, calculation progress, source degradation            |
+----------------------------------------------------------------------------------------------------------+
```

`*` Administration appears only when authorised.

### Layout intent

- Plan identity and authoritative state remain visible before any editing control.
- Toolbar commands follow the Planning command taxonomy and current selection.
- Grid and Gantt share row identity, vertical position, selection, hierarchy expansion, and undo history.
- Grid owns structured editing; Gantt owns time-phased understanding and direct schedule manipulation.
- Consequence state appears before material changes are committed.
- Detail remains adjacent to the selected object and preserves the Plan canvas.
- Collaboration and AI are contextual layers, not separate planning models.

## 2. Header and Navigation

### P1 — Global Header

- **Purpose:** Establish organisation and global utilities.
- **User goal:** Confirm security scope and use global retrieval or attention.
- **Reason for placement:** Every Plan belongs to an organisation and Project context.

### P2 — Global Navigation

- **Purpose:** Move among approved workspaces.
- **User goal:** Open Project evidence, Resource context, Portfolio consequence, or Intelligence analysis with Plan return context.
- **Reason for placement:** Planning remains one specialist workspace within the product architecture.

### P3 — Plan Identity & Governance

- **Purpose:** Show Project/Program, Plan, Live/Scenario/Baseline/Forecast state, calculation time, permission, collaborators, and save/validation status.
- **User goal:** Know which state is being inspected or changed and whether it is authoritative.
- **Reason for placement:** A user must never mistake a Scenario or Baseline for the Live Plan.
- **Primary actions:** Select approved Plan or Scenario; choose comparison; submit or review change when authorised.
- **Secondary actions:** Inspect history; share canonical or saved context.

## 3. Toolbar Architecture

### P4 — Toolbar

- **Purpose:** Expose frequent deterministic Planning commands.
- **User goal:** Create, structure, edit, link, filter, navigate time, analyse, collaborate, and request AI assistance efficiently.
- **Reason for placement:** The command surface remains adjacent to Plan state and selection.

```text
[History] [Create] [Structure] [Edit] [Schedule] [View] [Scope] [Time]
[Analysis] [Collaboration] [AI] [Commit / Review]
```

### Primary actions

- Add task, summary task, or milestone.
- Indent, outdent, and reorder.
- Create or edit dependency.
- Edit selected fields.
- Review and commit a valid change set.
- Open Scenario Compare.

### Secondary actions

- Change columns or view.
- Search, filter, group, and zoom.
- Show critical path, float, variance, or Resource pressure.
- Comment, request review, copy link, or ask AI to explain.

### Toolbar rules

- Command scope and selection remain explicit.
- Disabled commands explain missing context, permission, validation, or Plan state.
- All commands remain available through keyboard and command palette.
- Consequential changes do not use a generic one-step Save action.

## 4. Main Planning Areas

### P5 — Hierarchical Grid

- **Purpose:** Support high-throughput structured planning, inline editing, hierarchy, comparison, selection, and bulk operations.
- **User goal:** Create and maintain valid work breakdown and planning data quickly.
- **Reason for placement:** Stable row identity anchors the time canvas and supports keyboard-first productivity.
- **Primary actions:** Inline edit; add; select; indent/outdent; reorder; paste with preview; bulk update.
- **Secondary actions:** Configure columns; inspect calculated field; open Detail; filter.

### P6 — Gantt / Time Canvas

- **Purpose:** Show task spans, milestones, dependencies, Baseline, forecast, constraints, float, and critical-path context over time.
- **User goal:** Understand and adjust schedule consequence directly.
- **Reason for placement:** Time and structure must remain visible together in the default authoring view.
- **Primary actions:** Select task; propose move or duration change; create dependency; navigate time.
- **Secondary actions:** Fit selection; show Baseline/forecast; explain critical path; open Detail.

### P7 — Selection, Validation & Consequence

- **Purpose:** Communicate selected scope, invalid/excluded objects, proposed changes, recalculation, and downstream effects.
- **User goal:** Understand what will change before commitment.
- **Reason for placement:** It spans the planning canvas because consequences may involve both structured and time-phased state.
- **Primary actions:** Review; apply to draft/Scenario; submit; cancel.
- **Secondary actions:** Inspect affected objects; correct invalid values; save as Scenario.

### P8 — Detail Panel

- **Purpose:** Provide selected object identity, schedule fields, dependencies, constraints, Resource demand, evidence, analysis, history, comments, and AI explanation.
- **User goal:** Inspect or edit depth without losing the Plan.
- **Reason for placement:** Keeps detail adjacent to the primary canvas and selected object.
- **Rule:** Single and multi-selection use the same validation and persistence model as Grid/Gantt.

### P9 — Collaboration / Status

- **Purpose:** Communicate calculation, save, conflict, comment, review, and source-degradation state.
- **User goal:** Know whether the Plan is current, safe to edit, awaiting review, or affected by another participant.
- **Reason for placement:** Persistent status must remain available without obscuring the canvas.

## 5. Alternative View Wireframes

### Timeline view

```text
+--------------------------------------------------------------------------------------+
| PLAN IDENTITY / TOOLBAR: [Timeline] [Range] [Baseline] [Forecast] [Open Gantt]        |
+--------------------------------------------------------------------------------------+
| PROJECT / PROGRAM TIMELINE                                                           |
| Phase A [================]  M1 [milestone]                                            |
|                Phase B [========================]  Decision Gate [milestone]          |
| Baseline markers --------  Forecast markers --------  Major dependency --------      |
| [Select phase/milestone] [Open source] [Open detailed Planning]                      |
+--------------------------------------------------------------+-----------------------+
| MATERIAL MOVEMENT / UPCOMING GATES                           | DETAIL                |
+--------------------------------------------------------------+-----------------------+
```

- **Purpose:** Communicate phases, milestones, major dependencies, and decision gates at lower density.
- **Boundary:** No unrestricted task-level dependency authoring or bulk schedule manipulation.

### Dependency Network view

```text
+--------------------------------------------------------------------------------------+
| PLAN IDENTITY / TOOLBAR: [Network] [Search] [Filter] [Validate] [Critical drivers]   |
+--------------------------------------------------------------------------------------+
|                   [Task A] ---> [Task B] ---> [Milestone]                            |
|                       \             |                                                |
|                        ---> [Task C] ----> [Task D]                                   |
| [Missing relationship] [Cycle result] [Cross-Project reference]                     |
+--------------------------------------------------------------+-----------------------+
| RELATIONSHIP VALIDATION / PATH EXPLANATION                    | DEPENDENCY DETAIL     |
+--------------------------------------------------------------+-----------------------+
```

### Resource Demand view

```text
+--------------------------------------------------------------------------------------+
| PLAN IDENTITY / TOOLBAR: [Resource Demand] [Range] [Scenario] [Open Resources]        |
+--------------------------------------------------------------------------------------+
| DEMAND BY WORK / TIME                       | AUTHORISED CAPACITY SIGNAL              |
| Role/skill / planned demand                 | Capacity / availability / conflict     |
| Unassigned / proposed / committed           | Freshness / missing evidence           |
+---------------------------------------------+----------------------------------------+
| PROPOSED ASSIGNMENT OR DEMAND CHANGE / CONSEQUENCE / APPROVAL                        |
+--------------------------------------------------------------------------------------+
```

### Scenario Compare view

```text
+--------------------------------------------------------------------------------------+
| LIVE PLAN / BASELINE                     | SCENARIO B                                 |
| Current milestone / critical path        | Proposed milestone / critical path        |
| Current demand and validation            | Proposed demand and validation            |
+------------------------------------------+-------------------------------------------+
| CHANGE SET: additions / removals / fields / dependencies / dates / Resource demand   |
| [Accept selected into proposal] [Reject] [Edit Scenario] [Request review]             |
+--------------------------------------------------------------------------------------+
```

## 6. Information Hierarchy

```text
1. Organisation, Project, Plan, and authoritative state
2. Validation, calculation, permission, and collaboration state
3. Current selection and primary Planning canvas
4. Structured fields and time consequence
5. Proposed change and downstream impact
6. Detail, evidence, and analysis
7. Collaboration and AI assistance
```

Baseline, Scenario, Forecast, and Live state must remain semantically distinguishable without relying on visual styling.

## 7. Primary and Secondary User Paths

### Primary path — Edit and validate the Live Plan

```text
P3 confirm Live Plan and permission
  -> P5 select/edit task or P6 propose time change
    -> local field validation
      -> schedule calculation
        -> P7 inspect affected tasks/milestones/critical path/demand
          -> commit or submit approval
            -> canonical Plan update and audit
```

### Secondary path — Build and compare a Scenario

```text
P3 create/select Scenario
  -> edit structure, dates, dependencies, or demand
    -> validate and calculate Scenario
      -> Scenario Compare
        -> select proposed changes
          -> create governed change set
            -> review/approve before Live Plan mutation
```

### Investigation path — Explain milestone movement

```text
Select milestone in P5/P6
  -> P8 inspect dependencies, constraints, float, evidence
    -> [Explain schedule]
      -> cited deterministic calculation / AI explanation
        -> open source dependency, Risk, Resource, or decision
```

## 8. Expected Eye Flow

```text
Plan identity and authoritative state
                ↓
Toolbar and current command scope
                ↓
Grid structure  ↔  Gantt time consequence
                ↓
Selection / validation / proposed impact
                ↓
Detail / evidence / collaboration / AI
```

The flow keeps structure and time at equal authority and places consequences before commitment.

## 9. Keyboard Focus Order

```text
1  Skip to Planning content
2  Organisation selector
3  Global search / command
4  Global workspace navigation
5  Plan identity, Scenario, and comparison controls
6  Toolbar command groups
7  Grid header and active cell/row
8  Synchronized Gantt object for current selection
9  Selection / validation / consequence actions
10 Detail Panel when open
11 Collaboration and status actions
```

### Key interaction expectations

- Arrow keys navigate cells or planning objects.
- `Shift` extends contiguous selection.
- `Primary+Space` toggles selection membership.
- Enter edits or opens Detail according to context.
- Tab commits and advances among editable fields.
- Escape cancels the current edit or closes the current transient layer.
- Undo and redo operate on logical user changes.
- Structure, dependency, view, and analysis commands remain keyboard-accessible.
- Focus returns to the originating object after Detail, menus, or review closes.

## 10. Empty State Wireframe

```text
+----------------------------------------------------------------------------------------------------------+
| PLAN IDENTITY: Project Alpha / Live Plan / No planning objects                                           |
+----------------------------------------------------------------------------------------------------------+
| TOOLBAR: [Add task] [Add summary] [Add milestone] [Paste with preview] [Create Scenario] [Ask AI draft] |
+-----------------------------------------------+----------------------------------------------------------+
| HIERARCHICAL GRID                             | TIME CANVAS                                              |
| No tasks or milestones exist in this Plan.    | No schedulable objects to display.                       |
| Define outcomes before creating structure.    | Date range: [approved default]                           |
| [Add first task] [Use governed template]      | [Open Project outcome]                                   |
+-----------------------------------------------+----------------------------------------------------------+
| VALIDATION: Plan is empty; critical path and Resource demand are unavailable.                             |
+----------------------------------------------------------------------------------------------------------+
```

### Empty-state variants

- **New Plan:** Offer valid creation, governed template, paste-preview, or AI-draft paths.
- **Filtered to zero:** State active filters; preserve Plan and offer clear/reset.
- **Read-only empty Plan:** Explain no planned work and offer return to Project.
- **Invalid Plan:** Do not show empty; show validation summary and affected objects.
- **No Resource data:** Keep Plan usable and label Resource overlay unavailable or unconfigured.
- **AI unavailable:** Deterministic creation and editing remain complete.

## 11. Loading State Wireframe

```text
+----------------------------------------------------------------------------------------------------------+
| PLAN IDENTITY: identity / permission / Live-Scenario state available first                               |
+----------------------------------------------------------------------------------------------------------+
| TOOLBAR: safe navigation/view commands available; editing waits for authoritative version                |
+-----------------------------------------------+----------------------------------------------------------+
| GRID                                          | GANTT                                                    |
| [structured row placeholders]                 | [time-scale placeholder aligned to known range]          |
| Do not display zero dates or empty validation | Do not display stale critical path as current            |
+-----------------------------------------------+----------------------------------------------------------+
| STATUS: Loading Plan version -> dependencies -> calculation -> optional Resource overlay -> AI           |
+----------------------------------------------------------------------------------------------------------+
```

### Loading-state rules

- Plan identity, permission, and authoritative state load first.
- Editing begins only against a known Plan version.
- Grid and Gantt preserve aligned row positions during progressive loading.
- Calculation version and freshness remain explicit.
- Optional Resource overlays and AI load independently.
- Loaded navigation and safe actions remain available.
- No input is discarded during recalculation or collaborative refresh.

## 12. Detail Panel States

### Single task

Identity, schedule, constraints, dependencies, Resource demand, evidence, Baseline/forecast/float, comments, history, and explainable AI.

### Multi-selection

Shared fields, mixed values, editable/excluded counts, hidden selected objects, compatible bulk actions, and consequence preview.

### Dependency

Predecessor, successor, type, lag/lead, effect, validation, history, and delete/edit consequence.

### Plan-level

Validation summary, calculation status, source completeness, Scenario/Baseline state, collaborators, and Plan history.

## UX Strengths

- Keeps Plan authority and Live/Scenario/Baseline distinctions continuously visible.
- Synchronizes structure and time without forcing a choice between Grid and Gantt.
- Places validation and consequence before material commitment.
- Supports keyboard-first, inline, multi-select, bulk, and drag workflows through one command model.
- Gives Timeline, Network, Resource, and Scenario views distinct jobs rather than duplicating Gantt.
- Makes AI assistance reviewable and secondary to deterministic planning and calculation.

## Open Questions

1. What minimum grid width preserves effective keyboard planning while retaining useful Gantt context?
2. Should consequence preview remain persistently available or appear only after schedule-affecting edits?
3. Which low-consequence edits may persist immediately without explicit change-set review?
4. How should cross-Project dependency references appear when one source Plan is unavailable?
5. What near-critical threshold is useful without creating analysis noise?
6. How should concurrent structural edits be presented without imposing heavy locking?
7. Which mobile review actions are safe enough to support later without weakening Plan context?

## Suggested Improvements Before High-Fidelity Design

1. Validate Grid/Gantt proportions with Standard and Large schedules using 13–15 inch desktop viewports.
2. Test task creation, hierarchy editing, dependency creation, and milestone movement entirely by keyboard.
3. Validate Live versus Scenario versus Baseline comprehension without color cues.
4. Test consequence review for a change affecting critical path, milestones, and Resource demand simultaneously.
5. Prototype filtered views with hidden predecessors, selected hidden tasks, and relationship context.
6. Test concurrent-edit conflicts at field, hierarchy, and dependency levels.
7. Define content and interaction budgets for Detail and validation regions before visual design.

## References

- [Planning Workspace](../workspaces/PLANNING_WORKSPACE.md)
- [Project Workspace Specification](../workspaces/PROJECT_WORKSPACE_SPECIFICATION.md)
- [Resource Workspace](../workspaces/RESOURCE_WORKSPACE.md)
- [Information Architecture Blueprint](../architecture/INFORMATION_ARCHITECTURE_BLUEPRINT.md)
- [UX-ADR-001](../architecture/UX-ADR-001_WORKSPACE_FIRST_ARCHITECTURE.md)
