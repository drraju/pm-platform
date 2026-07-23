# PM Platform v1.1 Roadmap

## Roadmap Assumptions

- Four sprints.
- Existing Planning Workspace and Scheduling Engine remain stable.
- Schema changes are additive.
- Automatic schedule mutation from resource leveling is out of scope.
- Portfolio enhancements consume project-level summaries rather than becoming
  cross-project scheduling authority.

## Sprint 1: Calendar And Resource Foundations

### Goals

- Add project calendar foundation.
- Add resource profile foundation.
- Establish permission and migration rules.

### Deliverables

- Project calendar data model.
- Calendar exception model.
- Project calendar APIs.
- Resource profile data model.
- Resource CRUD APIs.
- Initial calendar settings UI.
- Initial resource list UI.

### Dependencies

- Existing project permissions.
- Existing project membership/user data.
- Existing Planning Workspace project context.

### Exit Criteria

- Project calendars can be created and assigned.
- Resource records can be created and archived.
- Existing project schedules remain unchanged when calendars are introduced.
- Backend and frontend smoke tests pass.

## Sprint 2: Resource Calendars, Allocations, And Baseline Comparison

### Goals

- Add resource availability.
- Add resource allocation model.
- Add baseline comparison read model.

### Deliverables

- Resource calendars and exceptions.
- Effective resource availability service.
- Resource allocation APIs.
- Project allocation panel.
- Baseline comparison API.
- Baseline selector and variance columns.

### Dependencies

- Sprint 1 project calendar and resource model.
- Existing baseline snapshots.
- Existing planning schedule rows.

### Exit Criteria

- Resource availability can be configured.
- Project/task allocations can be created.
- Baseline variance is visible in Planning Workspace.
- Allocation and baseline permission tests pass.

## Sprint 3: Utilization, Leveling Recommendations, And Resource Views

### Goals

- Make resource demand visible.
- Surface over-allocation.
- Add initial read-only leveling recommendations.

### Deliverables

- Resource utilization summary API.
- Capacity vs demand calculations.
- Resource utilization grid.
- Over-allocation indicators.
- Leveling recommendation service.
- Recommendation panel and conflict drawer.

### Dependencies

- Sprint 2 allocations.
- Resource calendars.
- Scheduling Engine float and critical path output.

### Exit Criteria

- Resource managers can identify overload periods.
- Project managers can see affected tasks.
- Leveling recommendations do not automatically mutate schedule dates.
- Performance checks pass on representative allocation data.

## Sprint 4: Portfolio Enhancements, UAT, And Release Hardening

### Goals

- Add portfolio planning visibility.
- Complete integrated UAT.
- Stabilize regression suite.

### Deliverables

- Portfolio schedule health summary.
- Portfolio baseline variance summary.
- Portfolio resource pressure summary.
- Portfolio milestone and resource drilldowns.
- UAT scenarios and findings log.
- Regression fixes and release readiness checklist.

### Dependencies

- Sprint 3 resource summaries.
- Baseline comparison service.
- Existing portfolio visibility rules.

### Exit Criteria

- Portfolio stakeholders can identify schedule and resource pressure.
- Project-level drilldowns work from portfolio indicators.
- UAT pass rate meets release threshold.
- No critical regressions in v1.0 Planning Workspace flows.

## Sprint Dependency Map

```text
Sprint 1 Calendars and Resources
  -> Sprint 2 Resource Calendars, Allocations, Baselines
    -> Sprint 3 Utilization and Leveling Recommendations
      -> Sprint 4 Portfolio Enhancements and UAT
```

## Parallelization

- Baseline comparison can start during Sprint 2 once current schedule read models are stable.
- Portfolio UI shells can be prototyped during Sprint 3 while aggregation APIs mature.
- UAT scenario writing can begin in Sprint 2.
- Documentation updates can run throughout the release line.
