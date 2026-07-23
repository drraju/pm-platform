# Planning Forward Pass

## Purpose

The Forward Pass calculates Early Start (ES) and Early Finish (EF) offsets for
executable Planning Engine v2 graph nodes.

It consumes the validated graph produced by `PlanningGraphBuilderService` and
returns an in-memory result. It does not persist schedule values and does not
expose API responses.

Out of scope:

- Backward Pass
- Float
- Critical Path
- Baselines
- Calendars
- Resource leveling

## Algorithm

The forward pass processes graph nodes in topological order.

For each node:

1. Skip Summary nodes.
2. Treat Milestone duration as `0`.
3. Start with `ES = 0`.
4. Evaluate each incoming dependency.
5. Convert each dependency into an ES constraint.
6. Use the maximum constraint as the node ES.
7. Calculate EF:
   - Task: `EF = ES + duration`
   - Milestone: `EF = ES`

Supported dependency constraints:

| Type | Constraint |
| --- | --- |
| FS | `successor.ES >= predecessor.EF` |
| SS | `successor.ES >= predecessor.ES` |
| FF | `successor.EF >= predecessor.EF`, so `successor.ES >= predecessor.EF - successor.duration` |

`SF` is ignored by the graph builder and is not included in forward-pass
calculation.

## Examples

### Linear Chain

Task A duration `2`, Task B duration `3`, dependency `A FS B`.

- A: `ES 0`, `EF 2`
- B: `ES 2`, `EF 5`

### Fork

Task A feeds Task B and Task C using FS dependencies.

- A finishes first.
- B and C both start at A's EF.
- Each branch finishes based on its own duration.

### Merge

Task C depends on Task A and Task B.

- C evaluates both incoming constraints.
- C uses the later predecessor constraint.

### Milestone

Task A duration `3`, Milestone M dependency `A FS M`.

- A: `ES 0`, `EF 3`
- M: `ES 3`, `EF 3`

### Finish-to-Finish

Task A duration `5`, Task B duration `2`, dependency `A FF B`.

- A: `ES 0`, `EF 5`
- B must finish no earlier than A.
- B: `ES 3`, `EF 5`

## Complexity

The graph builder already produces topological order. The forward pass visits
each node once and evaluates each incoming edge once.

Complexity:

- Time: `O(V + E)`
- Memory: `O(V)`

`V` is the number of graph nodes and `E` is the number of supported dependency
edges.

## Future Integration

Future Planning Engine v2 calculation layers can use the forward-pass output as
input for:

- Backward Pass
- Latest Start and Latest Finish
- Total Float
- Free Float
- Critical Path identification
- Calendar-aware working-day conversion

Those layers should consume the in-memory forward-pass result rather than
recalculating ES/EF independently.

Task A (Duration 5)
        |
       FS
        |
Task B (Duration 3)
        |
       SS
        |
Task C (Duration 2)

Expected result:

Task	ES	EF
A	0	5
B	5	8
C	5	7

Then another example with a milestone:

Task A (5d)
      |
     FS
      |
Release Milestone

Result:

Task	ES	EF
A	0	5
Release	5	5

## Backward Pass
Graph
   │
   ▼
Forward Pass
   │
   ▼
Backward Pass
   │
   ▼
Float
   │
   ▼
Critical Path

