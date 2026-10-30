# Milestone 07 — Board

**Depends on:** 05. Plan may ship before or with this milestone. The board reads the same items either way.

## Outcome

The project has a board whose columns are the four statuses. Moving a card updates Today and the plan.

## In scope

- Board tab. Columns: Not started, Doing, Blocked, Done.
- Card: title, owner, due date, overdue mark. Customer is omitted because the board is already inside a project.
- Lead can move any card. Contributor can move cards they own.
- Dropping on Blocked asks for a next step before the move completes.
- `/projects/:id/kanban` and any other board URL open this tab. They do not redirect to a different task list.

## Out of scope

- Swimlanes, WIP limits, and a personal board that is a different data set.
- A global Board item in the sidebar.

## Acceptance

- Moving a card to Done clears overdue on Today and on the overview.
- The column counts plus the containers excluded from the board equal the operational items on the plan.
- A viewer can see the board and cannot drag.
