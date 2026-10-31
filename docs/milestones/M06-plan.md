# Milestone 06 — Plan

**Depends on:** 05. **Blocks:** nothing else, but the board should follow it so both views ship on the same statuses.

## Outcome

Inside a project, Plan shows the same work items as Today, in outline order, with start and finish. Editing a date or a status there changes Today.

## In scope

- Plan tab for people who can open the project. Editing requires Lead, or Program Manager once programs exist. Contributors see the plan and edit only their own status, matching Today.
- Columns: title, owner, start, finish, status. Finish and the Today due date are the same field.
- Containers indent their children. Containers are not given a status menu.
- Drag to reorder siblings. Baseline and forecast are absent. Do not show a disabled Regenerate control.
- Empty plan: "Add work", which creates a work item.
- The footer counts operational items and containers separately, and the words match Today.

## Out of scope

- Critical path, resource leveling, and cross-project dates.
- A second planning product reached from the global sidebar.

## Acceptance

- Changing finish on the plan changes the due date on Today, and the overdue mark follows.
- A contributor cannot drag another person's dates.
- The old global Planning row stays gone.
- No control invites a click it will refuse.

## Shipped after this milestone

The outline has a Depends on column. A lead adds a finish-to-start predecessor on that row, and the row lists every predecessor. Timeline is a view on this same tab and draws those links when both tasks have a date. Today shows the same links as a read-only waiting line. Baseline and forecast stay out. See the [information architecture](../product/information-architecture.md).
