# Milestone 11 — Programs and executives

**Depends on:** 05. Projects already exist.

## Outcome

A program groups projects. An executive opens Programs and sees the same overdue counts Today uses. This replaces the old executive dashboard.

## In scope

- Program: name, owner, projects. A project sits in at most one program.
- Programs sidebar item for `program.view`.
- List and a program page: projects, customer, lead, overdue fraction, target finish.
- An executive is read-only. A program manager can add a project that already exists into their program and can create a project in it.
- Landing: an executive with no `work.update` opens Programs.
- Delete the old executive scorecard route or redirect it to Programs. Do not keep both.

## Out of scope

- Cross-project scheduling, budgets, and a hand-typed RAG status. Color, if any, is derived from the overdue fraction already defined. Prefer the fraction in text over a lone colored dot.

## Acceptance

- The fraction on the program row equals the project overview for that project.
- An executive cannot edit a plan, a customer note, or a membership.
- A program manager cannot open a project outside the program.
- No screen is titled Dashboard.
