# Shared objects

Four records carry the product. Views and roles change what a person sees. They do not create a second customer or a second task.

## Person

The user. Email is unique. Name is required. A person has zero or more global roles and zero or more project memberships. The Google subject id is set when they use Google. A local password hash exists only on local-only accounts.

The screen always prefers the name. Email is the secondary line.

## Customer

One company we sell to or deliver for. Sales, Customer Success, program managers, and project pages share this table.

| Field | Required | Who edits |
| --- | --- | --- |
| Name | Yes | `customer.manage` |
| Status | Yes. Prospect, Active, Paused, Closed | `customer.manage` |
| Owner | Yes. A person | `customer.manage` |
| Domain | No | `customer.manage` |
| Renewal date | No | Customer Success and Admin |
| Commercial note | No | Sales and Admin. Hidden from Customer Success and from delivery |
| Success note | No | Customer Success and Admin. Hidden from Sales and from delivery |

A project points at one customer. A customer has many projects. Deleting a customer is refused while a project points at it. Closing it is the normal end.

Health is not typed on the customer. The Customer Success milestone reads it from active projects. Until then, the customer page lists projects and does not invent a score.

## Project

The delivery container. It belongs to one customer and, once programs exist, at most one program.

| Field | Required | Notes |
| --- | --- | --- |
| Name | Yes | |
| Customer | Yes | Chosen from the customer table |
| Program | When programs exist | A program manager only picks inside their program |
| Lead | Yes | A membership of type Lead |
| Status | Yes. Planned, Active, Paused, Done | Not the work-item status enum |
| Target finish | No | The date the lead committed to. Not the latest task date |
| Summary | No | One short paragraph on the overview |

Work items belong to one project. Moving one between projects is an explicit action.

## Work item

The unit of work. Today, the plan, and the board read this table.

| Field | Required | Notes |
| --- | --- | --- |
| Title | Yes | |
| Project | Yes | |
| Parent | No | A parent with children is a container |
| Status | Yes | Not started, Doing, Blocked, Done |
| Owner | No | A person |
| Due date | No | Date only |
| Next step | No | One line. A comment does not set status |
| Container | Derived | True when other items list this item as parent |

Containers have no status chip and no overdue flag. Where a container shows progress, it is completed children over operational children. Operational items are the leaves.

Overdue, on every screen: operational, due date before today, status is not Done.

Blocked is a status the owner sets, with a next step. It is not inferred.

## Dependency

A finish-to-start link between two work items in the same project. The predecessor is the work that goes first. The successor is the work that is waiting. One successor can have many predecessors, and they stay on that successor. They are not extra rows of work.

The Plan outline is where a lead adds the link. The Plan timeline draws it when both items have a start or a finish. Today reads it and does not create it. On Today the successor shows each predecessor by name, state, and owner. The state is On track, Blocked, Overdue, or Done. Blocked wins when the predecessor is both blocked and late. A container is not overdue.

## Membership

Person + project + one of Lead, Contributor, Viewer. One row per person per project.

## Program

A named set of projects. The owner is a person, usually a program manager. Introduced in the program milestone. Until then, admins and project managers see a flat project list.

## Not an object yet

- A second task type inside Customer Success. A commitment references a project and becomes a work item only when the lead accepts it.
- A sales pipeline. The sales milestone adds fields on the customer.
- RAID in the new navigation. Existing rows may remain stored. They are not a menu and they are not part of customer health.
- Forecast, baseline, skill, and calendar records in this queue.
