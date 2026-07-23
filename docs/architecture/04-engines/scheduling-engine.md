# Scheduling Engine

## Purpose

The Scheduling Engine is the single internal entry point for Planning Engine v2
schedule analysis.

Callers should invoke `PlanningScheduleEngineService` instead of directly
coordinating the lower-level graph, pass, float, and critical path services.

This engine is internal only. It does not expose REST APIs, does not persist
results, and does not update the Planning Workspace UI.

## Orchestrator

`PlanningScheduleEngineService` owns the scheduling pipeline.

Public method:

`analyze(input): ScheduleAnalysis`

The input uses existing planning task and dependency data shapes:

- Tasks
- Summary tasks
- Milestones
- FS, SS, and FF dependencies

SF dependencies remain legacy-compatible and are ignored by the graph builder.

## Pipeline

```text
PlanningScheduleEngineService
  ↓
PlanningGraphBuilderService
  ↓
PlanningForwardPassService
  ↓
PlanningBackwardPassService
  ↓
PlanningFloatService
  ↓
PlanningCriticalPathService
  ↓
ScheduleAnalysis
```

The orchestrator stops immediately if graph construction or validation fails.

## Engine Responsibilities

### Graph Builder

Builds the in-memory dependency graph.

Responsibilities:

- Create task, summary, and milestone nodes.
- Attach WBS parent/child relationships.
- Attach supported dependency edges.
- Validate missing nodes, invalid endpoints, summary endpoints, and cycles.
- Produce topological order.

### Forward Pass

Calculates Early Start and Early Finish for executable activities.

Responsibilities:

- Process nodes in topological order.
- Skip summaries.
- Treat milestones as zero-duration activities.
- Apply FS, SS, and FF dependency constraints.

### Backward Pass

Calculates Late Start and Late Finish.

Responsibilities:

- Use project finish from the maximum EF.
- Process nodes in reverse topological order.
- Skip summaries.
- Apply successor constraints for FS, SS, and FF dependencies.

### Float Engine

Calculates Total Float and Free Float.

Responsibilities:

- `Total Float = LS - ES`
- `Free Float = minimum successor ES - current EF`
- Use Total Float as Free Float for terminal activities.

### Critical Path Detection

Identifies critical executable activities.

Responsibilities:

- Mark activities critical when `Total Float == 0`.
- Mark activities non-critical when `Total Float > 0`.
- Skip summary tasks.
- Support milestones.

## ScheduleAnalysis Object

`ScheduleAnalysis` is an immutable internal model returned by the orchestrator.

It includes:

- `projectSummary`
  - `taskCount`
  - `executableTaskCount`
  - `summaryTaskCount`
  - `milestoneCount`
  - `dependencyCount`
  - `projectFinish`
- `graph`
  - `nodeCount`
  - `edgeCount`
  - `dependencyCount`
- `nodes`
  - `taskId`
  - `taskType`
  - `parentTaskId`
  - `children`
  - `earlyStart`
  - `earlyFinish`
  - `lateStart`
  - `lateFinish`
  - `totalFloat`
  - `freeFloat`
  - `isCritical`
- `topologicalOrder`
- `validationMessages`

Summary nodes remain present in the analysis for WBS context, but schedule
fields are `null` because summaries are rollup objects.

The model is not a REST contract and must not be exposed directly to frontend
clients without an explicit API story.

## Planning API Integration

The Planning Workspace API consumes the Scheduling Engine through
`PlanningScheduleEngineService`.

Lifecycle:

1. `PlanningService.getWorkspace(...)` loads the current planning snapshot.
2. Summary rollups are applied through existing rollup logic.
3. Project task dependencies are loaded.
4. `PlanningScheduleEngineService.analyze(...)` creates `ScheduleAnalysis`.
5. `PlanningService` projects analysis fields onto workspace schedule rows.
6. The API response returns existing fields plus calculated scheduling fields.

Calculated API fields:

- `earlyStart`
- `earlyFinish`
- `lateStart`
- `lateFinish`
- `totalFloatDays`
- `freeFloatDays`
- `isCritical`

Persisted fields remain unchanged. CP-6 does not store ES, EF, LS, LF, float, or
critical flags. The values are calculated for the response.

Summary rows are included for WBS context and keep their rollup dates, but
schedule analysis fields are `null`. Milestones are executable nodes and receive
full schedule analysis values.

## Error Handling

The orchestrator stops the pipeline when graph validation fails.

Examples:

- Circular dependency
- Missing predecessor
- Missing successor
- Invalid dependency target
- Summary dependency endpoint
- Missing parent node

Validation failures are wrapped in `PlanningScheduleEngineError` with structured
issues from the graph builder.

No pass after graph construction should run when validation fails.

## Complexity

The current pipeline is linear in the graph size.

Each engine layer is `O(V + E)` or better:

- Graph construction and validation: `O(V + E)`
- Forward Pass: `O(V + E)`
- Backward Pass: `O(V + E)`
- Float calculation: `O(V + E)`
- Critical detection: `O(V)`

Overall complexity is `O(V + E)`.

## Future Extension Points

Future Planning Engine stories can extend the orchestrator without requiring
callers to know the individual service sequence.

Planned extension points:

- Calendars
- Constraint dates
- Lead and lag
- Baseline comparison
- Resource leveling
- Schedule propagation and persistence
- API projection models
- AI Schedule Advisor

These are intentionally outside the CP-5.5 orchestrator implementation.
