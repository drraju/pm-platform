# Milestone 15 — Work panel

**Depends on:** 07. **Does not add a menu row or a project tab.**

## Outcome

Today, the plan, and the board open the same work item beside the list. The person does not leave the view. A comment does not change status.

Monday, ClickUp, and Linear keep the queue on screen and open the item next to it. GitHub does the same for an issue. This product already did it on Today. Plan and Board only showed the row.

## In scope

- Click a title on the plan, or a card on the board, and the work panel opens. Close returns to the same view.
- The panel shows the title, the project, the owner, and the current status. A lead can set the owner there. Status still changes on the row or by moving the card.
- A person who can update work can add a comment. The comment is stored as a note. It does not set status.
- A container does not take comments.
- A customer contact can open the title and the owner. They do not see or write comments.

## Out of scope

- A new sidebar item, a Documents tab, forecast, baseline, resource leveling, or enterprise calendars.
- RAID as a menu. It stays a project tab for people who can read it.

## Acceptance

- Opening a plan row or a board card does not change the URL away from that tab.
- Adding a comment leaves the status where it was.
- A container shows that it does not take comments.
- At 1280px the plan and the board still fit. The panel sits over the right side and does not add a horizontal scrollbar to the page.
