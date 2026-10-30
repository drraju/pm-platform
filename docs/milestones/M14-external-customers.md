# Milestone 14 — External customers

**Depends on:** 04, 05, and the RAID wall from milestone 01. Do this last.

## Outcome

A customer contact signs in, usually with Google, and sees the projects where they are a Viewer. They do not see the customer book, other customers, programs, People, internal notes, or RAID.

## In scope

- Invite a contact as a user with no internal global role, and a Viewer membership on named projects.
- Their landing page is a list of those projects: name, target finish, overdue fraction, lead's name.
- They open overview and the board as read-only. The plan is read-only. Team shows names of people on the project and not email addresses of internal staff beyond the lead.
- Success notes, commercial notes, commitments that are still Open, and RAID are absent from the payload, not merely hidden in CSS.
- They have no Customers item. The company they belong to is context on the project, not a book of business.

## Out of scope

- The contact editing status, commenting on internal threads, or seeing other customers of the firm.
- A partner role with a different product. Add a partner only by repeating this milestone with its own scope note.

## Acceptance

- A contact who knows a project id they are not on receives the same response as a missing project.
- The network response for their overview contains no risk, issue, success note, or commercial note.
- Their sidebar is the project list only.
- An internal CSM using the same customer still sees Success, and the contact does not.
