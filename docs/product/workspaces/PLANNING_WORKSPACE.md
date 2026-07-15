# Planning Workspace

## Status

Proposed for approval.

## Document Control

| Field            | Value                                                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Initiative       | PM Platform Product UX Evolution                                                                                                      |
| Workspace        | Planning                                                                                                                              |
| Document type    | Definitive implementation-ready UX workspace specification                                                                            |
| Inputs           | RP-001; RP-002; UX-ADR-001; Information Architecture Blueprint; Home Workspace Specification                                          |
| Primary personas | Project Manager; Program Manager; Planner or Scheduler; Technical or Resource Manager; authorized Team Member and Executive reviewers |
| Applies to       | Project and Program planning, desktop-primary editing, review experiences, and contextual mobile access                               |
| Excludes         | UI styling, colors, component design, frontend code, backend implementation, and changes to established domain ownership              |

## Planning Authority and Boundaries

Planning is the authoritative experience for creating and maintaining work breakdown, schedule structure, dependencies, milestones, scenarios, baselines, forecasts, and planning demand. It presents Scheduling Engine calculations but does not redefine them.

Planning must preserve these established boundaries:

- Planning owns plan orchestration, planning task and dependency state, scenarios, planning decisions, and workspace read models.
- The Scheduling Engine owns graph validation, forward pass, backward pass, float, and critical-path calculation.
- Projects owns Project identity, execution evidence, RAID, and Project-level decisions outside plan-specific governance.
- Resources owns Resource profiles, skills, capacity, availability, Calendars, and Resource-centered assignments.
- Calendars owns Calendar definitions and lifecycle.
- A planning interaction cannot cause Calendar, Resource, or Scheduling domains to mutate data they do not own.
- Automatic resource leveling and silent date mutation are not approved behavior.

The workspace is not a copy of a legacy planning product. Its interaction model is derived from PM Platform’s canonical objects, context-preservation rules, decision workflows, and AI governance.

## 1. Workspace Purpose

The Planning Workspace enables authorized participants to build, understand, compare, govern, and maintain a credible model of how intended outcomes can be delivered over time.

It provides one synchronized planning context for:

- hierarchical task planning;
- timeline and Gantt planning;
- milestones, constraints, and dependencies;
- calculated schedule awareness, including float and critical path;
- Resource demand, allocation context, and capacity visibility;
- live-plan editing and non-destructive scenario modeling;
- baseline and forecast comparison;
- collaboration, review, and approval;
- keyboard-first, inline, multi-select, and bulk productivity;
- AI-assisted planning with reviewable proposed changes.

Planning answers:

1. What work and milestones are required?
2. How is the work structured and related?
3. What dates are calculated, committed, forecast, or constrained?
4. Which dependencies and tasks drive outcomes?
5. Where do Resource demand and capacity create feasibility concerns?
6. What changes if the plan is edited?
7. Which state is live, hypothetical, baselined, or historical?
8. What decision or approval is required before a consequential change becomes authoritative?

### 1.1 Non-goals

The Planning Workspace is not:

- a general task execution inbox;
- a Calendar administration experience;
- an autonomous resource-leveling engine;
- a place to maintain Resource profiles or capacity policies;
- a replacement for Project RAID, evidence, or stakeholder decisions;
- a static Gantt report;
- a spreadsheet whose cells define independent business truth;
- an AI-generated plan accepted without human review;
- an unrestricted drawing canvas.

## 2. User Goals

### 2.1 Project Manager or Planner

- Decompose outcomes into an understandable work breakdown.
- Create and maintain a feasible schedule quickly.
- See the effect of dependencies, constraints, progress, and date changes.
- Compare current forecast with approved baseline.
- Identify critical and near-critical work.
- understand Resource demand and conflicts before committing.
- Prepare schedule changes for approval with clear consequences.
- Keep the plan credible without duplicating execution updates.

### 2.2 Program Manager

- Understand cross-Project timing, milestones, and dependencies.
- Identify schedule contagion and shared constraints.
- Compare Project forecasts without flattening source context.
- Prepare Program-level options and decisions.
- Inspect source plans without creating a duplicate Program schedule.

### 2.3 Technical or Resource Manager

- Understand when capability is required and for how long.
- Inspect assignment demand against capacity and availability.
- Identify overload, skill concentration, and continuity risk.
- Negotiate alternatives without silently changing Project commitments.
- Review resource-related scenario consequences.

### 2.4 Team Member

- Understand planned work, sequence, dependencies, and milestone context.
- Review changes affecting commitments.
- provide estimates, evidence, or feedback where authorized.
- Avoid unnecessary schedule-administration complexity.

### 2.5 Executive or stakeholder reviewer

- Understand milestone confidence, major drivers, critical decisions, and baseline variance.
- Inspect evidence behind a forecast without editing the plan accidentally.
- Review or approve a consequential change within authority.

### 2.6 Workspace success outcome

A planning session succeeds when the user leaves with a more credible plan, a clearly understood consequence, a reviewed scenario, an explicit decision request, or justified confidence that no intervention is required.

## 3. Workspace Zones

Zones define responsibility and interaction order. They do not prescribe physical layout or styling.

### 3.1 Zone architecture

```text
Planning Workspace
├── Zone A: Plan Identity & Governance
│   ├── Project/Program and plan identity
│   ├── live/scenario/baseline/forecast state
│   ├── permissions, freshness, collaborators
│   └── unsaved, pending, approved, or calculation state
│
├── Zone B: Planning Command Surface
│   ├── toolbar
│   ├── search, filters, view, zoom
│   ├── edit, structure, schedule, analyze
│   └── undo, redo, review, share, AI
│
├── Zone C: Primary Planning Canvas
│   ├── grid
│   ├── timeline/Gantt
│   ├── dependency network
│   ├── resource demand
│   └── scenario comparison
│
├── Zone D: Detail & Consequence
│   ├── selected object details
│   ├── validation and calculation explanation
│   ├── dependencies, assignments, evidence
│   └── change impact and history
│
└── Zone E: Collaboration & Assistance
    ├── comments, reviews, and planning decisions
    ├── presence and conflicting change
    ├── notifications and watches
    └── AI analysis and proposed change sets
```

### 3.2 Zone A: Plan Identity & Governance

Always communicates:

- organization;
- Project or Program context;
- plan name and immutable identity;
- plan state: Live Plan, Scenario, Approved Baseline, Forecast, or Historical Snapshot;
- effective date or calculation timestamp;
- edit permission and applicable approval requirements;
- calculation, validation, save, conflict, stale, or degraded state;
- active collaborators when collaboration state is relevant.

The user must never mistake a Scenario, Baseline, or historical state for the Live Plan.

### 3.3 Zone B: Planning Command Surface

Contains the deterministic controls required for repeated planning work. It adapts to selection, view, permission, and plan state, but command names and meaning remain stable.

### 3.4 Zone C: Primary Planning Canvas

Presents one canonical plan through the selected view. Selection, hierarchy, filters, date range, and object identity remain synchronized across views. Switching view does not recalculate or mutate the plan.

### 3.5 Zone D: Detail & Consequence

Provides focused depth without forcing users to leave the plan. It is the primary place for fields that are important but unsuitable for constant display, relationship detail, validations, source evidence, comments, change impact, and review.

### 3.6 Zone E: Collaboration & Assistance

Provides contextual human and AI participation. It must not obscure the plan or create a second editing model. Durable decisions and proposed changes resolve through governed plan workflows.

## 4. Toolbar Architecture

### 4.1 Toolbar purpose

The toolbar exposes frequent planning commands, communicates their current scope, and provides a discoverable bridge to the full command palette. It is not a container for every possible action.

### 4.2 Command groups

| Group         | Responsibilities                     | Representative commands                                                |
| ------------- | ------------------------------------ | ---------------------------------------------------------------------- |
| Context       | Confirm or change valid plan context | Select plan, scenario, baseline, date horizon                          |
| History       | Recover from user changes            | Undo, redo, change history                                             |
| Create        | Add canonical planning objects       | Add task, summary task, milestone, dependency                          |
| Structure     | Maintain work breakdown              | Indent, outdent, reorder, expand, collapse                             |
| Edit          | Modify current selection             | Edit, duplicate into draft, delete, clear field                        |
| Schedule      | Work with dates and relationships    | Link, unlink, constraint, recalculate, validate                        |
| View          | Choose synchronized representation   | Integrated, Grid, Timeline, Gantt, Network, Resource, Compare          |
| Scope         | Refine visible planning context      | Search, filter, group, columns, show/hide completed                    |
| Time          | Navigate chronological context       | Today, fit selection, date range, zoom                                 |
| Analysis      | Inspect schedule consequence         | Critical path, float, variance, resource pressure, explain calculation |
| Collaboration | Coordinate review                    | Comment, request review, create decision, share context                |
| AI            | Request bounded assistance           | Explain, analyze, propose change set, compare scenarios                |
| Commit        | Complete governed edit lifecycle     | Save draft, submit change, approve/reject where authorized             |

### 4.3 Toolbar rules

- Commands operate on the visible scope and current selection; both remain explicit.
- Disabled commands explain the missing permission, context, validation, or plan state when safe.
- Less frequent actions remain available through the command palette and context menus.
- Toolbar state cannot be the only indication of unsaved work or calculation status.
- Read-only users receive analysis, navigation, view, search, and permitted collaboration commands without misleading editing controls.
- Scenario commands cannot silently affect the Live Plan.
- Approval commands identify the decision and authority, not merely “Save.”
- On narrower viewports, command priority may collapse but the same command taxonomy and keyboard access remain available.

### 4.4 Save and recalculation model

The workspace distinguishes:

```text
Local edit state
  -> field validation
    -> plan validation
      -> schedule calculation
        -> consequence review when required
          -> persistence
            -> collaborative confirmation and audit
```

Simple, low-consequence valid field edits may persist without a separate modal confirmation. Schedule-affecting edits show calculation progress and resulting dates. Changes exceeding governed consequence thresholds require explicit review or approval before becoming authoritative.

## 5. Planning Views

### 5.1 View catalogue

| View               | Primary job                                                 | Editing level                       | Default audience                     |
| ------------------ | ----------------------------------------------------------- | ----------------------------------- | ------------------------------------ |
| Integrated Plan    | Plan structure and time together                            | Full within permission              | Project Manager, Planner             |
| Grid               | High-throughput structured planning and bulk editing        | Full                                | Planner, Project Manager             |
| Timeline           | Communicate phases, milestones, and major sequence          | Limited                             | Program Manager, stakeholder, review |
| Gantt              | Detailed date, duration, hierarchy, and dependency planning | Full                                | Planner, Project Manager             |
| Dependency Network | Understand relationship structure, cycles, and drivers      | Relationship editing                | Planner, Program Manager             |
| Resource Demand    | Compare planned demand with authorized capacity signals     | Demand editing; assignment proposal | Resource/Technical Manager, PM       |
| Scenario Compare   | Compare alternatives against live plan or baseline          | Review and selective promotion      | PM, Program Manager, approver        |
| Review             | Inspect proposed changes, comments, and decisions           | Approve/reject/request change       | Authorized reviewer                  |

### 5.2 Integrated Plan view

Integrated Plan is the default authoring view when a user has planning responsibility. It synchronizes a hierarchical grid with a detailed time canvas.

Rules:

- One shared vertical position and row identity.
- Independent horizontal navigation for grid columns and time canvas.
- Selection in either representation selects the same planning object.
- Expanding or collapsing hierarchy affects both representations.
- Resizing the division is a personal preference and does not alter plan data.
- The user can temporarily focus Grid or Gantt without losing selection, filters, date range, or history.

### 5.3 Grid view

Optimized for structure, data quality, inline editing, keyboard use, comparison, and bulk change. Grid behavior is defined in Section 6.

### 5.4 Timeline view

Timeline is a concise chronological view of phases, milestones, decision gates, and major dependencies. It is not a simplified Gantt with hidden detail.

Timeline supports:

- outcome and phase communication;
- milestone sequence;
- cross-Project or Program review;
- baseline and forecast markers;
- major decision and constraint context;
- progressive access to underlying plan objects.

Timeline does not support unrestricted task-level dependency creation or dense bulk editing. Users transition to Gantt or Grid with context preserved for detailed work.

### 5.5 Gantt view

Gantt is the detailed time-phased planning view synchronized with task hierarchy, schedule fields, dependencies, constraints, baseline, forecast, float, and criticality. Behavior is defined in Section 8.

### 5.6 Dependency Network view

Presents dependency relationships as a navigable planning graph. It supports finding missing, invalid, circular, highly connected, or cross-Project relationships. Layout is a representation and does not affect schedule meaning.

### 5.7 Resource Demand view

Shows time-phased demand from plan work alongside only the capacity and availability information the user is authorized to see. It distinguishes:

- unassigned demand;
- proposed assignment;
- committed assignment;
- nominal capacity;
- availability;
- overload or conflict;
- missing or stale capacity evidence.

It does not expose private Resource data unnecessarily and does not perform automatic leveling.

### 5.8 Scenario Compare view

Compares a Scenario with the Live Plan, another Scenario, or an approved Baseline. It shows object additions, removals, field changes, date consequences, dependency changes, milestone movement, critical-path changes, Resource demand changes, and unresolved validation.

Users may selectively promote approved Scenario changes only through a governed change set. Scenario promotion is not a file replacement or silent overwrite.

### 5.9 View continuity

Across all views, preserve:

- plan and scenario identity;
- selected objects;
- compatible filters and date range;
- expansion state where meaningful;
- active comparison target;
- unsaved valid edits;
- return context;
- undo boundary where safe.

## 6. Grid Behavior

### 6.1 Row types

| Row type              | Purpose                                                 | Schedule behavior                                                   |
| --------------------- | ------------------------------------------------------- | ------------------------------------------------------------------- |
| Summary task or phase | Groups and rolls up child work                          | Calculated from children; direct edits limited to approved metadata |
| Work task             | Represents schedulable planned work                     | Dates, duration, dependencies, progress, demand as supported        |
| Milestone             | Represents a zero-duration event or decision point      | Single date; may participate in dependencies                        |
| Reference row         | Shows authorized external or cross-Project relationship | Read-only unless editing occurs in owning plan                      |

Row type is explicit. Converting type requires validation and consequence review when fields or relationships become incompatible.

### 6.2 Hierarchy behavior

- WBS identity is separate from row position and display numbering.
- Expand and collapse affect presentation only.
- Indent establishes parent-child structure only when the target type permits children.
- Outdent preserves valid relative order.
- Reparenting cannot create circular hierarchy.
- Summary dates, progress, duration, and analysis values use governed rollup rules and are not manually overridden unless an approved field explicitly permits it.
- Hidden descendants remain accounted for in rollups and validation.
- WBS renumbering caused by move does not break canonical links, comments, dependencies, or audit history.

### 6.3 Column architecture

Columns belong to governed groups:

- identity and WBS;
- schedule and duration;
- progress and execution evidence;
- dependency and constraint;
- ownership and Resource demand;
- baseline and variance;
- schedule analysis, including early/late dates, float, and criticality;
- governance, confidence, freshness, and change state;
- organization-approved extension fields.

Default columns are role- and view-appropriate. Users may configure visibility and order without changing definitions. Shared column views require an owner and governed schema.

### 6.4 Inline editing lifecycle

```text
Focus cell
  -> enter edit
    -> retain original value
      -> validate input
        -> show local error or accept draft
          -> recalculate affected plan when required
            -> show consequence
              -> persist or submit
```

Rules:

- Enter, double activation, typing on an editable focused cell, or an explicit command begins editing.
- Escape cancels and restores the original value before commit.
- Enter commits the field and remains in context; Tab commits and advances to the next editable field.
- Pasted multi-cell values enter a preview and validation phase before persistence.
- Invalid values remain associated with their cells and are summarized for batch correction.
- Read-only calculated cells explain their source or calculation when requested.
- Schedule-affecting edits identify recalculation and downstream movement.
- Concurrent external change prevents silent overwrite and offers compare/reapply behavior.

### 6.5 Date and duration editing

- Dates always display the applicable time zone, Calendar basis, and whether they are input, calculated, forecast, or baseline when ambiguity exists.
- Duration has a visible unit and uses organization-approved parsing.
- Milestones cannot acquire positive duration without an explicit type conversion.
- Summary dates normally roll up from children.
- Changing a date or duration that conflicts with a dependency or constraint triggers validation, not silent relationship deletion.
- Manual constraint creation is explicit and identifies its scheduling consequence.
- Actual execution evidence is not overwritten by a planning date edit.

### 6.6 Data entry acceleration

Grid supports:

- add next sibling;
- add child;
- duplicate into a draft row;
- fill down or apply-to-selection for compatible fields;
- paste from tabular sources with column mapping and preview;
- copy values without copying canonical identity;
- reusable task templates governed by the organization;
- command-driven column and field navigation.

The workspace never treats a large paste as successfully applied until validation and persistence results are known.

## 7. Timeline Behavior

### 7.1 Timeline purpose

Timeline communicates significant sequence and outcome movement at lower cognitive density than detailed Gantt. It answers “what happens when, what moved, and what matters?” rather than “what is every task field?”

### 7.2 Timeline content

The timeline may show:

- phases or summary work;
- milestones and decision gates;
- approved baseline and current forecast;
- major constraints;
- major cross-Project dependencies;
- selected critical or near-critical path context;
- progress and confidence where governed;
- material change since a selected comparison point.

### 7.3 Time navigation

- Zoom levels use meaningful units and maintain the selected focal date.
- “Today” moves to the current date without changing selection.
- “Fit plan” fits the visible filtered scope, not hidden unrelated work.
- “Fit selection” focuses selected objects with sufficient surrounding context.
- Panning does not change date filters or plan scope.
- Date range changes are explicit and shareable when appropriate.

### 7.4 Timeline editing

- Milestone movement may be edited when authorized, subject to dependency and consequence validation.
- Phase boundaries derived from child tasks are not directly dragged as if independent.
- High-level movement that implies changes to multiple child tasks becomes a proposed change set, not an opaque bulk shift.
- Cross-Project objects are edited only in their owning plan.
- Baseline markers are immutable in ordinary editing.

### 7.5 Comparison behavior

When baseline, prior forecast, or Scenario comparison is active, Timeline distinguishes current state from comparison state semantically and exposes variance values. It never relies on visual styling alone to communicate which state is authoritative.

## 8. Gantt Behavior

### 8.1 Gantt purpose

Gantt provides detailed, high-density schedule understanding and editing while preserving hierarchy, relationships, and calculation authority.

### 8.2 Gantt object semantics

- Work tasks show planned time span.
- Milestones show a zero-duration event at a date.
- Summary tasks show rolled-up child span and are not independent movable tasks by default.
- Dependencies connect canonical predecessor and successor objects.
- Baseline and forecast are comparison states, not editable task bars.
- Critical and near-critical state derives from calculation and threshold policy.
- Actual progress or execution evidence is distinct from planned duration.

### 8.3 Bar selection and editing

- Selecting a bar selects the corresponding row and object.
- Dragging the whole task changes the permitted planned position while retaining duration, subject to validation.
- Dragging an approved edge changes duration or finish/start according to scheduling rules.
- The proposed result is visible before drop.
- On drop, validation and consequence calculation occur before authoritative persistence.
- Invalid drops return the object to its prior state and explain the governing rule.
- Summary bars cannot be independently moved when dates are derived.
- Milestones move as a single date.
- Cross-Project references remain read-only.

### 8.4 Dependency interaction

Dependency creation requires an explicit predecessor, successor, type, and optional lag or lead within policy. Supported types are presented using both name and meaning:

- Finish-to-Start;
- Start-to-Start;
- Finish-to-Finish;
- Start-to-Finish.

Rules:

- The default type may be organization-configured but remains visible before commit.
- Self-dependency and duplicate-equivalent dependency are rejected.
- Cycle detection occurs before persistence.
- Summary-task dependency policy is explicit; unsupported relationships are rejected rather than transformed silently.
- Cross-Project dependencies identify both owning plans and authorization requirements.
- Deleting a dependency shows affected dates before consequential commit where feasible.
- Dependency lines remain discoverable through keyboard and Detail Panel, not pointer-only interaction.

### 8.5 Critical-path awareness

Critical path is analysis, not decoration. The workspace provides:

- critical task status;
- total and free float;
- path membership and path sequence;
- calculation timestamp and input completeness;
- explanation of which dependency or constraint drives a selected date;
- near-critical threshold where organization policy defines one;
- comparison of critical-path change between Scenario, Live Plan, and Baseline.

Critical-path focus may de-emphasize unrelated work but must preserve access to the full WBS. A missing or invalid dependency graph prevents unsupported critical-path claims and explains the limitation.

### 8.6 Baseline and forecast behavior

- Approved Baseline is immutable except through an authorized rebaseline workflow.
- Current forecast remains distinct from Baseline and actual evidence.
- Variance is calculated using governed definitions.
- Rebaseline requires reason, scope, consequence, authority, and audit.
- Gantt comparison never replaces the Live Plan with a Baseline representation.

## 9. Detail Panel Behavior

### 9.1 Purpose

The Detail Panel provides complete context for the current selection while keeping the plan visible. It is not a second page hierarchy or a substitute for Grid editing.

### 9.2 Content groups

For a task or milestone, the Detail Panel may include:

- identity, type, WBS, and parent;
- purpose or description;
- schedule fields and Calendar basis;
- constraints and assumptions;
- predecessors and successors;
- Resource demand, proposed/committed assignments, and capacity signals;
- progress and linked execution evidence;
- baseline, forecast, variance, float, and critical status;
- risks, issues, decisions, and documents linked by relationship;
- comments, reviews, and mentions;
- change history, freshness, and source ownership;
- validation and calculation explanation;
- AI explanations and proposed changes.

### 9.3 Selection behavior

- Single selection shows complete editable detail according to permission.
- Multi-selection shows shared fields, mixed-value status, validation scope, and applicable bulk actions.
- Dependency selection shows predecessor, successor, type, lag/lead, effect, and change history.
- Empty canvas selection shows plan-level context and validation summary.
- The panel preserves unsaved draft input when the user temporarily inspects related evidence, where safe.

### 9.4 Editing behavior

- Detail edits use the same validation, calculation, undo, and persistence model as Grid edits.
- A field changed in Detail updates all synchronized views after successful commit.
- Mixed values are never presented as one actual value.
- Sensitive Resource information follows purpose and permission boundaries.
- Links to canonical Project, Resource, RAID, Decision, or evidence objects preserve return context.

### 9.5 Panel continuity

The user may keep Detail focused while changing views. Closing Detail returns focus to the originating object. Direct deep links to a selected object may open the appropriate detail context without making Detail the canonical URL owner.

## 10. Multi-Selection

### 10.1 Selection types

- Single object.
- Contiguous range.
- Non-contiguous set.
- Visible filtered set.
- All matching results, only after explicit confirmation beyond loaded rows.
- Hierarchical selection with explicit choice to include or exclude descendants.

### 10.2 Selection rules

- Selection uses canonical object identity, not row index.
- Selection persists across synchronized Grid and Gantt views.
- Changing filter preserves selected hidden objects only when the workspace clearly reports their hidden status.
- Switching plans or Scenarios clears incompatible selection after warning when draft edits exist.
- Collapsing hierarchy does not silently deselect descendants.
- Read-only and editable items may be selected together, but actions report applicable and excluded items before execution.
- Summary tasks, work tasks, milestones, references, and dependencies expose only compatible multi-select actions.

### 10.3 Selection summary

The workspace always communicates:

- number selected;
- selection type and scope;
- hidden selected count;
- editable versus excluded count;
- descendant inclusion;
- affected date range or Projects when relevant.

### 10.4 Selection recovery

Escape clears the current selection tier before leaving the workspace. Undoing an operation restores the prior relevant selection. Browser or workspace return restores selection only when the objects remain valid and the saved context intentionally included it.

## 11. Bulk Operations

### 11.1 Approved bulk operations

Bulk operations may include, subject to type and permission:

- set owner or responsible role;
- set status, priority, classification, or approved extension field;
- change Calendar or scheduling policy where supported;
- shift dates or apply duration changes through a reviewed transformation;
- indent, outdent, or move hierarchy;
- add or remove tags;
- create a dependency chain with preview;
- clear a compatible field;
- assign or propose Resource demand;
- duplicate selected structure into a draft or Scenario;
- delete or archive eligible planning objects;
- export selected authorized data;
- request review or create a planning decision.

### 11.2 Bulk lifecycle

```text
Select scope
  -> choose operation
    -> configure transformation
      -> validate each object
        -> preview included, excluded, and failed items
          -> calculate schedule/resource consequence
            -> confirm or submit approval
              -> execute
                -> report results and preserve recovery
```

### 11.3 Partial validity

Before execution, the user chooses an approved behavior where policy permits:

- apply only to valid objects;
- correct invalid objects first;
- cancel the operation.

The workspace never silently skips invalid items. Results identify successful, unchanged, excluded, and failed objects.

### 11.4 Consequential bulk changes

Bulk date shifts, hierarchy moves, dependency creation/removal, Resource assignment proposals, deletions, and baseline-affecting operations require consequence preview. The preview includes downstream dates, milestones, critical path, Resource demand, and cross-Project effects where calculated.

### 11.5 Undo and audit

- One user-intended bulk operation appears as one logical history entry.
- Undo reverses the operation only when current state and policy make reversal safe.
- If later collaborative changes prevent full reversal, the workspace prepares a compensating change and explains conflicts.
- Consequential bulk operations record actor, scope, reason where required, before/after summary, validation result, and approval.

## 12. Drag-and-Drop Rules

### 12.1 General rules

- Drag-and-drop is an acceleration path, never the only path.
- Keyboard and command equivalents exist for every drag operation.
- The object, proposed target, and consequence remain clear before drop.
- Auto-scroll is controlled and stops when pointer or keyboard intent stops.
- Invalid targets are not offered as valid and explain the restriction when attempted.
- A drop does not bypass validation, calculation, approval, or audit.

### 12.2 Hierarchy drag

Dragging a row may reorder or reparent tasks. The proposed parent and sibling position remain explicit. The operation rejects circular hierarchy, invalid parent types, cross-plan movement without a dedicated workflow, and moves that violate locked or approved structure.

### 12.3 Time drag

Dragging a task bar proposes a date change. The workspace shows proposed start, finish, unchanged duration, and visible downstream effect before commit. Constraint or dependency conflicts are explained.

### 12.4 Edge drag

Dragging a task edge proposes duration or boundary change according to the scheduling model. It cannot alter actual evidence, Baseline, summary rollup, or milestone duration implicitly.

### 12.5 Dependency drag

Dragging between valid relationship anchors proposes a dependency. Before commit, the workspace identifies predecessor, successor, type, and lag/lead. Cycle and duplicate validation precede persistence.

### 12.6 Resource drag

Dragging a Resource onto demand creates a proposed assignment only where policy permits. It exposes availability, capacity, conflict, and assignment scope. It does not silently create a committed assignment or change schedule dates.

### 12.7 Multi-object drag

Dragging multiple tasks preserves relative structure and dates unless the selected transformation explicitly changes them. A preview shows all affected objects and excludes incompatible selections visibly.

## 13. Keyboard Shortcuts

### 13.1 Keyboard model

The workspace is fully operable without a pointer. Shortcuts use a platform-appropriate Primary modifier (`Command` on macOS, `Control` on Windows/Linux) and avoid overriding essential browser, operating-system, and assistive-technology behavior.

Shortcuts are disabled while typing unless explicitly valid for the editing context. Every shortcut is discoverable through commands and help. Organization policy may provide a standard keymap; users may remap eligible shortcuts without changing command semantics.

### 13.2 Core shortcuts

| Intent                                  | Default shortcut or key behavior                                     |
| --------------------------------------- | -------------------------------------------------------------------- |
| Open global command palette             | `Primary+K`                                                          |
| Open Planning command list              | `Primary+Shift+K`                                                    |
| Search within plan                      | `Primary+F`                                                          |
| Navigate cells or objects               | Arrow keys                                                           |
| Extend contiguous selection             | `Shift+Arrow`                                                        |
| Toggle current object in selection      | `Primary+Space`                                                      |
| Select visible range anchor-to-focus    | `Shift+Space`, then navigation                                       |
| Enter edit or open selected detail      | `Enter`                                                              |
| Commit field and remain                 | `Enter` while editing                                                |
| Commit and advance                      | `Tab` / `Shift+Tab`                                                  |
| Cancel edit or clear selection tier     | `Escape`                                                             |
| Save draft or submit current valid edit | `Primary+Enter` where applicable                                     |
| Undo                                    | `Primary+Z`                                                          |
| Redo                                    | `Primary+Shift+Z`                                                    |
| Add task after selection                | `Primary+Enter` outside edit mode through configured command context |
| Add child task                          | `Primary+Shift+Enter` through configured command context             |
| Indent                                  | `Alt+Shift+Right`                                                    |
| Outdent                                 | `Alt+Shift+Left`                                                     |
| Move up                                 | `Alt+Shift+Up`                                                       |
| Move down                               | `Alt+Shift+Down`                                                     |
| Expand hierarchy                        | `Right` on collapsed row                                             |
| Collapse hierarchy                      | `Left` on expanded row                                               |
| Open context menu                       | `Shift+F10` or platform menu key                                     |
| Delete selection                        | `Delete` with governed confirmation behavior                         |
| Fit selection in time view              | Command palette and eligible remappable shortcut                     |
| Go to today                             | Command palette and eligible remappable shortcut                     |
| Open Detail Panel                       | Remappable Planning command                                          |
| Create dependency                       | Remappable Planning command followed by explicit target selection    |

Shortcuts that conflict with common text editing apply only outside edit mode. Single-letter shortcuts are not mandatory defaults.

### 13.3 Focus model

- Focus and selection are distinct and both perceivable.
- Moving focus does not change values or selection unless the shortcut explicitly does so.
- Grid, Gantt, Detail, toolbar, filters, and collaboration zones have predictable focus entry and exit.
- Focus returns to the originating object after closing a menu, Detail, dialog-like review, or analysis.
- Virtualized content maintains logical row and object position for assistive technology.

## 14. Context Menus

### 14.1 Purpose

Context menus provide relevant acceleration for the focused object or selection. They do not contain unique functionality unavailable through toolbar, Detail, or command palette.

### 14.2 Menu scopes

| Scope             | Commands                                                                                        |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| Grid cell         | Edit, clear, fill, copy value, explain field, show history                                      |
| Task row          | Add sibling/child, edit, indent/outdent, move, link, duplicate to draft, request review, delete |
| Summary row       | Add child, expand/collapse, inspect rollup, move valid structure, review variance               |
| Milestone         | Edit date, link dependency, inspect drivers, request decision                                   |
| Gantt bar         | Edit dates/duration, inspect dependencies, fit selection, explain schedule, show Detail         |
| Dependency        | Edit type/lag, inspect effect, navigate endpoints, delete with consequence                      |
| Multi-selection   | Compatible bulk operations, analyze selection, create review                                    |
| Blank plan canvas | Add object, paste with preview, change view/date scope, validate plan                           |
| Resource demand   | Inspect capacity, propose assignment, open Resource, create scenario                            |

### 14.3 Menu rules

- Commands follow stable group order and naming.
- Permission and plan-state restrictions apply identically across all invocation paths.
- Destructive commands remain separated semantically and require consequence-appropriate confirmation.
- Menus identify selection scope and hidden selected count for multi-select operations.
- Right-click, keyboard invocation, and assistive-technology invocation produce equivalent command sets.

## 15. AI Assistant Behavior

### 15.1 AI role

AI assists planning by assembling evidence, explaining calculations, identifying gaps, generating draft structures, comparing alternatives, and proposing reviewable change sets. It does not become the scheduling authority or plan owner.

### 15.2 Approved AI jobs

- Explain a selected task’s dates, float, criticality, or dependency drivers.
- Summarize material plan change since Baseline, prior forecast, or last review.
- Identify missing, weak, duplicate, or potentially incorrect dependencies.
- Detect incomplete milestones, unowned work, unsupported constraints, and inconsistent fields.
- Draft a WBS or milestone structure from approved outcome context.
- Propose duration, sequence, or dependency hypotheses with stated basis.
- Generate a Scenario from an explicit objective or constraint.
- Compare Scenarios and explain outcome, milestone, critical-path, and Resource-demand differences.
- Identify Resource pressure and prepare alternatives without automatic assignment.
- Prepare planning decision briefs and review notes.
- Translate natural language into filters, views, and deterministic commands.
- Answer plan questions with source references and calculation timestamp.

### 15.3 AI change-set model

AI plan changes always enter a proposed change set:

```text
User objective and scope
  -> AI plan of analysis
    -> source retrieval
      -> proposed additions/removals/changes
        -> validation and schedule calculation
          -> consequence comparison
            -> user accepts, rejects, or edits each change
              -> approval when required
                -> persistence and AI participation history
```

Each proposed change identifies object, field or relationship, current value, proposed value, rationale, source or assumption, confidence status, downstream consequence, and validation result.

### 15.4 AI autonomy limits

AI cannot autonomously:

- alter the Live Plan;
- establish or replace a Baseline;
- accept schedule risk;
- commit Project dates;
- assign people or change Resource availability;
- delete work or dependencies;
- override constraints or validation;
- conceal an invalid graph;
- publish an external plan or status;
- treat generated estimates as verified commitments.

### 15.5 AI transparency and failure

- AI declares active Project, Plan, Scenario, date range, filters, and sources.
- AI distinguishes source fact, calculation, inference, and recommendation.
- Missing or stale source coverage is visible.
- AI cannot claim a critical path when calculation is unavailable or invalid.
- User correction updates the proposal but not canonical plan state until accepted.
- If AI fails, deterministic planning, calculation, search, editing, and history remain fully usable.

## 16. Collaboration Model

### 16.1 Shared-plan principles

- One Live Plan is canonical.
- Scenarios are explicit branches with owners and sharing scope.
- Comments and reviews attach to canonical planning objects or change sets.
- Collaboration presence informs, but does not monitor productivity.
- No participant silently overwrites another participant’s committed change.

### 16.2 Presence

The workspace may communicate active collaborators, their current plan or Scenario, and which object or change set they are editing where policy permits. Presence is informational and cannot be used as performance evidence.

### 16.3 Concurrent editing

- Independent valid field edits may merge when they affect different objects or fields.
- Conflicting edits to the same authoritative field require comparison and user resolution.
- Structural, dependency, and schedule-affecting changes are validated against the latest plan version before commit.
- If recalculation changes between draft and commit, the user sees the updated consequence.
- A rejected or superseded edit remains recoverable as a draft or Scenario when appropriate.

### 16.4 Comments and review

Comments attach to task, milestone, dependency, plan, Scenario, change set, or planning decision. They support mentions, resolution state, and links to evidence. A resolved comment is not a resolved task, risk, or decision.

### 16.5 Planning decisions

Material scope, date, baseline, constraint, cross-Project dependency, and Resource commitment changes may create a planning decision containing:

- question;
- accountable decision-maker;
- options or proposed change set;
- source evidence;
- schedule and Resource consequence;
- deadline;
- recommendation status;
- decision, reason, dissent, and residual risk;
- resulting authoritative changes.

### 16.6 Sharing

Users may share:

- canonical Plan or planning object;
- current authorized view and date range;
- saved governed view;
- Scenario or comparison with explicit non-live status;
- review or decision request.

Personal filters, sensitive Resource information, and draft AI prompts are not shared implicitly.

## 17. Notifications

### 17.1 Notification triggers

Planning emits an attention item only for material, actionable, or explicitly followed change, including:

- decision or review request;
- approved or rejected change set;
- milestone or forecast movement crossing governed threshold;
- dependency change affecting owned work;
- newly critical or materially reduced float condition;
- invalid plan or failed calculation requiring action;
- Resource conflict affecting planned work;
- Baseline or rebaseline decision;
- cross-Project dependency change;
- comment mention or direct request;
- requested AI work requiring input or review.

Routine field saves, recalculations without material consequence, and the user’s own successful edits do not generate interruptive notifications.

### 17.2 Grouping

Notifications group by cause, plan, change set, and affected outcome. A single schedule change moving many tasks creates one causal notification with affected objects, not one notification per task.

### 17.3 Destination

Every planning notification resolves to the relevant Plan, Scenario, planning object, comparison, review, or decision with date range, selection, and return context preserved.

### 17.4 User control

Users may follow Plans, milestones, dependencies, Scenarios, reviews, and Resource-demand contexts. Mandatory decision and critical exception alerts cannot be hidden through ordinary watch preferences. Read or dismissal state remains distinct from source resolution.

## 18. Search & Filtering

### 18.1 Plan-local search

Plan-local search finds:

- WBS code and canonical identifier;
- task, summary, and milestone name;
- description and approved metadata;
- owner or Resource where permitted;
- dependency endpoint;
- constraint, decision, risk, issue, or linked evidence;
- extension fields allowed by organization policy.

Exact identifier and direct name matches rank before semantic matches. Results retain object type, hierarchy path, current lifecycle, and source Plan.

### 18.2 Global search continuity

Opening a Planning result from global search establishes organization, Project, Plan, object selection, and appropriate view. Returning to search preserves the query and result position.

### 18.3 Filter catalogue

Filters may include:

- hierarchy branch;
- row type;
- status or progress;
- owner and Resource demand;
- date range and date condition;
- milestone or summary membership;
- dependency state;
- constraint state;
- critical and near-critical status;
- float range;
- baseline variance;
- validation state;
- changed since comparison point;
- comment, review, or decision state;
- approved extension fields.

### 18.4 Filter behavior

- Active filters are always inspectable.
- Filtering changes presentation, not calculation scope, unless a dedicated analysis explicitly states otherwise.
- Hidden predecessors, successors, parents, children, or critical-path members are indicated when relevant to visible objects.
- “Show related context” may reveal relationship neighbors without clearing the primary filter.
- Saved filters include owner, sharing scope, definition, date behavior, and compatible views.
- Sensitive Resource filters respect purpose and permission.
- AI-generated filters display their deterministic interpretation and can be edited normally.

### 18.5 Group and sort

Grouping and sorting are view transformations. They cannot change WBS hierarchy unless the user performs an explicit structural operation. When a non-hierarchical sort is active, drag-to-reorder hierarchy is disabled or requires returning to WBS order.

### 18.6 Filtered operations

Bulk selection across filtered results requires explicit scope confirmation. Hidden selected items are reported. Consequence calculation still includes relevant hidden relationships and downstream work.

## 19. Performance Expectations

Performance is a core planning capability. The workspace must remain predictable during navigation, editing, calculation, collaboration, and view changes.

### 19.1 Reference schedule sizes

| Tier                |                                         Planning objects |                           Dependencies | Expected behavior                                               |
| ------------------- | -------------------------------------------------------: | -------------------------------------: | --------------------------------------------------------------- |
| Standard            |                                              Up to 2,000 |                            Up to 5,000 | Full interactive editing and analysis                           |
| Large               |                                             Up to 10,000 |                           Up to 25,000 | Virtualized editing, progressive analysis, stable interaction   |
| Program composition | Multiple source plans within authorized aggregate limits | Cross-Project plus source dependencies | Progressive, source-preserving review; no duplicate merged plan |

Higher limits require explicit performance validation and may use bounded aggregation while preserving canonical navigation.

### 19.2 Experience targets

| Experience                                           | Target                                                                                                          |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Workspace shell and Plan identity                    | Usable within 1 second at p75 and 2 seconds at p95 under supported desktop conditions                           |
| First meaningful Standard Plan content               | Within 2 seconds at p75 and 4 seconds at p95                                                                    |
| Keyboard, selection, focus, and edit acknowledgement | Within 100 milliseconds                                                                                         |
| Grid scroll and timeline pan                         | Sustained smooth interaction with no input loss; target 60 frames per second under Standard tier                |
| View switch with loaded source data                  | Meaningful view within 1 second at p75 while preserving selection and scope                                     |
| Search initial results                               | Within 1 second at p75 for Standard tier                                                                        |
| Local field validation                               | Immediate; expensive plan validation reported progressively                                                     |
| Schedule calculation                                 | Progress visible within 500 milliseconds; interaction remains safe while calculation proceeds                   |
| Bulk preview                                         | Initial scope and validation feedback within 1 second; progressive consequence calculation for large selections |
| Detail Panel selection change                        | Relevant loaded detail within 300 milliseconds                                                                  |
| Collaboration update                                 | Visible within 2 seconds under normal connected conditions                                                      |
| AI work                                              | Initial progress feedback within 1 second; never blocks deterministic editing or analysis                       |

### 19.3 Performance behavior

- Only visible and near-visible rows or time objects require full rendering, while keyboard and assistive semantics preserve logical position.
- Loading additional rows cannot change selection identity or scroll unexpectedly.
- Timeline zoom and pan reuse known plan data and request additional range progressively.
- Expensive dependency and critical-path analysis shows calculation version and remains consistent until the next result is ready.
- User input is never discarded because recalculation or collaboration updates are in progress.
- Optional Resource and comparison overlays load independently and declare freshness.
- Large operations may continue as governed work with progress and cancellation when safe.

### 19.4 Degraded behavior

If calculation, Resource capacity, collaboration, or AI is unavailable, the workspace identifies which conclusions and actions are affected. It does not present stale critical path, capacity, or forecast as current. Basic authorized navigation and safe editing remain available when domain rules permit.

## 20. Success Metrics

### 20.1 Outcome metrics

| Metric                                | Definition                                                                                   | Desired direction                   |
| ------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------- |
| Time to credible first plan           | Time from approved planning intent to valid reviewed plan structure                          | Decrease                            |
| Planning edit throughput              | Valid schedule changes completed per planning session without increased errors               | Increase                            |
| Keyboard workflow completion          | Frequent planning workflows completed without pointer                                        | Increase                            |
| Dependency completeness               | Required relationships present and valid before commitment                                   | Increase                            |
| Schedule validation failure rate      | Invalid changes reaching persistence or approval                                             | Decrease                            |
| Consequence comprehension             | Users correctly identify affected dates, milestones, critical path, and demand before commit | Increase                            |
| Baseline integrity                    | Unapproved or ambiguous baseline change                                                      | Approach zero                       |
| Forecast calibration                  | Forecast confidence and actual outcome alignment over time                                   | Improve                             |
| Decision latency                      | Time from schedule change ready for decision to governed outcome                             | Decrease                            |
| Scenario usefulness                   | Scenarios leading to informed decisions rather than abandoned copies                         | Increase                            |
| Resource conflict detection lead time | Time between conflict visibility and affected commitment                                     | Increase safely                     |
| Context restoration success           | Planning context resumes without manual reconstruction                                       | Increase                            |
| Collaborative conflict rate           | Silent overwrite or unresolved conflicting edit                                              | Approach zero                       |
| AI proposal acceptance quality        | Accepted changes remain valid and avoid later correction                                     | Increase, with correction monitored |

### 20.2 Guardrail metrics

- Schedule mutation outside Planning authority.
- Automatic Resource assignment or leveling without approval.
- Critical-path claim with invalid or stale calculation.
- Cross-Project or cross-organization context error.
- Bulk-operation unintended-change and reversal rate.
- Drag-and-drop correction or accidental-action rate.
- Accessibility task-completion parity.
- Performance by plan size and device class.
- Notification volume per material planning event.
- AI unsupported-change, rejected-change, and stale-source rates.
- Time spent reconciling duplicate plans or exported spreadsheets.

### 20.3 Metrics not approved as primary success measures

- Number of tasks created.
- Number of plan edits.
- Gantt viewing time.
- Percentage of Resources at maximum utilization.
- AI-generated task count.
- Notification opens.
- Individual planner activity volume.

### 20.4 Evaluation methods

Use workflow usability testing, keyboard-only and assistive-technology testing, large-plan performance testing, longitudinal schedule quality review, production telemetry under privacy governance, and audit sampling of consequential changes.

## 21. Extensibility

### 21.1 Approved extension areas

- Cost, budget, and financial time-phased planning.
- Calendar-aware SchedulingContext evolution after approved architecture review.
- Program scenario composition and Portfolio what-if planning.
- Organization-defined planning fields and task types within governed schema.
- External partner and supplier milestones with restricted access.
- Probabilistic range and confidence planning.
- Change-request workflow and benefits linkage.
- Advanced Resource demand and approved leveling assistance.
- Import/export and integration with governed mapping and validation.
- Mobile review and bounded planning actions.
- Additional AI planning skills registered through AI governance.

### 21.2 Adding a planning view

A new view must:

1. serve a distinct planning job not adequately supported by an existing view;
2. use canonical Plan objects and identity;
3. preserve compatible selection, filters, date range, and history;
4. define editing authority and synchronization behavior;
5. support keyboard, accessibility, search, deep links, and performance targets;
6. distinguish live, Scenario, Baseline, Forecast, and historical state;
7. avoid creating duplicate calculations or business truth.

### 21.3 Adding a planning field or object type

Extensions require a named domain owner, semantic definition, validation, calculation effect, rollup behavior, edit permissions, bulk and import behavior, search/filter behavior, audit behavior, and migration strategy. A custom field cannot override core schedule semantics.

### 21.4 Integration extensions

External planning sources may contribute references, evidence, proposed changes, or synchronized data through approved integration contracts. They cannot bypass canonical identity, validation, conflict resolution, approval, or audit. Mapping failures and source freshness remain visible.

### 21.5 AI extensions

An AI planning skill must declare allowed sources, permitted plan states, proposed action types, consequence thresholds, evaluation criteria, human approval points, audit behavior, and failure fallback. AI skills cannot gain broader authority by being invoked through a different view or integration.

### 21.6 Governance

Material changes to Planning authority, scheduling semantics, automatic leveling, Baseline governance, cross-Project mutation, Calendar-aware calculation, or AI autonomy require architecture review and an applicable ADR before this specification is extended.

## Approval Recommendation

**Recommendation: APPROVE THE PLANNING WORKSPACE SPECIFICATION.**

Approval establishes:

- Planning as the authoritative schedule planning experience;
- one canonical Plan with synchronized Integrated, Grid, Timeline, Gantt, Network, Resource Demand, Scenario Compare, and Review views;
- the five-zone workspace architecture and stable toolbar command taxonomy;
- explicit Grid, Timeline, Gantt, Detail, selection, bulk, drag, keyboard, and context-menu behavior;
- reviewable schedule consequence before material commitment;
- non-destructive Scenarios and protected Baselines;
- critical-path awareness grounded in Scheduling Engine calculation;
- Resource demand and capacity visibility without automatic leveling;
- governed collaboration and decision workflows;
- evidence-linked, change-set-based AI assistance;
- materiality-based notifications;
- enterprise search, filtering, performance, and extensibility contracts.

Approval authorizes frontend interaction design, technical decomposition, acceptance criteria, and implementation planning consistent with this specification. It does not authorize UI styling, changes to Scheduling Engine authority, automatic Resource leveling, autonomous AI plan mutation, or backend implementation outside approved engineering governance.

## References

- [RP-001: Personas and Jobs-to-be-Done](../research/RP-001_PERSONAS_AND_JOBS_TO_BE_DONE.md)
- [RP-002: Modern Product Benchmark](../research/RP-002_MODERN_PRODUCT_BENCHMARK.md)
- [UX-ADR-001: Workspace-First Architecture](../architecture/UX-ADR-001_WORKSPACE_FIRST_ARCHITECTURE.md)
- [Information Architecture Blueprint](../architecture/INFORMATION_ARCHITECTURE_BLUEPRINT.md)
- [Home Workspace](HOME_WORKSPACE.md)
- [Scheduling Architecture](../../architecture/05-SCHEDULING-ARCHITECTURE.md)
- [Project Workspace](PROJECT_WORKSPACE.md)
