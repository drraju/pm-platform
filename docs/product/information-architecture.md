# Information architecture

The shell is learned once. Later milestones add a row only when that row works. This page is the target. The shell milestone removes the current contradictions. It does not build Customers, Programs, or Success early.

## What leading products got right

Asana stopped putting every tool in one sidebar and grouped by the job: work, strategy, knowledge. The task is still one record. [Asana navigation](https://help.asana.com/s/article/new-navigation-in-asana?language=en_US).

Jira keeps a site bar, a sidebar of real projects, and a short project nav. [Jira navigation](https://www.atlassian.com/software/jira/guides/navigation/overview).

Linear uses a few objects. Issues, projects, and initiatives. Views do not create new work. The sidebar stays short: inbox, my issues, projects. [Linear concepts](https://linear.app/docs/conceptual-model).

Planhat puts delivery milestones on the customer record so health and the project are one glance. [Planhat on 1upHealth](https://www.planhat.com/editorial/how-1uphealth-combined-human-instinct-with-ai-analysis-to-increase-its-grr-to-90).

We take the grouping, the short project nav, the single work item, and the customer record. We do not take Asana's mode switcher, Jira's permission-scheme catalog, Linear's cycles, or Gainsight's journey engine in the first milestones. The research notes are in [leading products](../research/leading-products.md).

## Sidebar

Sections with no visible items are omitted. Rows the person cannot use are omitted. Nothing is rendered disabled.

| Section | Item | Shown when | Lands on |
| --- | --- | --- | --- |
| Work | Today | `work.update` | Their work across projects |
| Delivery | Projects | Any project they can open | Project list |
| Customers | Customers | `customer.read` | Customer list |
| Leadership | Programs | `program.view` | Program list |
| Administration | People | `user.manage` | Users and roles |
| Administration | Sign-in | `auth.configure` | Google and local policy |

Removed from the primary sidebar, compared with 29 Oct 2026: Home, Dashboard, Portfolio, Daily Review, Planning, Resources, AI Playground, Risks, Issues, Enterprise Calendars, and the duplicate Administration heading. Planning and the board live inside the project. Portfolio becomes Programs, and only for people with `program.view`.

## Header

Left: the product name, which returns to the person's landing screen.

Center: search, once the search milestone ships. Until then the control is absent. It does not open a command list labeled as search.

Right: the person's name, and Sign out. Notifications appear here only after that milestone, and only when there is a real list. The disabled AI Assistant is removed.

## Landing

| If the session has | Open |
| --- | --- |
| `work.update` | Today |
| else `customer_success.view` or Sales `customer.read` without delivery | Customers |
| else `program.view` | Programs |
| else | A one-line explanation and a way back to sign-in |

One rule. The word Dashboard is not a second home. Until the Programs milestone ships, an executive with nowhere else to go sees a one-line holding page rather than a scorecard.

## Project

Opened from Projects, or from a customer. Tabs, in order:

| Tab | Milestone | Contents |
| --- | --- | --- |
| Overview | Projects | Customer, lead, finish, health, overdue count, next milestone. The count uses the shared overdue rule |
| Plan | Plan | The schedule of the same work items. Summary rows are containers |
| Board | Board | The same work items in columns Not started, Doing, Blocked, Done |
| Team | Projects | Lead, contributors, viewers |

Documents, RAID, forecast, and baseline are not tabs in this set. Add another tab only with a milestone that names it.

The page title is the project name. The breadcrumb is Projects / project name / tab.

## Customer

| Tab | Who | Contents |
| --- | --- | --- |
| Overview | Anyone with `customer.read` on this customer | Name, status, owner, domain, renewal date, linked projects |
| Projects | Same | The projects for this customer |
| Success | `customer_success.view` | Health, commitments, last touch. Reads project status. Does not embed the plan editor |
| Activity | Same as Overview | Status changes and notes this person is allowed to see. Sales notes stay off the Success tab. CS notes stay off the Sales view |

## Today

A single list. Scope is Mine by default. This project is a filter, not a second product. Columns: work, project, customer, owner, status, due, next step. No typed percent. Summary containers are collapsed and excluded from the overdue chip. The chip count equals the executive and overview count.

Inline edit is for status, due date, and next step. Everything else opens a side panel. The panel does not navigate away.

## Programs

A list of programs. Each row: name, owner, project count, overdue count, customers touched. Open a program to see its projects. Health language matches the project overview word for word.

## Visual rules

- Status uses one chip set everywhere: Not started, Doing, Blocked, Done. Blocked is the only status that uses the warning color. Overdue is a separate due-date mark, not a fifth status.
- The sidebar is 240px, collapses to icons with the full name in the tooltip, and does not use the first letter of the word as the icon.
- Tables show the columns needed for the decision. At 1280px the first screen of a list does not require horizontal scrolling.
- Empty states name the next action and the reason the list is empty. They do not say "will appear here".
- The header does not flash "Signed in user". The name arrives with the session, or the header waits.
- One page does not stack a row of equal metric cards before the work. The work is the page.

## Copy

| Say | Do not say |
| --- | --- |
| Today | Daily Review, or My Tasks as a second destination |
| Projects | Delivery, as a global menu |
| Programs | Dashboard, Portfolio, Executive overview |
| Customers | Accounts, in the menu |
| Not started, Doing, Blocked, Done | Todo, In Progress, a typed percent, Summary as a status |
| Lead | Project Manager, when you mean the person on this project |
| Sign-in | User Administration, next to calendars |
