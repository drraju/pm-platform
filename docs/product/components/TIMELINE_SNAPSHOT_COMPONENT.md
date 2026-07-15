# Timeline Snapshot Component

## Document Status

| Field             | Value                                             |
| ----------------- | ------------------------------------------------- |
| Product           | PM Platform                                       |
| Component         | Timeline Snapshot                                 |
| Artifact type     | Enterprise UX component specification             |
| Status            | Proposed for approval                             |
| Primary workspace | Project Workspace                                 |
| Interaction model | Read-only summary with contextual navigation      |
| Source of truth   | Project forecast and milestone data from Planning |

## 1. Purpose

Timeline Snapshot gives a Project participant an immediate, concise answer to three questions:

1. Where are we now?
2. What are the next material Project checkpoints?
3. Is any checkpoint late, uncertain, completed, or not yet scheduled?

It is one timeline component containing five semantic checkpoints:

1. Today
2. Next Milestone
3. Upcoming Release
4. Go Live
5. Project Finish

It is not five independent widgets, a miniature Gantt, or a schedule editor. Detailed schedule authoring remains in the Planning Workspace.

## 2. Current Issues

The existing implementation presents each checkpoint as an equal-width card in a five-column grid. Timeline Snapshot itself also occupies one column of a wider three-column Project Overview layout.

This creates several UX problems:

- Five cards compete for space inside a container that may be much narrower than the viewport.
- Equal visual weight implies five unrelated metrics instead of one ordered Project story.
- Repeated borders, backgrounds, padding, and gaps consume more width than the information.
- Short values create unused card space while longer milestone summaries wrap unpredictably.
- Labels and dates do not maintain a reliable reading line on laptop screens.
- A five-column breakpoint based only on viewport width cannot account for sidebar width, neighboring panels, zoom, or browser chrome.
- The relationship between Today and future checkpoints is not visible.
- Missing dates can look like incomplete cards rather than meaningful schedule gaps.
- Adding status makes the existing cards taller and increases misalignment.
- The layout degrades abruptly instead of adapting progressively.

The issue should not be solved by reducing padding, shrinking text, or forcing smaller cards. Those changes retain the wrong information model.

## 3. Proposed Design

Replace the five-card layout with a single **Semantic Checkpoint Rail**.

The component has one outer boundary and one shared header. Inside it, five checkpoints are connected into a single reading sequence. Each checkpoint contains:

- semantic label;
- date or explicit missing-date state;
- optional status when it adds meaning.

The rail is intentionally not a proportional time scale. It communicates the sequence and condition of five named checkpoints; it does not suggest that equal visual distance means equal elapsed time.

### 3.1 Component anatomy

| Region             | Content                                                            | Purpose                                             |
| ------------------ | ------------------------------------------------------------------ | --------------------------------------------------- |
| Component header   | “Timeline Snapshot”, freshness, optional “Open in Planning” action | Establish source and scope                          |
| Shared rail        | Connecting line and five ordered markers                           | Communicate one timeline rather than five widgets   |
| Checkpoint content | Label, date, optional status                                       | Make each checkpoint scannable and comparable       |
| Exception summary  | Only when source, sequence, or freshness is problematic            | Explain limitations without contaminating each item |

### 3.2 Information hierarchy

Within each checkpoint, the reading order is:

1. Label
2. Date
3. Status, when relevant

Across the component, the reading order is:

1. Timeline Snapshot title and data freshness
2. Today
3. Next Milestone
4. Upcoming Release
5. Go Live
6. Project Finish
7. Exception summary or contextual action

### 3.3 Status model

Status is optional. Do not display “On track” repeatedly if every checkpoint is healthy and that repetition adds no decision value.

Approved concise states are:

- Current — Today only, when a status is useful.
- Completed — includes actual completion date when available.
- On track — use when forecast confidence is material to the decision.
- At risk — confidence or dependency threatens the forecast date.
- Overdue — forecast or required completion is before Today and incomplete.
- Moved — forecast differs materially from the approved Baseline.
- Not scheduled — no authoritative date exists.
- Unavailable — the source could not be verified.

If more than one condition applies, show the most actionable status and expose the remaining explanation in the milestone detail or accessible description. Do not create long compound badges.

### 3.4 Date rules

- Use the user’s approved locale and time-zone preferences.
- Use an unambiguous short date such as `12 Sep 2026` where space permits.
- Do not use relative-only dates such as “in 3 weeks”; relative context may supplement an absolute date.
- For completed checkpoints, prefer actual completion date and identify it as actual.
- If Baseline variance is material, preserve the current forecast as the primary date and expose Baseline comparison in status or detail.
- Never substitute an empty string, dash, zero date, or fabricated date for missing data.

## 4. Low-Fidelity Wireframes

All diagrams describe structure and hierarchy, not visual styling.

### 4.1 Wide desktop — horizontal checkpoint rail

Use when the component container, not merely the viewport, provides sufficient width for five readable columns.

```text
+------------------------------------------------------------------------------------------+
| Timeline Snapshot                                      Verified 10:42  [Open in Planning]|
| Sequence view — dates are not shown to scale                                               |
|                                                                                          |
|       (1)----------------(2)----------------(3)----------------(4)----------------(5)     |
|       Today              Next Milestone     Upcoming Release   Go Live            Finish  |
|       15 Jul 2026        28 Jul 2026        18 Sep 2026        20 Nov 2026        15 Dec  |
|       Current            At risk            On track           On track           Moved   |
+------------------------------------------------------------------------------------------+
```

Placement rationale:

- The shared line makes the five values one Project narrative.
- Labels occupy the same row and dates occupy the same row for comparison.
- Status is the lowest-priority row and may be absent without disturbing label/date alignment.
- The component should span enough Project Workspace width to remain useful; it should not be forced into a narrow one-third dashboard column.

### 4.2 Laptop — compact horizontal rail

At 1280–1440px viewports, the application sidebar and page gutters reduce usable content width. The component remains horizontal only when its own container can support the minimum readable checkpoint width.

```text
+--------------------------------------------------------------------------------+
| Timeline Snapshot                              Updated 10:42  [Open in Planning]|
|                                                                                |
|  (1)------------(2)------------(3)------------(4)------------(5)              |
|  Today          Next milestone Upcoming       Go live         Project finish   |
|  15 Jul 2026    28 Jul 2026    18 Sep 2026    20 Nov 2026     15 Dec 2026      |
|                 At risk                                        Moved            |
+--------------------------------------------------------------------------------+
```

Laptop adaptations:

- Remove nonessential explanatory copy before reducing type or touch targets.
- Keep the component as a full-width or wide-span section within the Project Overview.
- Allow canonical labels to wrap to two lines while dates remain intact.
- Omit routine healthy status text; retain exceptions such as At risk, Overdue, Moved, or Not scheduled.
- If the component falls below its safe internal width, switch to the vertical layout rather than compressing further.

### 4.3 Tablet — vertical checkpoint rail

```text
+------------------------------------------------------------------+
| Timeline Snapshot                         Updated 10:42            |
|                                                    [Open Planning]|
|                                                                  |
|  (1)  Today                         15 Jul 2026                    |
|   |   Current                                                      |
|   |                                                              |
|  (2)  Next Milestone                28 Jul 2026                    |
|   |   At risk                                                      |
|   |                                                              |
|  (3)  Upcoming Release              18 Sep 2026                    |
|   |                                                              |
|  (4)  Go Live                       20 Nov 2026                    |
|   |                                                              |
|  (5)  Project Finish                15 Dec 2026                    |
|       Moved                                                        |
+------------------------------------------------------------------+
```

Tablet adaptations:

- The connecting rail becomes vertical.
- Each checkpoint uses a consistent internal grid: marker, label, date, and optional status.
- The date remains aligned at the trailing edge when space permits.
- Status sits below the label/date row and never changes the alignment of later checkpoints.
- The action remains in the component header or moves below it if the header cannot fit safely.

### 4.4 Mobile — stacked vertical checkpoint rail

```text
+--------------------------------------+
| Timeline Snapshot                    |
| Updated 10:42                        |
|                                      |
| (1) Today                            |
|  |  15 Jul 2026 · Current            |
|  |                                   |
| (2) Next Milestone                   |
|  |  28 Jul 2026                      |
|  |  At risk                          |
|  |                                   |
| (3) Upcoming Release                 |
|  |  18 Sep 2026                      |
|  |                                   |
| (4) Go Live                          |
|  |  20 Nov 2026                      |
|  |                                   |
| (5) Project Finish                   |
|     15 Dec 2026 · Moved              |
|                                      |
| [Open in Planning]                   |
+--------------------------------------+
```

Mobile adaptations:

- Label, date, and status stack within each checkpoint.
- The full component remains in document flow.
- The action moves below the rail and takes the available width.
- Dates and statuses wrap naturally; no information is truncated behind an ellipsis.
- The rail never becomes a horizontal carousel.

## 5. Responsive Layout Strategy

### 5.1 Respond to the component container

Use container-aware layout thresholds where supported. Viewport breakpoints alone are insufficient because the component width is affected by:

- expanded or collapsed application sidebar;
- Project Workspace column allocation;
- neighboring panels;
- browser zoom;
- user text scaling;
- tablet orientation;
- embedded or future workspace contexts.

The implementation should choose a layout based on the width actually available to Timeline Snapshot.

### 5.2 Recommended modes

| Intended environment | Typical viewport          | Required component behavior                                                  |
| -------------------- | ------------------------- | ---------------------------------------------------------------------------- |
| Wide desktop         | Above 1440px              | Horizontal five-checkpoint rail when container is sufficiently wide          |
| Laptop               | 1280–1440px               | Compact horizontal rail in a wide-span section; otherwise switch to vertical |
| Tablet               | Approximately 768–1279px  | Vertical rail with aligned label/date columns                                |
| Mobile               | Below approximately 768px | Stacked vertical rail with full-width action                                 |

These viewport values are validation targets, not the primary layout trigger. Exact mode changes should be determined during implementation using real component width, supported text scaling, and content stress tests.

### 5.3 Minimum readable conditions

The horizontal mode is permitted only when:

- all five canonical labels can be read without clipping;
- every date remains intact or wraps predictably;
- status exceptions do not collide with adjacent checkpoints;
- the header action and freshness text fit without covering the title;
- 200% browser zoom does not introduce horizontal page scrolling.

If any condition fails, use the vertical mode. Do not create an intermediate horizontally scrollable state.

## 6. Component Behavior

### 6.1 Default behavior

- Display all five semantic checkpoints in the prescribed order.
- Present one shared component heading and one shared source/freshness statement.
- Keep Today visually distinguishable through text and marker state, not position alone.
- Treat the rail as a sequence, not a proportional calendar scale.
- Do not edit dates, status, dependencies, or Baseline data inside this component.

### 6.2 Interaction behavior

- Today is informational and is not interactive.
- A milestone checkpoint may be selectable when authoritative detail exists.
- Selecting a checkpoint may reveal concise Project Workspace detail: source, owner, forecast, Baseline variance, confidence, blocker, and evidence status.
- “Open in Planning” preserves organisation, Project, Plan, selected milestone, relevant date range, and return context.
- Users without Planning access receive read-only detail without a disabled or deceptive link.
- The entire component must not behave as one large link.
- Do not put independent nested links inside a checkpoint that is itself a link; use a detail panel or explicit adjacent actions.

### 6.3 Duplicate semantic roles

The same underlying milestone may legitimately be both Next Milestone and Upcoming Release or Go Live. Continue to show all five required semantic slots, but identify the shared source in accessible detail and avoid presenting contradictory statuses or dates.

### 6.4 Sequence anomalies

If authoritative dates appear out of expected order—for example, Go Live after Project Finish—the component must not silently reorder semantic roles or draw a misleading normal rail.

Instead:

- retain the required semantic labels;
- show a concise “Schedule sequence requires review” exception;
- identify affected checkpoints;
- provide the permitted Planning or review action.

## 7. Empty States

### 7.1 Partially scheduled Project

Today remains populated. Each missing checkpoint retains its place and displays `Not scheduled`.

```text
+--------------------------------------------------------------------------------+
| Timeline Snapshot                                         [Open in Planning]    |
|                                                                                |
|  (1)------------(2)------------(3)------------(4)------------(5)              |
|  Today          Next milestone Upcoming       Go live         Project finish   |
|  15 Jul 2026    28 Jul 2026    Not scheduled  Not scheduled   15 Dec 2026      |
+--------------------------------------------------------------------------------+
```

Rules:

- Do not hide missing checkpoints because absence is decision-relevant.
- Do not use blank space, `—`, `N/A`, or `0` as the only explanation.
- Do not infer dates from unrelated Project fields.
- If permitted, offer “Open in Planning” as the single corrective action.

### 7.2 No authoritative schedule

If no milestone or Project finish source is available, show Today plus one component-level empty explanation.

```text
+--------------------------------------------------------------+
| Timeline Snapshot                                             |
|                                                              |
|  Today                                                       |
|  15 Jul 2026                                                 |
|                                                              |
|  No authoritative Project schedule is available.             |
|  Milestone dates will appear after a Plan is established.    |
|                                      [Open in Planning]*      |
+--------------------------------------------------------------+
```

`*` Only when authorized and a valid Planning destination exists.

## 8. Loading State

Render the component boundary, title, and stable rail geometry immediately. Preserve the final layout height as closely as possible.

```text
+--------------------------------------------------------------------------------+
| Timeline Snapshot                                                              |
|                                                                                |
|  (...)----------(...)----------(...)----------(...)----------(...)             |
|  [label]        [label]        [label]        [label]        [label]           |
|  [date]         [date]         [date]         [date]         [date]            |
+--------------------------------------------------------------------------------+
```

Loading rules:

- Use one component-level loading announcement.
- Do not announce five independent loading widgets.
- Avoid animation that implies progress if actual progress is unknown.
- Respect reduced-motion preferences.
- Do not replace known Today data with a skeleton if it is already available.
- Load milestone details progressively only after the five summary checkpoints are usable.

## 9. Error and Stale-Data Behavior

If previously verified milestone data exists but refresh fails:

- keep the last verified dates visible;
- label the component as stale with the last verified time;
- avoid presenting stale confidence as current;
- offer Retry and source detail where appropriate.

If no verified data exists:

- use `Unavailable`, not `Not scheduled`;
- explain that the source could not be verified;
- keep Today only if it can be derived safely from the user’s current date context.

`Not scheduled` is a valid domain state. `Unavailable` is a retrieval or verification state. They must not be conflated.

## 10. Overflow Behavior

The component must never create horizontal page scrolling or an internal horizontal scrollbar.

### 10.1 Text

- Canonical checkpoint labels may wrap to two lines in horizontal mode.
- Essential dates and statuses must not be clipped or hidden by ellipsis.
- Supplementary explanations may be shortened, moved to detail, or omitted at compact widths.
- User-generated milestone titles do not replace canonical labels in the rail; expose them in detail to prevent unpredictable width.
- Long localized labels must be included in layout stress testing.

### 10.2 Layout

- Switch from horizontal to vertical before checkpoint content collides.
- Use `min-width: 0` behavior on grid children so content can wrap within its assigned track.
- Avoid fixed pixel widths for the overall component and checkpoint content.
- Do not scale the component down visually.
- Do not reduce hit targets below the platform accessibility minimum.
- Do not introduce a “More” overflow menu for required checkpoint information.

### 10.3 Exceptional content

Long status explanation, owner, variance reason, or source information belongs in milestone detail, not on the rail. The snapshot retains label, date, and one concise status.

## 11. Accessibility Considerations

### 11.1 Semantics

- Expose the checkpoints as one named ordered list within a named region.
- Each checkpoint’s accessible name includes label, date state, and status.
- Mark the current checkpoint using semantic current-state information, not color alone.
- The connecting line and decorative markers are hidden from assistive technology.
- Announce freshness or stale-source state once at component level.

### 11.2 Keyboard

- Noninteractive checkpoints do not enter the tab sequence.
- Interactive milestone checkpoints use one predictable focus stop each.
- Focus order follows the visible semantic order from Today to Project Finish.
- “Open in Planning” follows checkpoint detail actions in logical reading order.
- Focus remains visible at every responsive mode.

### 11.3 Status communication

- Status must always have a text equivalent.
- Do not rely on color, marker shape, line style, or spatial position alone.
- If status is omitted because the checkpoint is healthy, the accessible experience must not announce an unexplained blank.
- Date changes and stale-data warnings should be understandable without hover.

### 11.4 Reflow and scaling

- Support 200% browser zoom without horizontal page scrolling.
- Support 400% zoom through the vertical mobile-style layout.
- Preserve meaningful reading order when CSS positioning is removed.
- Test with increased text spacing and long localized date formats.
- Respect reduced-motion and high-contrast preferences.

## 12. Implementation Recommendation

### 12.1 Use CSS Grid as the primary layout system

CSS Grid is the recommended approach because the component requires stable alignment across label, date, and optional status rows while changing from five columns to a vertical record layout.

Use Grid conceptually as follows:

- Outer component: header row, checkpoint rail, exception/action row.
- Wide rail: five equal flexible tracks using a zero-safe minimum so contents can wrap.
- Vertical rail: marker track plus flexible content and optional aligned date track.
- Mobile rail: marker track plus one stacked content track.

Use Flexbox only inside small regions where one-dimensional distribution is appropriate, such as:

- title, freshness, and action within the header;
- date and concise status within a mobile checkpoint;
- action grouping.

Do not use Flexbox as the primary five-checkpoint rail. Independent flex-item wrapping can produce uneven rows and weaken chronological reading order.

### 12.2 Prefer container queries

The component should own its responsive modes using its rendered container width. Retain viewport media queries only as a compatibility fallback and for platform-wide mobile behavior.

### 12.3 Placement in Project Workspace

Timeline Snapshot should be assigned a full-width or wide-span Project Overview zone before smaller secondary panels. It should not remain constrained to one of three equal dashboard columns.

Recommended Project Overview relationship:

```text
+--------------------------------------------------------------------------+
| Timeline Snapshot — full available content width                          |
+------------------------------------+-------------------------------------+
| Recent Activity                    | Other secondary Project evidence    |
+------------------------------------+-------------------------------------+
```

This is a component placement correction, not a redesign of the complete Project Workspace.

### 12.4 Data contract expectations

The view model should provide, for each semantic checkpoint:

- stable semantic type;
- display label;
- authoritative date or explicit missing state;
- date kind: Baseline, forecast, or actual;
- concise status when applicable;
- source freshness;
- permission-aware detail and Planning destination.

The presentation layer should not infer schedule status from string formatting or independently calculate milestone authority.

## 13. Before vs After

| Concern         | Before: five cards                      | After: semantic checkpoint rail                           |
| --------------- | --------------------------------------- | --------------------------------------------------------- |
| Mental model    | Five separate metrics                   | One connected Project timeline snapshot                   |
| Container       | Often one-third of overview width       | Full-width or wide-span component zone                    |
| Space use       | Repeated borders, padding, and gaps     | One boundary with a shared rail                           |
| Laptop behavior | Compressed five-card row                | Compact rail or early switch to vertical                  |
| Tablet behavior | Card wrapping with uneven rows          | Purpose-designed vertical timeline                        |
| Mobile behavior | Stacked cards without relationship      | Connected vertical sequence                               |
| Alignment       | Depends on content height in each card  | Grid-aligned label, date, and status tracks               |
| Missing data    | Can resemble an incomplete card         | Explicit `Not scheduled` checkpoint state                 |
| Status          | Adds inconsistent card height           | Optional subordinate status row                           |
| Overflow        | Risk of clipping or horizontal pressure | Reflow to vertical; no horizontal scrolling               |
| Hierarchy       | Every card has equal isolated emphasis  | Today, sequence, exceptions, and action form one story    |
| Accessibility   | Repeated widget-like regions            | One named ordered list with semantic current/status state |

## 14. Validation Criteria

The component is ready for high-fidelity design and implementation only when prototypes demonstrate that:

- all five checkpoints remain present at every supported width;
- no tested state introduces horizontal scrolling;
- label, date, and status remain readable at 200% zoom;
- the component switches based on actual container width;
- laptop layout works with the expanded application sidebar;
- long localized labels and date formats do not collide;
- Not scheduled, Unavailable, Overdue, Moved, and stale-source states are distinguishable;
- keyboard and screen-reader order matches visual order;
- the component remains read-only and opens Planning only through an explicit action;
- Today and status are understandable without color;
- the final Project Overview placement gives the component adequate width.

## 15. Approval Recommendation

Approve the Semantic Checkpoint Rail as the replacement for the existing five-card Timeline Snapshot.

The recommended design preserves all required milestone information while expressing it as one coherent Project timeline. It uses available width more effectively, provides intentional desktop, laptop, tablet, and mobile modes, and eliminates horizontal scrolling as a fallback. CSS Grid with container-aware layout changes is the preferred implementation approach; Flexbox should be limited to internal one-dimensional alignment.

Approval should include the placement decision that Timeline Snapshot receives a full-width or wide-span zone in Project Overview. Retaining the component inside a narrow equal-width dashboard column would undermine the responsive design.

**Recommendation: APPROVE FOR HIGH-FIDELITY DESIGN AND IMPLEMENTATION PLANNING**

## References

- [Project Workspace Specification](../workspaces/PROJECT_WORKSPACE_SPECIFICATION.md)
- [Project Workspace](../workspaces/PROJECT_WORKSPACE.md)
- [Project Workspace Wireframe](../wireframes/PROJECT_WORKSPACE_WIREFRAME.md)
- [Information Architecture Blueprint](../architecture/INFORMATION_ARCHITECTURE_BLUEPRINT.md)
