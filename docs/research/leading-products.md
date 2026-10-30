# Leading products

Studied in October 2026 to decide the shell, the role split, and the customer record. The recommendation is the information architecture and the milestone list, not a feature clone.

## What we take

| Product | Source | Take |
| --- | --- | --- |
| Asana | [Navigation](https://help.asana.com/s/article/new-navigation-in-asana?language=en_US) | Group the sidebar by the job. Keep one task in every view. Personal work is not a copy of the project |
| Jira | [Navigation](https://www.atlassian.com/software/jira/guides/navigation/overview), [permissions](https://www.atlassian.com/software/jira/guides/permissions/overview) | A short project nav. Global permissions stay rare. A project role is filled per project, so a lead on one project is not a lead on all of them |
| Linear | [Concepts](https://linear.app/docs/conceptual-model) | Few objects. A view does not create data. Status is the workflow. Inbox and my work come before the catalog of projects |
| Planhat | [Health](https://www.planhat.com/customer-success/health), [1upHealth](https://www.planhat.com/editorial/how-1uphealth-combined-human-instinct-with-ai-analysis-to-increase-its-grr-to-90) | The customer record joins the relationship to delivery. Project status feeds the renewal picture |
| Vitally | [Comparison, 2026](https://www.vitally.io/post/planhat-gainsight-vitally-which-csp-is-best) | A success hub can stay clear and still sit on shared customer data. Skip the warehouse-scale setup |

## What we leave

| Product habit | Why it stays out |
| --- | --- |
| Asana's Work / Agents / Strategy / Knowledge mode switch | A small company needs sections in one sidebar, not four products |
| Jira permission schemes and a board per team ritual | The audit already shows too many doors. One board of the same work items is enough |
| Linear cycles as a required planning period | Useful later for a product team. Not the first model for client projects |
| Gainsight journey orchestration and a multi-signal health score on day one | [Gainsight's health article](https://www.gainsight.com/blog/customer-health-scores/) assumes playbooks on top of a score. The score is earned after Today and the project agree |
| A separate customer-success tool with its own projects | That is how status splits. Planhat's lesson is the opposite |

## Identity

SSO proves who the person is. It does not grant product roles. Accounts still have to exist, and roles are applied in the product. That split is documented for Atlassian apps on an identity provider. [User provisioning](https://kantega-sso.atlassian.net/wiki/spaces/KSE/pages/1769694/User+provisioning).

Google is the everyday sign-in. Local passwords remain for tests and for a site with no Google client. Admins invite the email before the first Google login. There is no SCIM milestone.

## Interface consequences

- Today is the inbox. It is not a fourth task product beside a daily review, a personal list, and a delivery queue.
- The project nav is Overview, Plan, Board, and Team. Show the tabs people use, then stop.
- The customer page is the shared table. Success is a tab, not a new database.
- Search, when it arrives, finds customers, projects, and work items from the header. A command list is not the search box.
- Detail opens beside the list. The person should not lose the queue to edit one date.
- Unfinished work is absent from the menu. Linear shows Triage and Cycles only when a team has enabled them. We show a row only when its milestone has shipped.

## Status language

Linear's board columns are the workflow. We use four words as both status and column title: Not started, Doing, Blocked, Done. Overdue is a date fact, shown on the row in every view. Parent rows are containers, not tasks with their own percent.
