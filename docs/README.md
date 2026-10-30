# Product docs

These documents replace the previous docs tree. That tree described a different product: one canonical role per person, a sidebar of unfinished rooms, and a pile of historical reports. It is still in git history. Application code is unchanged.

Read in this order:

1. [Audit, 29 Oct 2026](audit/2026-10-29-startup-readiness.md) — what the running product does today.
2. [Principles](product/principles.md) — the rules every milestone has to keep.
3. [Information architecture](product/information-architecture.md) — the shell a person should learn once.
4. [Roles and access](product/roles-and-access.md) — Google sign-in, local users, and many roles on one person.
5. [Shared objects](product/shared-objects.md) — the customer, the project, and the work item are each stored once.
6. [Leading products](research/leading-products.md) — what to copy, and what to leave behind.
7. [Milestones](milestones/README.md) — build one of these at a time. Do not start the next until the current one meets its acceptance checks.

## Folder map

| Path | Holds |
| --- | --- |
| `audit/` | The readiness audit. Evidence, not a backlog. |
| `product/` | The target experience, roles, and shared objects. |
| `research/` | Patterns from products people already know. |
| `milestones/` | The only implementation queue. |

## How to use a milestone

Open the milestone file. Build only what it lists. Leave later menus out of the sidebar until their milestone starts. A hidden permission is not a feature, and a disabled menu row is a defect.
