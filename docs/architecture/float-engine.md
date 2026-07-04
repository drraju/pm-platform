# Planning Float Engine

## Purpose

The Float Engine calculates Total Float and Free Float for executable Planning
Engine v2 graph nodes.

It consumes:

- The validated graph from `PlanningGraphBuilderService`.
- ES/EF values from `PlanningForwardPassService`.
- LS/LF values from `PlanningBackwardPassService`.

The Float Engine returns an in-memory result only. It does not persist schedule
values and does not expose API responses.

Out of scope:

- Critical Path identification
- Baselines
- Calendars
- Resource leveling
- UI
- API

## Formulas

### Total Float

Total Float measures how far an activity can move without delaying the project
finish implied by the current forward/backward pass results.

Formula:

`Total Float = LS - ES`

Equivalent formula:

`Total Float = LF - EF`

### Free Float

Free Float measures how far an activity can move before affecting the earliest
start of any successor.

Formula:

`Free Float = minimum successor ES - current EF`

If a task has no successors:

`Free Float = Total Float`

## Supported Nodes

Tasks and milestones are supported.

Summary nodes are skipped. They remain rollup objects and do not receive direct
float values.

Milestones have duration `0`, so their ES equals EF and their LS equals LF.

## Worked Examples

### Zero Float Linear Chain

Task A duration `2`, Task B duration `3`, dependency `A FS B`.

- A: `ES 0`, `EF 2`, `LS 0`, `LF 2`
- B: `ES 2`, `EF 5`, `LS 2`, `LF 5`

Total Float:

- A: `0 - 0 = 0`
- B: `2 - 2 = 0`

Free Float:

- A: successor minimum ES `2` minus EF `2` = `0`
- B: no successors, so Free Float = Total Float = `0`

### Positive Float Merge

Task A duration `2`, Task B duration `5`, Task C duration `3`.

Dependencies:

- `A FS C`
- `B FS C`

B controls C's earliest start. A can move later without moving C.

- A Total Float: `3`
- A Free Float: `3`
- B Total Float: `0`
- C Total Float: `0`

### Multiple Successors

When a task has more than one successor, Free Float uses the earliest successor
ES.

`Free Float = min(successor ES values) - current EF`

### Milestone

Task A duration `3`, Milestone M, dependency `A FS M`.

- M duration is `0`.
- M float is calculated with the same formulas as a task.

## Complexity

The Float Engine iterates over graph nodes once and inspects outgoing dependency
edges when calculating Free Float.

Complexity:

- Time: `O(V + E)`
- Memory: `O(V)`

`V` is executable graph nodes and `E` is supported dependency edges.

## Relationship to Critical Path

Critical Path identification is intentionally not implemented in CP-4.

The Float Engine produces the values a future Critical Path layer can consume.
That future layer may mark tasks where Total Float is zero or apply additional
enterprise rules, but CP-4 only calculates Total Float and Free Float.
