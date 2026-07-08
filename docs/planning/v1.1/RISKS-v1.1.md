# PM Platform v1.1 Risks

## Technical Risks

| Risk | Impact | Likelihood | Mitigation |
| --- | --- | --- | --- |
| Calendar-aware scheduling changes existing date behavior. | High | Medium | Introduce calendar metadata first; keep current scheduling default until tests and UAT validate conversion rules. |
| Resource allocation model overfits early assumptions. | High | Medium | Start with allocation percentage/date range; defer skills, costs, timesheets, and automatic leveling. |
| Leveling recommendations conflict with critical path behavior. | High | Medium | Make recommendations read-only and include float/critical context. |
| Portfolio aggregation creates slow queries. | Medium | Medium | Use indexed summaries and avoid per-task portfolio queries. |
| Baseline comparison duplicates existing baseline logic. | Medium | Low | Reuse existing baseline snapshots and add read models only. |

## Product Risks

| Risk | Impact | Likelihood | Mitigation |
| --- | --- | --- | --- |
| Users expect full Microsoft Project parity in v1.1. | High | Medium | Set scope clearly: foundations plus core enterprise workflows, not full parity. |
| Resource leveling is perceived as automatic rescheduling. | Medium | Medium | Label feature as recommendations; defer schedule mutation. |
| Calendar setup feels too administrative. | Medium | Medium | Provide sensible defaults and inheritance. |
| Baseline variance confuses non-PMO users. | Medium | Low | Use clear labels and help text in UAT guidance. |

## Migration Risks

| Risk | Impact | Likelihood | Mitigation |
| --- | --- | --- | --- |
| Existing projects lack calendars/resources. | Medium | High | Use default fallback behavior. |
| User-to-resource backfill creates duplicate resources. | Medium | Medium | Avoid automatic backfill until matching rules are approved. |
| Existing baselines do not contain enough comparison detail. | Medium | Low | Add comparison adapters without mutating baseline records. |
| New indexes affect migration time. | Medium | Low | Add indexes in controlled migrations and test with representative data. |

## Performance Risks

| Risk | Impact | Likelihood | Mitigation |
| --- | --- | --- | --- |
| Resource utilization grids become slow. | High | Medium | Aggregate by date buckets and index resource/date ranges. |
| Portfolio summaries scan too many schedule rows. | High | Medium | Use project-level summaries and optional snapshots. |
| Planning Workspace becomes overloaded with columns. | Medium | Medium | Make baseline/resource columns optional. |
| Leveling recommendation generation is expensive. | Medium | Medium | Generate on demand and cache recommendations if needed. |

## Security Risks

| Risk | Impact | Likelihood | Mitigation |
| --- | --- | --- | --- |
| Resource data exposes user availability broadly. | High | Medium | Enforce resource read permissions and project visibility. |
| Portfolio summaries leak hidden project data. | High | Medium | Reuse project visibility service for aggregation. |
| Calendar update permissions are too broad. | Medium | Medium | Reuse project management permissions or add explicit calendar permissions. |
| Allocation edits bypass project management rules. | High | Low | Validate project membership, permissions, and task ownership rules. |

## Mitigation Strategy

1. Ship additive schema first.
2. Keep new calculations isolated behind services.
3. Add permission tests for every new endpoint group.
4. Use read-only recommendations before any automatic schedule mutation.
5. Make baseline and resource overlays optional in the UI.
6. Validate with realistic project and resource volumes before UAT sign-off.
7. Preserve existing v1.0 Planning Workspace regression coverage.
