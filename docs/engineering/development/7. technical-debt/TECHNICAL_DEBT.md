# Technical Debt Register

This register records active engineering debt separately from future product roadmap work. Historical debt remains in archived roadmap documents.

## Feature 1.3.2 Debt

| Severity | Item | Impact | Recommendation | Release blocker |
| --- | --- | --- | --- | --- |
| Medium | Dependency collections compose the visible project graph before derived filtering and pagination. | Very large graphs may consume additional memory and CPU. | Add production telemetry and introduce bounded projection caching only when measurements justify it. | No |
| Medium | A platform-wide dependency detail read may compose a broad visible graph to preserve correct blocked and impact context. | Elevated cost for actors with global visibility. | Consider a visibility-safe two-phase project-scope lookup after measuring production behavior. | No |
| Low | Legacy task-dependency routes expose persistence entities. | Old and new read contracts have different boundary quality. | Treat the DTO-only enterprise routes as canonical and plan any deprecation through backward-compatible governance. | No |

Feature 1.3.2 has no critical or high-severity feature debt.

## Platform Debt

| Severity | Item | Impact | Recommendation | Release blocker |
| --- | --- | --- | --- | --- |
| High | The repository-wide backend lint baseline reports 294 errors and 47 warnings outside Feature 1.3.2. | The repository cannot currently claim a globally clean lint gate. | Establish a separately scoped lint-baseline remediation initiative; do not mix it with feature commits. | Not for Feature 1.3.2 |
| Medium | The shared worktree contains concurrent uncommitted milestone, planning, resource, frontend, and dependency changes. | Feature-level commit traceability is reduced. | Separate and review changes before creating final feature commits. | Blocks final clean feature commit, not feature verification |

## Future Roadmap Items

The following are planned capabilities rather than defects:

- Offset-aware and calendar-aware scheduling in Feature 1.3.3 or later.
- Cross-project scheduling propagation.
- Dependency comments, dedicated history, and audit presentation.
- Frontend dependency visualization and interaction.
- Production-scale graph telemetry and optional caching.
