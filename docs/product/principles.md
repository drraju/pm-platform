# Principles

These rules outrank a screen idea. A milestone that breaks one of them is not done.

## One fact

A work item has one status. Overdue means the due date is before today and the status is not Done, and the row is not a summary container. Executive, overview, Today, plan, and board use that count. A comment never changes status. A percent on a parent is calculated from children. A person does not type a second progress number that can drift from the status.

## One object, many views

Customer, project, and work item are each stored once. Today, the plan, and the board are views. Customer Success and Sales read the same customer row. They do not get a private copy.

## Authentication is not authorization

Google is how most people sign in. A local password exists for tests and for a deployment with no Google configuration. Either path resolves to the same user. Roles are assigned by an admin. A new Google account does not invent an admin.

## Many roles, narrow places

A person may hold several global roles. The permissions add together. Data is still limited by program, customer ownership, and project membership. Being a Customer Success Manager and a project lead shows both menus, and the lead powers apply only on that project.

## The menu is a promise

Every sidebar row opens a working screen. Disabled rows, "not available yet", and buttons titled as placeholders are removed. A later capability stays out of the menu until its milestone.

## The person who does the work opens on the work

Someone who can update work lands on Today. An executive with no delivery work lands on Programs. A customer-success manager with no delivery work lands on Customers. There is one landing rule, not a Home and a Dashboard that point at different rooms.

## Names, not enums

The screen shows a person's name. It does not show `PLATFORM_ADMIN`, "member Project", or "Signed in user" once the profile has loaded.

## Startup weight

The first useful week is Today, the customer, the project, the plan, and the board. Forecast ceremony, skill catalogs, an AI playground, and enterprise calendars are not milestones. RAID stays out of the primary navigation until a later, explicit decision. It must not leak to Sales, Customer Success, Executives, or external customers in the meantime.

## One milestone at a time

Finish the acceptance checks in the current milestone before opening the next file. Shared tables land before the menus that depend on them. Customer Success is a section on this shell, built after the customer and the project exist.
