# Milestone 13 — Search

**Depends on:** 03, 04, and 05. Programs and Customer Success are included when they exist.

## Outcome

The header finds a customer, a project, or a work item the person is allowed to open. It does not search menu commands and call that search.

## In scope

- Header field: "Search customers, projects, and work".
- Results grouped in that order. Each row shows the name and the parent (customer on a project, project on a work item).
- Respect scope. A contributor does not see another team's customer book. A CSM does not see work items outside the health summary they already can see. Searching a work item they cannot open returns nothing, not a forbidden title.
- Keyboard: the field focuses with Cmd-K or Ctrl-K, arrows move, Enter opens.
- Open a customer on Overview, a project on Overview, a work item on Today with the side panel.

## Out of scope

- Saved views, filters as a query language, and command actions mixed into the same results. Commands can exist later under a different label.

## Acceptance

- From Today, typing a customer name opens that customer when the person has `customer.read` on it.
- A contributor who types another project's title gets an empty result, not a disabled row.
- The search field is absent only when the person can open neither customers, nor projects, nor work. That session should already have been handled by the landing rule.
