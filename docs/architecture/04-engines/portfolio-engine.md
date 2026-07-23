# Portfolio Engine Architecture

## Purpose

The Portfolio Engine provides cross-project visibility for executives, portfolio managers, program managers, and customer success teams. It aggregates project health, schedule movement, RAID exposure, milestones, dependencies, and future resource demand.

## Domain Model

```text
Portfolio
  |
  |-- Program
  |     |
  |     |-- Project
  |
  |-- Customer
        |
        |-- Project
```

Current platform behavior is project-centric. Planned portfolio behavior introduces program and customer grouping without weakening project-level ownership.

## Core Concepts

| Concept | Description |
| --- | --- |
| Portfolio | A managed collection of projects, programs, customers, and executive metrics. |
| Program | A coordinated set of related projects. |
| Project | Delivery unit with planning, execution, RAID, team, and reports. |
| Customer | External or internal recipient of delivery outcomes. |
| Executive | User persona focused on health, trends, decisions, and escalations. |

## Portfolio Dashboard

The dashboard should surface:

- Total active projects.
- Health distribution.
- Projects requiring attention.
- Upcoming milestones and release/drop events.
- Cross-project risks and issues.
- Overdue tasks and schedule slippage.
- Future capacity and allocation pressure.

## Portfolio Gantt

Portfolio Gantt is a planned view that renders project timelines, key milestones, release/drop events, and cross-project dependencies.

```text
Portfolio Gantt
  |
  |-- Program swimlanes
  |-- Project summary bars
  |-- Release/drop milestone diamonds
  |-- Cross-project dependency lines
```

## Cross-Project RAID

Portfolio RAID aggregates risks, issues, assumptions, and dependencies across projects. Items retain project ownership but can be filtered by severity, priority, customer, program, executive owner, and status.

## Cross-Project Milestones

Milestones should be categorized so portfolio views can distinguish:

- Standard milestones.
- Releases.
- Drops.
- Go-live events.
- Decision gates.

Release/drop should be milestone categories, not separate schedule object types.

## Future Resource Portfolio

Resource portfolio planning will aggregate:

- Team capacity.
- User allocation.
- Over-allocation.
- Demand by project/program/customer.
- Future workload heatmaps.

## Future Executive Reporting

Executive reporting should provide board-ready outputs:

- Health trend summaries.
- Projects requiring decisions.
- Schedule variance.
- RAID exposure.
- Release/drop calendar.
- Portfolio resource pressure.

## Future AI Portfolio Manager

The AI Portfolio Manager will identify patterns across projects, prepare executive summaries, predict schedule and RAID exposure, and recommend interventions. AI outputs must remain explainable and traceable to source data.
