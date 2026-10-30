# Milestone 08 — Customer Success

**Depends on:** 03, 04, and 05. The board and the plan are useful and not required.

## Outcome

Customer Success is a section of this product, visible to Customer Success Managers, admins, and super admins. It reads the customer table and the project's overdue count. It does not keep a second task list.

## In scope

- Customers are already in the sidebar. Add the Success tab on a customer the person may open, gated by `customer_success.view`.
- Success shows: owner, renewal date, last touch (a date the CSM sets), the linked projects with the same health line as the project overview, and commitments.
- A commitment has a title, a due date, a status of Open or Accepted, and a project. Accepting it, which the project lead does from the project overview, creates one work item. Until it is accepted it does not appear on the plan.
- CSM edits renewal, last touch, success notes, and commitments. They do not edit the plan.
- A person who is both CSM and lead sees Success and can also open Plan on the projects where they are lead.
- Internal RAID is not on this tab and not in the customer payload for this role.

## Out of scope

- Usage telemetry, NPS, playbooks, and automatic health from more than the project overdue rule.
- A separate Customer Success application or a duplicate customer table.

## Acceptance

- A CSM sees Customers and Success. An engineer who is only a contributor does not.
- The overdue fraction on Success equals the project overview.
- An accepted commitment appears once, as a work item. Dismissing it does not delete the work item.
- Sales notes remain hidden on Success.
