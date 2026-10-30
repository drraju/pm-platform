# Milestone 02 — Shell

**Depends on:** 01. **Blocks:** every screen after this.

## Outcome

The sidebar lists only rooms that work for this person. They land in one place. Disabled rows, the second Administration heading, and the placeholder AI button are gone.

## In scope

- Apply the sidebar, header, landing rule, and copy in the [information architecture](../product/information-architecture.md).
- Today and Projects stay reachable. Customers, Programs, and Sign-in stay hidden until their milestones, even if the permission keys already exist.
- People stays available to Admin and Super Admin, showing the name and the roles from milestone 01.
- Remove Home, Dashboard-as-a-second-home, Daily Review, the disabled Planning and Resources rows, AI Playground, Risks, Issues, and Enterprise Calendars from the primary nav.
- Remove the header control that says search and opens commands. Remove the disabled AI Assistant. Remove the Notifications link until milestone 09.
- Show the person's name. Do not show a raw role enum as their identity.
- Collapse the sidebar to icons with the full label in the tooltip.

## Out of scope

- Redesigning Today or the project interior. Those pages may look unfinished. They must be reachable only from a working row.
- New customer or program screens.

## Acceptance

- A contributor sees Today and Projects. They do not see People, Customers, or Programs.
- An executive with no delivery membership lands on a short holding explanation, not on a scorecard named Dashboard. Programs arrive in milestone 11.
- A platform admin who can update work lands on Today.
- No sidebar row is disabled. No header control is a placeholder.
- At 1280px the sidebar and the page title are both visible without opening a mobile menu.
