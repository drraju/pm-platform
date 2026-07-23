# PM Platform v1.1 Work Breakdown Structure

## Complexity Scale

| Complexity | Meaning |
| --- | --- |
| Small | Isolated change with low cross-module impact. |
| Medium | Requires API, UI, and focused tests. |
| Large | Cross-module behavior or new domain model. |
| XL | Shared architecture, migrations, performance, or scheduling impact. |

## Implementation Order

| Order | Epic | Rationale |
| --- | --- | --- |
| 1 | Calendar Foundation | Calendars must exist before resource availability and calendar-aware planning. |
| 2 | Resource Model | Resources must exist before allocations and utilization. |
| 3 | Allocation Model | Allocations provide demand data for resource views and leveling. |
| 4 | Baseline Comparison | Can build in parallel after planning read models are stable. |
| 5 | Resource Views | Depends on resources, calendars, and allocations. |
| 6 | Leveling Recommendations | Depends on schedules, allocations, float, and resource availability. |
| 7 | Portfolio Enhancements | Depends on project-level summaries. |
| 8 | UAT, Hardening, Regression | Must validate integrated workflows last. |

## Epic 1: Calendar Foundation

### Feature 1.1: Project Calendar Data Model

| Task | Complexity | Order |
| --- | --- | --- |
| Define project calendar entity model. | Medium | 1 |
| Define calendar exception model. | Medium | 1 |
| Define project calendar assignment rules. | Small | 1 |
| Document default calendar fallback behavior. | Small | 1 |

### Feature 1.2: Project Calendar APIs

| Task | Complexity | Order |
| --- | --- | --- |
| Create calendar DTO contracts. | Medium | 2 |
| Add project calendar CRUD endpoints. | Medium | 2 |
| Add project calendar assignment endpoint. | Medium | 2 |
| Add permission and project visibility tests. | Medium | 2 |

### Feature 1.3: Calendar UI

| Task | Complexity | Order |
| --- | --- | --- |
| Create project calendar settings screen. | Medium | 3 |
| Add working week editor. | Medium | 3 |
| Add exception list and dialog. | Medium | 3 |
| Add assignment state to Project Settings. | Small | 3 |

## Epic 2: Resource Model

### Feature 2.1: Resource Profiles

| Task | Complexity | Order |
| --- | --- | --- |
| Define resource entity and status rules. | Large | 4 |
| Support user-linked and named resources. | Medium | 4 |
| Add resource list API. | Medium | 4 |
| Add resource create/update/archive APIs. | Medium | 4 |

### Feature 2.2: Resource Calendar Foundation

| Task | Complexity | Order |
| --- | --- | --- |
| Define resource calendar inheritance. | Medium | 5 |
| Add resource calendar exceptions. | Medium | 5 |
| Add effective availability service. | Large | 5 |
| Add calendar availability tests. | Medium | 5 |

### Feature 2.3: Resource UI

| Task | Complexity | Order |
| --- | --- | --- |
| Add Resources navigation entry. | Small | 6 |
| Add resource list screen. | Medium | 6 |
| Add resource detail panel. | Medium | 6 |
| Add resource calendar tab. | Medium | 6 |

## Epic 3: Resource Allocation

### Feature 3.1: Allocation Data Model

| Task | Complexity | Order |
| --- | --- | --- |
| Define allocation entity. | Large | 7 |
| Define project and optional task relationships. | Medium | 7 |
| Define allocation overlap validation. | Large | 7 |
| Define allocation status model. | Small | 7 |

### Feature 3.2: Allocation APIs

| Task | Complexity | Order |
| --- | --- | --- |
| Add project allocation CRUD. | Medium | 8 |
| Add resource allocation lookup. | Medium | 8 |
| Add utilization summary endpoint. | Large | 8 |
| Add over-allocation summary endpoint. | Large | 8 |

### Feature 3.3: Allocation UI

| Task | Complexity | Order |
| --- | --- | --- |
| Add project allocation panel. | Medium | 9 |
| Add allocation create/edit dialog. | Medium | 9 |
| Add utilization grid. | Large | 9 |
| Add over-allocation indicators. | Medium | 9 |

## Epic 4: Baseline Comparison

### Feature 4.1: Baseline Comparison Service

| Task | Complexity | Order |
| --- | --- | --- |
| Reuse existing baseline snapshots. | Small | 7 |
| Add baseline comparison read model. | Medium | 8 |
| Calculate start, finish, and duration variance. | Medium | 8 |
| Add baseline comparison tests. | Medium | 8 |

### Feature 4.2: Baseline UI

| Task | Complexity | Order |
| --- | --- | --- |
| Add baseline selector. | Small | 10 |
| Add variance columns. | Medium | 10 |
| Add baseline detail dialog. | Medium | 10 |
| Add variance styling and accessibility labels. | Medium | 10 |

## Epic 5: Resource Views

### Feature 5.1: Resource Utilization

| Task | Complexity | Order |
| --- | --- | --- |
| Build utilization aggregation service. | Large | 11 |
| Add resource utilization API. | Medium | 11 |
| Add utilization grid UI. | Large | 12 |
| Add filtering by project, resource, and date. | Medium | 12 |

### Feature 5.2: Resource Capacity Reporting

| Task | Complexity | Order |
| --- | --- | --- |
| Add capacity vs demand summary. | Large | 11 |
| Add resource pressure cards. | Medium | 12 |
| Add export-ready summary model. | Medium | 13 |

## Epic 6: Leveling Recommendations

### Feature 6.1: Overload Detection

| Task | Complexity | Order |
| --- | --- | --- |
| Detect resource overload windows. | Large | 13 |
| Map overload to affected tasks. | Large | 13 |
| Include float and critical status in recommendation context. | XL | 13 |

### Feature 6.2: Recommendation UI

| Task | Complexity | Order |
| --- | --- | --- |
| Add leveling recommendations panel. | Medium | 14 |
| Add conflict drawer. | Medium | 14 |
| Add dismiss recommendation behavior. | Small | 14 |

## Epic 7: Portfolio Enhancements

### Feature 7.1: Portfolio Planning Summaries

| Task | Complexity | Order |
| --- | --- | --- |
| Add schedule health summary. | Large | 15 |
| Add baseline variance summary. | Medium | 15 |
| Add resource pressure summary. | Large | 15 |
| Enforce project visibility in aggregation. | Medium | 15 |

### Feature 7.2: Portfolio UI

| Task | Complexity | Order |
| --- | --- | --- |
| Add portfolio planning widgets. | Medium | 16 |
| Add milestone drilldown. | Medium | 16 |
| Add resource pressure drilldown. | Medium | 16 |
| Add baseline variance drilldown. | Medium | 16 |

## Epic 8: UAT, Hardening, And Release Readiness

### Feature 8.1: Regression Protection

| Task | Complexity | Order |
| --- | --- | --- |
| Run Planning Workspace regression suite. | Medium | 17 |
| Run backend planning/resource tests. | Medium | 17 |
| Validate permission matrix. | Medium | 17 |
| Validate migration rollback strategy. | Large | 17 |

### Feature 8.2: UAT

| Task | Complexity | Order |
| --- | --- | --- |
| Prepare UAT scenarios. | Medium | 18 |
| Seed representative plans and allocations. | Medium | 18 |
| Capture UAT findings. | Medium | 18 |
| Close release-blocking defects. | Large | 18 |
