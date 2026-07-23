# Planning Backward Pass

## Purpose

The Backward Pass calculates Late Start (LS) and Late Finish (LF) offsets for
Planning Engine v2 executable graph nodes.

It consumes:

- The validated graph from `PlanningGraphBuilderService`.
- The in-memory Early Start/Early Finish result from
  `PlanningForwardPassService`.

The Backward Pass does not persist schedule values and does not expose API
responses.

Out of scope:

- Float
- Critical Path
- Baselines
- Calendars
- Resource leveling

## Relationship to Forward Pass

The Forward Pass establishes the project finish offset:

`Project Finish = maximum EF`

The Backward Pass uses that project finish to anchor terminal executable tasks,
then walks the graph in reverse topological order to push late constraints back
through predecessors.

## Algorithm

1. Calculate `Project Finish` from the maximum EF in the forward-pass result.
2. Process graph nodes in reverse topological order.
3. Skip Summary nodes.
4. Treat Milestone duration as `0`.
5. For terminal executable nodes:
   - `LF = Project Finish`
   - `LS = LF - Duration`
6. For nodes with successors, evaluate outgoing dependencies.
7. Apply the minimum successor constraint.
8. Return LS/LF in memory.

Supported dependency constraints:

| Type | Backward constraint |
| --- | --- |
| FS | `predecessor.LF = min(successor.LS)` |
| SS | `predecessor.LS = min(successor.LS)` |
| FF | `predecessor.LF = min(successor.LF)` |

When a node has both LS and LF constraints, the engine chooses the latest
LS/LF window that satisfies all outgoing dependency constraints.

`SF` dependencies are ignored by the graph builder and do not participate in
Backward Pass calculation.

## Worked Examples

### Linear Schedule

Task A duration `2`, Task B duration `3`, dependency `A FS B`.

Forward Pass:

- A: `ES 0`, `EF 2`
- B: `ES 2`, `EF 5`

Backward Pass:

- Project Finish: `5`
- B terminal: `LS 2`, `LF 5`
- A FS B: `A.LF = B.LS = 2`, so `A.LS 0`

### Fork

Task A feeds Task B and Task C using FS dependencies.

- B and C are terminal tasks.
- A evaluates both successor LS values.
- A uses the minimum successor LS as its LF.

### Merge

Task C depends on Task A and Task B.

- C anchors from Project Finish.
- A and B each receive constraints from C.
- Each predecessor calculates LS from its own duration.

### Milestone

Task A duration `3`, Milestone M dependency `A FS M`.

- M has duration `0`.
- M terminal: `LS = LF = Project Finish`
- A receives `LF = M.LS`

### Start-to-Start

Task A duration `5`, Task B duration `2`, dependency `A SS B`.

- B terminal: `LS 3`, `LF 5`
- A SS B: `A.LS = B.LS = 3`
- A: `LS 3`, `LF 8`

This follows the explicit SS rule. Future float and critical path layers can
interpret the resulting slack characteristics, but CP-3 does not calculate
float.

## Complexity

The graph already contains topological order. The Backward Pass visits each
node once and evaluates each outgoing edge once.

Complexity:

- Time: `O(V + E)`
- Memory: `O(V)`

`V` is the number of graph nodes and `E` is the number of supported dependency
edges.

## Future Integration

Future Planning Engine v2 layers can combine Forward Pass and Backward Pass
results to calculate:

- Total Float
- Free Float
- Critical Path
- Calendar-aware late dates
- Persisted schedule snapshots

Those are intentionally outside this CP-3 Backward Pass implementation.
