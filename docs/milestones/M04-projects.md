# Milestone 04 — Projects

**Depends on:** 03. **Blocks:** Today, plan, board, programs, and Customer Success.

## Outcome

A project belongs to one customer and has one lead. A lead on that project can manage it the way a project manager would, without a global title and without access to other projects.

## In scope

- Projects list: name, customer, lead, status, target finish.
- Create requires a customer. The creator becomes the lead unless they name someone else.
- Membership: Lead, Contributor, Viewer. One row per person per project.
- Project overview: customer, lead, target finish, summary, and a team list. Health and overdue wait until Today defines the count. Until then, do not show a health color.
- Team tab to add and change membership.
- Customer page gains a Projects tab listing this customer's projects.
- A contributor sees only their projects. A program scope does not exist yet, so a Program Manager sees projects where they are a member, plus any project an admin assigns to them. Full program grouping is milestone 11.
- Breadcrumb: Projects / name / Overview or Team.

## Out of scope

- Plan, board, Today redesign, RAID, documents.
- A health badge. Showing a wrong color is worse than showing none.

## Acceptance

- A lead who is not a global Project Manager can edit the team and the summary on their project and cannot open another project.
- A global Project Manager who is not a member cannot see the project.
- Every project has a customer. The customer page lists it.
- Replacing the lead leaves the previous lead as a contributor unless the editor removes them.
- Viewer can open overview and cannot edit.
