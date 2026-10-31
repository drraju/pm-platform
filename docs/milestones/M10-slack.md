# Milestone 10 — Slack

**Depends on:** 09.

## Outcome

A project can name a Slack channel. The events from milestone 09 are posted there. The product does not gain a second notification model.

## In scope

- Project setting, editable by the lead: Slack incoming webhook or the app's channel id. Store the secret as a secret. Never render it back in full.
- On assign, Blocked, and overdue, post one message: project, title, status, owner, due date, and a link to the work item.
- If Slack is not configured, the in-app notification still happens and the project setting explains that Slack is off.
- Disconnect removes the webhook and stops posts.

## Out of scope

- Slash commands, a Slack-first UI, and posting RAID or customer notes.
- A global Slack menu item. Configuration lives on the project.

## Acceptance

- A blocked item posts once to the configured channel and once to the in-app list.
- A project with no Slack configuration posts nothing externally and does not show an error to the contributor who changed the status.
- The webhook value is write-only after save.

## Shipped after this milestone

A waiting notice uses this same post. One message names the successor, the predecessor, and the link to the waiting task on Today. The predecessor's own Blocked or Overdue post is still a single message. Slack off leaves the in-app row in place.
