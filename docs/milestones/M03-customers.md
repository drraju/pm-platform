# Milestone 03 — Customers

**Depends on:** 02. **Blocks:** projects, Customer Success, and sales.

## Outcome

There is one customer table. Sales, Customer Success, program managers, and admins will all use it. This milestone ships the list and the record. It does not ship Success or a pipeline.

## In scope

- Customers in the sidebar for `customer.read`.
- List: name, status, owner, renewal date, project count (zero until projects exist).
- Create and edit the fields in [shared objects](../product/shared-objects.md), except notes that belong to a role whose screen is not here yet. Commercial note and success note can be stored and shown only to the role that owns them.
- Empty state: "Add a customer", with that action for `customer.manage`.
- A delivery member does not see the Customers item until they have a project. That link arrives with projects.
- Customer page title is the customer name. Tabs for this milestone: Overview only. Projects, Success, and Activity are absent, not disabled.

## Out of scope

- Health scores, playbooks, and email sync.
- Projects, even though the model says a project will point here.

## Acceptance

- Two Customer Success managers each see the customers they own. An admin sees both.
- A sales note on a customer is invisible to a Customer Success manager. A success note is invisible to Sales.
- Closing a customer keeps the row and removes it from the default Active filter.
- The list is usable at 1280px without horizontal scrolling.
