# Reporting Engine Architecture

## Purpose

The Reporting Engine transforms operational project data into reliable project, portfolio, executive, audit, and exportable reporting outputs. Reports consume governed domain data; they do not become a second source of truth.

## Report Types

| Report Type | Audience | Examples |
| --- | --- | --- |
| Operational Reports | Delivery teams | My work, overdue tasks, RAID actions |
| Project Reports | Project managers | Status report, schedule summary, RAID summary |
| Portfolio Reports | Portfolio managers | Health distribution, milestone calendar, cross-project RAID |
| Executive Reports | Executives | Decision pack, red/amber projects, trend summaries |
| Audit Reports | Administrators and compliance | User activity, permission changes, data changes |
| Scheduled Reports | Subscribers | Weekly project status, monthly portfolio health |

## Architecture

```text
Domain Data
  |-- Projects
  |-- Planning
  |-- Tasks
  |-- RAID
  |-- Team
  |-- Baselines
  v
Reporting Query Layer
  v
Report Models
  v
Renderers
  |-- Web
  |-- PDF
  |-- Excel
  |-- PowerPoint
  v
Delivery
  |-- Download
  |-- Email (future)
  |-- Scheduled distribution (future)
```

## Report Data Sources

| Source | Reporting Use |
| --- | --- |
| Projects | Metadata, ownership, status, health |
| Planning | WBS, dates, milestones, dependencies, baselines |
| Tasks | Assignment, execution progress, overdue work |
| RAID | Risks, issues, assumptions, dependencies |
| Team | Ownership, roles, responsibility |
| Audit | Change history and compliance reporting |

## Export Formats

| Format | Use |
| --- | --- |
| PDF | Formal status reports and executive packs |
| Excel | Data analysis, RAID export, task export |
| PowerPoint | Executive and steering committee presentations |

## Scheduled Reports

Scheduled reports are planned. They require:

- Report templates.
- Subscriber lists.
- Permission checks at generation time.
- Delivery audit trail.
- Failure monitoring and retry policy.

## Future AI Reports

AI-generated reports may draft summaries, highlight changes, and recommend interventions. AI report content must show source references, generated timestamp, and human approval status before distribution.
