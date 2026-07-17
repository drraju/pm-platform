# UI Foundation v2.1

UI Foundation contains presentation-only primitives for PM Platform workspaces.
Components must not fetch data, call APIs, evaluate permissions, or implement
feature-specific business rules. Page containers remain responsible for those
concerns and pass rendered content into Foundation components.

Import public components and types from `@/components/foundation`.

## Component catalogue

| Area | Components | Purpose |
| --- | --- | --- |
| Layout | `WorkspaceLayout`, `WorkspaceContent`, `WorkspaceSection` | Workspace-level and section-level structure |
| Header | `WorkspaceHeader`, `WorkspaceHeaderActions` | Title, metadata, progress, navigation, and actions |
| Metrics | `KPIGrid`, `SummaryMetricCard`, `HealthIndicator` | Responsive summary metrics and health presentation |
| Status | `StatusBadge` | Text-first status, health, risk, and severity labels |
| Navigation | `SectionHeader`, `ActionToolbar` | Section titles and list actions |
| Cards | `SummaryCard`, `InfoCard`, `InsightCard` | Summary, contextual information, and insight lifecycle states |
| Feedback | `LoadingState`, `EmptyState`, `ErrorState` | Loading, empty, and failure states |

## Workspace composition and spacing

`WorkspaceLayout` owns spacing between top-level workspace regions, normally the
workspace header and its content. `WorkspaceContent` owns spacing between the
sections inside that content region.

```tsx
<WorkspaceLayout spacing="default">
  <WorkspaceHeader title="Project Alpha" />
  <WorkspaceContent spacing="default">
    <SummaryCard title="Delivery health">...</SummaryCard>
    <WorkspaceSection surface="card">...</WorkspaceSection>
  </WorkspaceContent>
</WorkspaceLayout>
```

Use `compact` for dense workspaces and `none` when a child layout owns its own
spacing. Do not add `space-y-*` classes to the same element. The legacy
`WorkspaceLayout.density` prop remains supported for compatibility but new code
must use `spacing`.

## Heading and semantic structure

`SummaryCard`, `EmptyState`, `InfoCard`, and `InsightCard` accept `headingLevel`
and `as`. Choose the heading level from the surrounding document outline; do
not select it for visual size. Defaults preserve the v2 behavior:

- `SummaryCard`, `EmptyState`, and `InsightCard`: `h2`
- `InfoCard`: `h3`
- `SummaryCard`, `EmptyState`, and `InsightCard`: `section`
- `InfoCard`: `aside`

Use `as="div"` when a nested state must not create another sectioning element.
Workspace pages should contain one `h1`, normally supplied by `WorkspaceHeader`.

## Refs

`WorkspaceLayout`, `WorkspaceContent`, `WorkspaceSection`, `SummaryCard`, and
`InfoCard` forward refs to their root DOM element. Use refs only for presentation
concerns such as focus, measurement, and scrolling—not business state.

## Metric cards

`SummaryMetricCard` has three mutually exclusive forms, inferred from its props:

```tsx
<SummaryMetricCard title="Open risks" value={3} />
<SummaryMetricCard href="/risks" title="Open risks" value={3} />
<SummaryMetricCard onClick={refresh} title="Capacity" value={8} />
```

Do not combine `href` and `onClick`. Use `ariaLabel` when the visible title and
value do not fully describe the destination or action.

## Insight lifecycle

`InsightCard` uses state-specific props:

- `available`: requires `summary`; expandable content also requires `detail`
- `loading`: accepts `loadingLabel`
- `empty`: accepts `emptyMessage`
- `unavailable`: accepts `unavailableMessage`
- `error`: accepts `errorMessage`

Do not use an insight state as a substitute for page-level loading or errors.

## Status guidance

Status presentation must always include meaningful text. Colour and the optional
dot are supplementary.

- `success`: healthy, complete, met, or resolved
- `warning`: attention required, monitoring, or at risk
- `critical`: blocked, failed, or critical
- `neutral`: informational, unknown, pending, or not assessed

Feature containers decide the correct semantic tone. Foundation components must
not contain project, RAID, scheduling, or portfolio status calculations. Use the
`description` prop when a badge needs additional screen-reader context.

## Loading, empty, and error conventions

- `LoadingState` supplies `role="status"`, `aria-busy`, a screen-reader label,
  reduced-motion-safe skeletons, and between one and six rows.
- `EmptyState` requires a title and supports a description, decorative icon, and
  CTA. Set `headingLevel` to match its containing section.
- `ErrorState` supplies `role="alert"`. Use it for actionable failures and pass a
  recovery control through `action` when one is available.

Avoid rendering multiple simultaneous live loading or error announcements for a
single request.

## Accessibility expectations

- Preserve one logical heading hierarchy and one workspace `h1`.
- Use native links and buttons for interactive content.
- Give toolbars, action groups, navigation, and progress indicators accessible
  names.
- Keep status meaning available without colour.
- Preserve visible keyboard focus styles.
- Treat component icons as decorative unless equivalent text is not present.
- Use forwarded refs for deliberate focus or scroll management; do not move
  focus merely because data refreshed.

## Migration guidance

1. Keep hooks, state, API calls, permissions, and calculations in the existing
   page or feature container.
2. Replace only presentation boundaries with Foundation components.
3. Preserve current semantic labels, focus order, and behavioural assertions.
4. Choose `headingLevel`, `as`, and spacing from the surrounding structure.
5. Do not retire legacy components as part of an unrelated page migration.
6. Run lint, the complete test suite, the production build, and
   `git diff --check` after migration.
