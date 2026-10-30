# Milestone 05 — Today

**Depends on:** 04. **Blocks:** plan, board, programs, notifications, and Customer Success health.

## Outcome

Today is the only place a person updates work. The overdue number on Today and on the project overview is the same number.

## In scope

- One list. Default scope Mine. Filter by project. Columns from the [information architecture](../product/information-architecture.md): work, project, customer, owner, status, due, next step.
- Status values: Not started, Doing, Blocked, Done. Map stored values onto these four. Do not show the old words.
- Containers are grouped and excluded from the overdue chip and from health.
- Overdue rule from [shared objects](../product/shared-objects.md), used by the Today chip and the project overview.
- Project overview may now show the overdue count and a health line that quotes it ("4 of 5 overdue"). No second formula.
- Inline edit of status, due date, and next step. A side panel for the title, owner, and comments. A comment does not change status.
- Remove typed percent from this grid. Container progress, if shown, is completed leaves over operational leaves.
- Add work from Today, inside a project the person leads, or as a contributor only when the lead allows contributors to add. Default: leads add, contributors update what they own.
- Delete or stop linking Daily Review and My Tasks as separate destinations. Deep links land on Today.

## Out of scope

- The plan and the board. They may still exist in the old UI. They must not contradict the status written here. If they cannot be made to read the same fields in this milestone, remove them from navigation until milestones 06 and 07.
- Slack and notifications.

## Acceptance

- The CapGemini-style case from the audit cannot recur: overview and Today report one overdue count, and a comment that says done does not leave the status on Doing.
- A contributor's Mine view excludes other people's items. A lead can switch to the project.
- Marking Done clears the overdue mark the same day, on both screens.
- A container with overdue children is not itself counted.
- At 1280px the columns above fit, or the less important ones collapse into the side panel. The title, status, and due date stay on the row.
