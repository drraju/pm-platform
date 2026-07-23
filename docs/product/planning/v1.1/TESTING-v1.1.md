# PM Platform v1.1 Testing Strategy

## Overview

v1.1 testing must protect the existing Planning Workspace while validating new
calendar, resource, baseline, and portfolio workflows.

## Unit Tests

### Calendar Tests

- Working day detection.
- Holiday and exception handling.
- Effective project calendar selection.
- Resource calendar inheritance.
- Partial availability calculation.

### Resource Tests

- Resource validation.
- Resource status transitions.
- User-linked resource behavior.
- Named resource behavior.

### Allocation Tests

- Allocation date validation.
- Allocation percentage validation.
- Overlapping allocation behavior.
- Capacity vs demand calculation.
- Over-allocation detection.

### Baseline Tests

- Baseline comparison calculations.
- Start variance.
- Finish variance.
- Duration variance.
- Missing baseline row behavior.

### Portfolio Tests

- Schedule health aggregation.
- Baseline variance aggregation.
- Resource pressure aggregation.
- Project visibility filtering.

## Integration Tests

Required endpoint groups:

- Project calendar CRUD.
- Calendar exception CRUD.
- Resource CRUD.
- Resource calendar CRUD.
- Resource allocation CRUD.
- Resource utilization summaries.
- Baseline comparison endpoints.
- Leveling recommendation endpoints.
- Portfolio planning summary endpoints.

Each group should cover:

- authenticated success path
- unauthorized access
- insufficient permission
- hidden project/resource access
- invalid payloads
- not-found behavior

## Scheduling Engine Tests

Add tests for:

- Calendar metadata not changing current offset scheduling by default.
- Calendar adapter behavior.
- Resource leveling recommendation context using float and critical path.
- Critical task recommendation safety.
- Milestone behavior with calendar metadata.
- Summary rows excluded from executable resource-leveling movement candidates.

## Performance Tests

Representative datasets:

- 100 planning rows, 20 resources, 100 allocations.
- 500 planning rows, 100 resources, 1,000 allocations.
- Portfolio with 25 projects and summarized schedule/resource data.

Measure:

- Utilization summary response time.
- Portfolio planning summary response time.
- Planning Workspace render impact with optional resource/baseline columns.
- Leveling recommendation generation time.

## UAT

Personas:

- Project Manager.
- Resource Manager.
- PMO Analyst.
- Portfolio Manager.
- Executive Sponsor.

Scenarios:

1. Create project calendar and assign to project.
2. Add holiday exception.
3. Create resource and resource calendar.
4. Allocate resource to project task.
5. Identify over-allocation.
6. Compare current plan against baseline.
7. Review portfolio planning summary.
8. Drill from portfolio resource pressure to project detail.
9. Generate leveling recommendations.
10. Confirm no automatic schedule mutation occurs from recommendations.

## Regression Testing

Existing workflows to protect:

- Planning Workspace load.
- Snapshot create/regenerate.
- WBS hierarchy.
- Gantt timeline rendering.
- Dependencies.
- Forward pass.
- Backward pass.
- Float.
- Critical path.
- Baseline capture.
- RAID workflows.
- Portfolio dashboard existing cards.
- Project membership and permissions.

## Release Quality Gate

v1.1 should not proceed to release candidate unless:

- backend unit and integration tests pass
- frontend component tests pass
- Planning Workspace regression tests pass
- UAT critical path scenarios pass
- no known high-severity authorization gaps remain
- performance thresholds are acceptable on representative data
