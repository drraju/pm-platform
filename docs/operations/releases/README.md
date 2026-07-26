# Release Documentation

This directory contains PM Platform release notes, release summaries, phase
notes, and release validation artifacts.

Release documents are historical records. Do not rewrite release history when
newer documentation supersedes older content; add new release notes or indexes
instead.

## Current And Forward-Looking Releases

| Release                   | Document                                                                                   | Notes                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| v1.2 STAB-DATA-001        | [Project Lifecycle](v1.2-stab-data-001-project-lifecycle.md)                               | Release-critical project archive, restore, and purge lifecycle stabilization.            |
| v1.2 STAB-IAM-001A        | [Password Reset](v1.2-stab-iam-001a-password-reset.md)                                     | Release-critical password reset workflow stabilization.                                  |
| v1.1.1                    | [Planning Engine Stabilization](v1.1.1-planning-engine-stabilization.md)                   | Planned stabilization path for scheduling correctness and resource readiness.            |
| v1.1.0 beta1              | [v1.1.0 beta1](v1.1.0-beta1.md)                                                            | Beta migration and release note artifact.                                                |
| Release 1.0 Feature 1.3.2 | [Enterprise Dependency Management](v1.0-feature-1.3.2-enterprise-dependency-management.md) | Release-ready dependency health, blocked-state, impact, projection, and REST capability. |

## v1.0.6 Planning Foundation

| Release          | Document                                                                                   | Notes                                                |
| ---------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| v1.0.6           | [v1.0.6](v1.0.6.md)                                                                        | Planning foundation milestone summary.               |
| v1.0.6 Phase 1   | [Task Planning Foundation](v1.0.6-phase-1-task-planning-foundation.md)                     | Task hierarchy, milestones, and planning foundation. |
| v1.0.6 Phase 2   | [Task Dependencies](v1.0.6-phase-2-task-dependencies.md)                                   | Dependency model and validation rules.               |
| v1.0.6 Phase 3   | [Project Baselines](v1.0.6-phase-3-project-baselines.md)                                   | Baseline model and immutability.                     |
| v1.0.6 Phase 4   | [Plan Workspace UI](v1.0.6-phase-4-plan-workspace-ui.md)                                   | Project Workspace planning surface.                  |
| v1.0.6 Phase 4.1 | [Usability and Planning Completion](v1.0.6-phase-4.1-usability-and-planning-completion.md) | Planning usability and completion work.              |
| v1.0.6 Phase 4.2 | [Enterprise Planning Usability](v1.0.6-phase-4.2-enterprise-planning-usability.md)         | Enterprise planning terminology and usability.       |

## v1.0.5 Platform Hardening

| Release    | Document                                                                                         | Notes                                               |
| ---------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| v1.0.5     | [Project Teams and Task Operations](v1.0.5-project-teams-task-operations.md)                     | Project teams and task operation improvements.      |
| v1.0.5.1   | [Authorization Alignment](v1.0.5.1-authorization-alignment.md)                                   | Authorization and governance alignment.             |
| v1.0.5.2   | [Authorization Hardening](v1.0.5.2-authorization-hardening.md)                                   | Authorization model and security hardening.         |
| v1.0.5.3   | [Project Visibility Consistency](v1.0.5.3-project-visibility-consistency.md)                     | Project visibility and assignment consistency.      |
| v1.0.5.4   | [Project List Visibility Correction](v1.0.5.4-project-list-visibility-correction.md)             | Project list visibility correction.                 |
| v1.0.5.5   | [RAID Visibility Hardening](v1.0.5.5-raid-visibility-hardening.md)                               | RAID visibility and permission behavior.            |
| v1.0.5.6   | [Executive Experience Validation](v1.0.5.6-executive-experience-validation.md)                   | Executive dashboard and read-only behavior.         |
| v1.0.5.6.1 | [Executive Dashboard Drilldown Alignment](v1.0.5.6.1-executive-dashboard-drilldown-alignment.md) | Executive drilldown alignment.                      |
| v1.0.5.7   | [RAID Management UI](v1.0.5.7-raid-management-ui.md)                                             | RAID management screens and workflows.              |
| v1.0.5.8   | [Modal and Form Usability Hardening](v1.0.5.8-modal-usability-hardening.md)                      | Shared modal and form usability.                    |
| v1.0.5.9.1 | [Authorization Policy Framework](v1.0.5.9.1-authorization-policy-framework.md)                   | Centralized authorization policy framework.         |
| v1.0.5.9.2 | [Platform Hardening](v1.0.5.9.2-platform-hardening.md)                                           | Modal, deployment, and RAID auditability hardening. |
| v1.0.5.9.3 | [Membership Lifecycle Fix](v1.0.5.9.3-membership-lifecycle-fix.md)                               | Project membership lifecycle correction.            |

## v1.0 And Earlier

| Release      | Document                                                   | Notes                                        |
| ------------ | ---------------------------------------------------------- | -------------------------------------------- |
| v1.0         | [PM Platform MVP](v1.0-pm-platform-mvp.md)                 | MVP platform release summary.                |
| v1.0.3       | [External Collaboration](v1.0.3-external-collaboration.md) | External collaboration release note.         |
| v1.0.0 beta2 | [Release Notes](RELEASE-v1.0.0-beta2.md)                   | Beta2 release overview and limitations.      |
| v0.2.0       | [Planning and Gantt](v0.2.0%20-%20Planning%20%26%20Gantt)  | Enterprise Planning Engine phase 1 artifact. |

## Release Validation Artifacts

| Artifact         | Document                                         | Notes                                                                        |
| ---------------- | ------------------------------------------------ | ---------------------------------------------------------------------------- |
| v1.0.0 beta2 UAT | [UAT Test Guide](UAT-v1.0.0-beta2-Test-Guide.md) | UAT scope, scenarios, role capabilities, feedback, and completion checklist. |

## Maintenance Rules

- Add new release notes to this directory.
- Update this index when a release document is added.
- Keep release documents immutable except for explicit corrections.
- Use review documents for audits and investigations.
- Use roadmap documents for planned work that has not shipped.
