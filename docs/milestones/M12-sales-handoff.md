# Milestone 12 — Sales handoff

**Depends on:** 03 and 04. Customer Success may already be live.

## Outcome

Sales can create a prospect on the shared customer table and ask for a project. The lead, once assigned, owns delivery. Sales does not edit the plan.

## In scope

- Sales sees Customers, scoped to customers they own.
- Create a customer in Prospect.
- "Request a project" captures a name, a target finish, and a note to the lead. An admin or program manager turns the request into a project and sets the lead. The request is then closed.
- The commercial note stays on the customer and stays hidden from Customer Success and from contributors.
- After the project exists, Sales sees the project name and target finish on the customer, not the board.

## Out of scope

- Stages, forecasts, quotas, and a separate opportunity object.
- Sales editing work items.

## Acceptance

- A seller sees their prospects and not another seller's commercial notes.
- A requested project does not appear on a plan until a lead is assigned.
- The customer row created by Sales is the same row Customer Success will open later. There is one id.
