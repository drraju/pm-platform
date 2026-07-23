# PM Platform v1.1 Implementation Order

## Safest Implementation Order

### 1. Must Come First

1. Confirm v1.0 Planning Workspace regression baseline.
2. Add project calendar data model and service.
3. Add resource data model and service.
4. Add permission rules for calendar/resource management.
5. Add migration tests and rollback expectations.

Reason:

- Calendars and resources are foundation concepts.
- Allocations, leveling, and portfolio summaries depend on them.
- Permission boundaries must be established before exposing data.

### 2. Foundation APIs

1. Project calendar APIs.
2. Resource APIs.
3. Resource calendar APIs.
4. Baseline comparison API using existing baseline data.

Reason:

- These APIs can be tested independently before UI complexity arrives.
- Baseline comparison can proceed without waiting for allocations.

### 3. Foundation UI

1. Project Calendar settings.
2. Resource list and detail.
3. Resource calendar editor.
4. Baseline selector and variance columns.

Reason:

- Users can validate foundational data before resource utilization and leveling.

### 4. Allocation Layer

1. Allocation data model.
2. Allocation APIs.
3. Allocation panel.
4. Utilization summary service.
5. Utilization grid.

Reason:

- Allocation is the bridge between resources and schedule pressure.

### 5. Leveling Recommendations

1. Overload detection.
2. Recommendation generation.
3. Recommendation panel.
4. Conflict drilldown.

Reason:

- Leveling depends on resources, calendars, allocations, and Scheduling Engine data.
- It must remain read-only in v1.1.

### 6. Portfolio Enhancements

1. Portfolio schedule health summary.
2. Portfolio baseline variance summary.
3. Portfolio resource pressure summary.
4. Portfolio drilldowns.

Reason:

- Portfolio should consume stabilized project-level summaries.
- Portfolio must not become the first place where calculations are proven.

### 7. Must Come Last

1. Full UAT.
2. Performance testing.
3. Permission matrix validation.
4. Regression hardening.
5. Release notes and final docs.

Reason:

- Integrated workflows are only meaningful after all foundational services and UI are available.

## Can Be Parallelized

| Workstream | Can Run In Parallel With |
| --- | --- |
| Baseline comparison service | Calendar/resource foundation |
| Baseline UI | Resource list UI |
| Portfolio UI shells | Utilization service development |
| UAT scenario writing | Sprint 2 implementation |
| Documentation updates | All implementation sprints |
| Frontend resource list | Backend resource APIs after DTOs stabilize |
| Calendar UI | Calendar API implementation after contracts stabilize |

## Must Not Be Parallelized Prematurely

- Automatic resource leveling and allocation model design.
- Portfolio aggregation before project-level summaries are stable.
- Calendar-aware schedule mutation before calendar tests pass.
- Broad UI rollout before permission checks are implemented.

## Branch Strategy

### Recommended Branches

```text
main
  release/v1.1
    feature/v1.1-calendars
    feature/v1.1-resources
    feature/v1.1-allocations
    feature/v1.1-baselines
    feature/v1.1-leveling
    feature/v1.1-portfolio-planning
    hardening/v1.1-uat
```

### Rules

- Create `release/v1.1` from the current stabilized RC1 baseline.
- Merge feature branches into `release/v1.1` after tests pass.
- Keep database migrations isolated per feature branch.
- Avoid mixing UI and migration-only changes unless the feature requires both.
- Use `hardening/v1.1-uat` for UAT fixes after feature completion.
- Merge `release/v1.1` back to `main` only after release sign-off.

## Merge Gates

Each feature branch should provide:

- migration summary
- API summary
- permission summary
- test evidence
- regression risk notes
- documentation updates

## Release Candidate Gate

Before cutting v1.1 RC:

- no critical open UAT defects
- no high-severity permission gaps
- migration path validated
- performance checks complete
- Planning Workspace regression suite passing
- release documentation drafted
