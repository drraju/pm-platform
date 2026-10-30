# Milestone 09 — Notifications

**Depends on:** 05. Customer Success commitments can notify after 08, as an addition, not a reason to delay the work-item alerts.

## Outcome

The owner of a work item hears when it is assigned, blocked, or becomes overdue. The header link opens a real list.

## In scope

- Persist a notification: who, work item, reason, time, read or unread.
- Create one when the owner changes, when status becomes Blocked, and when an item becomes overdue (once per item per overdue episode, not on every page view).
- Header link with an unread count. The page lists the events and opens the work item in the side panel on Today.
- Empty state is an empty list, not a promise that alerts will exist later.
- Mark read on open. Mark all read is available.

## Out of scope

- Email, Slack, and digests. Slack is the next milestone and must call this same event, not invent another one.
- Notifications for viewers about every edit in a project.

## Acceptance

- Assigning an item to someone else creates one unread row for them and none for the previous owner beyond the assignment event.
- Setting Blocked creates one row for the owner. If the actor is the owner, still record it, and do not toast a second copy in the page they are looking at.
- The header link is absent for a person with no notification permission, and present for anyone who can own work.
- Reloading does not duplicate the overdue alert.
