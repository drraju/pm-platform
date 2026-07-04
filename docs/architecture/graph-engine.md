# Planning Graph Engine

## Purpose

The Planning Graph Engine is the internal in-memory graph foundation for
Planning Engine v2. It converts existing planning tasks and task dependencies
into a validated graph that future scheduling calculations can consume.

This layer does not calculate dates, float, baselines, calendars, resources, or
critical path.

## Node Model

Each graph node represents one planning item:

- `taskId`: existing task identifier.
- `taskType`: `standard`, `summary`, or `milestone`.
- `parentTaskId`: parent Summary identifier, or `null` for root items.
- `children`: child task identifiers for WBS traversal.
- `incomingDependencies`: dependency edges where this task is the successor.
- `outgoingDependencies`: dependency edges where this task is the predecessor.

Summary nodes are WBS containers. They can have children, but they are not valid
dependency endpoints.

Milestone nodes are zero-duration scheduling events. They are valid dependency
endpoints and may have incoming or outgoing dependencies.

## Edge Model

Each graph edge represents one supported task dependency:

- `dependencyId`: existing dependency identifier when available.
- `dependencyType`: `FS`, `SS`, or `FF`.
- `predecessorTaskId`: predecessor task identifier.
- `successorTaskId`: successor task identifier.

`SF` dependencies are ignored for new graph construction. They remain a legacy
compatibility value in persisted dependency data, but the graph foundation does
not include them in new scheduling graphs.

## Validation

The graph builder rejects invalid graphs before future calculation layers run.

Validation rules:

- Task IDs must exist and be unique.
- Task types must be `standard`, `summary`, or `milestone`.
- Parent references must point to an existing Summary/task node.
- Dependency predecessors must exist.
- Dependency successors must exist.
- A dependency cannot target the same task as both predecessor and successor.
- Summary tasks cannot be dependency predecessors or successors.
- Dependency cycles are rejected.

Validation failures are returned through `PlanningGraphValidationError` with
structured issue codes so future services can map them to user-facing messages
without changing the graph model.

## Complexity

Graph construction is linear in the number of tasks and supported dependencies:

- Node construction: `O(V)`.
- Child attachment: `O(V)`.
- Edge attachment: `O(E)`.
- Cycle detection/topological sort: `O(V + E)`.

Overall complexity is `O(V + E)`, where `V` is the number of planning tasks and
`E` is the number of supported dependency edges.

## Future Forward Pass Integration

The graph exposes `topologicalTaskIds`, which future forward-pass scheduling can
use to process predecessor tasks before successors.

Future calculation layers should consume the graph after validation and add:

- Forward pass earliest start/finish calculation.
- Backward pass latest start/finish calculation.
- Total float and free float calculation.
- Critical path identification.
- Calendar-aware duration handling.

Those calculations are intentionally outside this CP-1 graph foundation.


## Graph Lifecycle
Planning Workspace
        │
        ▼
Load Schedule
        │
        ▼
Graph Builder
        │
        ▼
Graph Validation
        │
        ▼
Forward Pass
        │
        ▼
Backward Pass
        │
        ▼
Float Calculation
        │
        ▼
Critical Path Detection
        │
        ▼
Schedule DTO
        │
        ▼
Planning UI
