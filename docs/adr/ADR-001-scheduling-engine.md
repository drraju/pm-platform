# ADR-001: Scheduling Engine Architecture

## Status

Accepted

Date: 2026-07-08

Version:
v1.0.0-rc1

Decision Owner:
Ram Datla

Implementation:
Completed

Related ADRs:
- ADR-002 Planning Snapshot Architecture
- ADR-003 Planning Workspace

## Context

PM Platform requires a scheduling engine because the Planning Workspace must do
more than display task dates. Project managers need a deterministic way to
analyze schedule networks, validate dependencies, calculate float, identify the
critical path, support milestones, and keep summary rows consistent with their
children.

Earlier planning behavior could be handled with direct task dates and UI-level
Gantt rendering. That approach is not sufficient for enterprise project
management because downstream features such as portfolio reporting, baselines,
resource planning, schedule health, and AI schedule advisory need a consistent
backend scheduling authority.

Microsoft Project style scheduling was selected because it is the scheduling
model most familiar to enterprise project managers. The platform follows the
Critical Path Method pattern used by traditional project scheduling tools:

- dependency graph construction
- dependency validation
- topological ordering
- forward pass
- backward pass
- total float and free float calculation
- critical path identification
- summary task rollups
- milestone support

The current implementation supports:

- standard tasks
- summary tasks
- milestones
- WBS parent-child hierarchy
- Finish-to-Start dependencies
- Start-to-Start dependencies
- Finish-to-Finish dependencies
- cycle detection
- early start and early finish offsets
- late start and late finish offsets
- total float
- free float
- critical path flags
- summary rows as rollup containers
- zero-duration milestone scheduling

Start-to-Finish dependencies remain a legacy-compatible dependency type, but
they are not included in the scheduling graph.

## Decision

PM Platform will use an internal Scheduling Engine pipeline as the canonical
architecture for schedule analysis.

The single orchestration entry point is `PlanningScheduleEngineService`. Callers
provide planning tasks and dependencies. The service coordinates the lower-level
engine services in a fixed sequence and returns an immutable in-memory
`ScheduleAnalysis` model.

The pipeline is:

1. Dependency Graph
2. Topological Sort
3. Forward Pass
4. Backward Pass
5. Float Calculation
6. Critical Path Detection
7. ScheduleAnalysis assembly

### Dependency Graph

The graph builder converts planning tasks and schedule dependencies into an
in-memory graph. Each planning item becomes a node. Supported dependencies become
directed edges from predecessor to successor.

The graph includes standard tasks, summary tasks, and milestones. Summary tasks
are retained for WBS context and rollup behavior, but they are not executable
network nodes and cannot be dependency endpoints.

### Topological Sort

The graph builder validates the dependency network and produces a topological
order. This order ensures predecessors are processed before successors during
the forward pass. If the graph contains a cycle, scheduling stops before any
date or float calculation runs.

### Forward Pass

The forward pass calculates Early Start and Early Finish offsets for executable
tasks and milestones.

Executable nodes are processed in topological order. Each node evaluates its
incoming dependencies and uses the most restrictive predecessor constraint to
calculate Early Start. Early Finish is calculated from Early Start plus
duration. Milestones have zero duration, so their Early Start and Early Finish
are equal.

### Backward Pass

The backward pass calculates Latest Start and Latest Finish offsets.

The pass starts from the project finish, defined as the maximum Early Finish in
the forward-pass result. Nodes are processed in reverse topological order. Each
node evaluates successor constraints and calculates the latest window that does
not delay the project finish.

### Float Calculation

The float engine calculates Total Float and Free Float for executable nodes.

Total Float measures how far an activity can move without delaying the project
finish. Free Float measures how far an activity can move without affecting the
earliest start of a successor.

### Critical Path

The critical path service marks executable tasks and milestones as critical when
their Total Float is zero. Summary tasks are not marked critical because they are
rollup containers rather than executable schedule activities.

### Summary Rollups

Summary tasks are modeled as WBS containers. They do not participate directly in
dependency calculations. Their schedule dates and presentation values are
derived from child rows through planning rollup logic.

This keeps summary behavior aligned with enterprise planning tools: summary
rows describe the span of their descendants, while dependency analysis runs on
leaf tasks and milestones.

### Milestone Support

Milestones are zero-duration executable schedule nodes. They can participate in
dependencies, receive Early Start/Early Finish and Latest Start/Latest Finish
values, receive float values, and be marked critical.

## Algorithms

### Graph Construction

The graph builder performs the following steps:

1. Create one node for each planning task.
2. Attach WBS parent-child relationships.
3. Reject invalid or missing parent references.
4. Add supported dependency edges.
5. Reject missing predecessor or successor references.
6. Reject self-referencing dependencies.
7. Reject summary tasks as dependency endpoints.
8. Produce incoming and outgoing edge collections per node.
9. Run cycle detection and topological sort.

The graph construction complexity is `O(V + E)`, where `V` is the number of
tasks and `E` is the number of supported dependency edges.

### Cycle Detection

Cycle detection runs during graph validation. The scheduling engine treats a
circular dependency as an invalid graph because no deterministic topological
order can be produced.

If a cycle is found, the graph builder raises a validation error and the
orchestrator stops. Forward pass, backward pass, float calculation, and critical
path detection are not executed against an invalid graph.

### Earliest Start and Earliest Finish

The forward pass calculates Early Start and Early Finish for each executable
node.

For each task:

- start with `ES = 0`
- evaluate all incoming dependency constraints
- use the maximum constraint as the task's Early Start
- calculate `EF = ES + duration`

For milestones:

- duration is `0`
- `EF = ES`

Supported dependency rules:

| Type | Forward constraint |
| --- | --- |
| FS | successor `ES >= predecessor EF` |
| SS | successor `ES >= predecessor ES` |
| FF | successor `EF >= predecessor EF` |

### Latest Start and Latest Finish

The backward pass calculates Latest Start and Latest Finish for each executable
node.

The project finish is the maximum Early Finish from the forward pass. Terminal
nodes are anchored to that project finish. The engine then processes nodes in
reverse topological order and applies successor constraints.

For terminal tasks:

- `LF = project finish`
- `LS = LF - duration`

For milestones:

- duration is `0`
- `LS = LF`

Supported dependency rules:

| Type | Backward constraint |
| --- | --- |
| FS | predecessor `LF = min(successor LS)` |
| SS | predecessor `LS = min(successor LS)` |
| FF | predecessor `LF = min(successor LF)` |

### Total Float

Total Float is calculated from forward-pass and backward-pass results.

Formula:

```text
Total Float = LS - ES
```

Equivalent formula:

```text
Total Float = LF - EF
```

A Total Float value of zero means the activity cannot move without delaying the
project finish implied by the current network.

### Free Float

Free Float is calculated from the current node's Early Finish and the earliest
successor Early Start.

Formula:

```text
Free Float = minimum successor ES - current EF
```

If a task has no successors, Free Float is set to Total Float.

### Critical Path

Critical Path is identified after float calculation.

The current rule is:

```text
isCritical = Total Float == 0
```

Only executable tasks and milestones are eligible for critical path marking.
Summary tasks remain non-critical rollup rows.

## Why This Architecture Was Chosen

This architecture was chosen because it is deterministic, testable, and familiar
to enterprise planning users.

The dependency graph gives the platform a clear representation of schedule
relationships. Topological ordering ensures calculations happen in a valid
dependency sequence. Forward and backward passes match the standard Critical
Path Method, making the results explainable to project managers. Float and
critical path are derived from those passes rather than calculated through
separate ad hoc rules.

The orchestrated service structure also keeps API controllers, workspace
queries, and frontend components from duplicating scheduling logic. Lower-level
engine services remain independently testable, while
`PlanningScheduleEngineService` owns the correct execution order.

## Alternatives Considered

| Alternative | Reason Rejected |
| --- | --- |
| Calculate schedule fields in the frontend | Would make scheduling unauditable, inconsistent across reports, and difficult to reuse for portfolio or resource planning. |
| Store only manual task dates without dependency analysis | Would not support critical path, float, dependency validation, or Microsoft Project style planning workflows. |
| Let each backend caller invoke graph, pass, float, and critical services directly | Would duplicate sequencing rules and increase the chance of partial or incorrect calculations. |
| Put the entire scheduling algorithm in one large service | Would reduce testability and make future extensions harder to isolate. |
| Treat summary tasks as dependency activities | Would conflict with standard scheduling semantics and make summary rollups unreliable. |
| Infer milestones from zero-duration tasks only | Would lose explicit milestone category semantics and make reporting less reliable. |

## Consequences

### Pros

- Scheduling behavior has one backend authority.
- The calculation pipeline is deterministic and testable.
- Invalid dependency graphs fail before partial schedule analysis runs.
- The architecture matches Microsoft Project style Critical Path Method
  concepts.
- Summary tasks and executable tasks have clear separate semantics.
- Milestones can participate in dependency analysis and critical path.
- Future scheduling features can be added to the orchestrator without changing
  callers.

### Cons

- The engine introduces more backend complexity than simple date storage.
- Schedule analysis depends on valid task hierarchy and dependency data.
- Summary rows require separate rollup handling outside executable network
  calculations.
- Current calculations use offset-based duration logic rather than full working
  calendars.
- Unsupported or legacy dependency types such as Start-to-Finish are not part of
  the active scheduling graph.

### Future Improvements

- Calendar-aware scheduling with working days, holidays, and time zones.
- Lead and lag support on dependency edges.
- Constraint dates such as Must Start On, Start No Earlier Than, and Finish No
  Later Than.
- Schedule propagation and persistence after edits.
- Baseline comparison and variance calculations.
- Resource calendars and resource leveling.
- Portfolio-level critical path and cross-project dependencies.
- Incremental recalculation for localized schedule changes.
- User-facing validation messages mapped from graph validation issues.
- AI schedule advisory built on top of deterministic schedule analysis.
