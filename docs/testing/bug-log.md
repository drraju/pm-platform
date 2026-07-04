# Bug Log

## Purpose

Track active UAT and release-readiness defects.

Use this file for current bugs. Historical bug logs remain in their versioned
files.

## Severity

| Severity | Meaning |
| --- | --- |
| Critical | Blocks release, corrupts data, prevents core workflow |
| High | Major workflow broken with no acceptable workaround |
| Medium | Important issue with workaround |
| Low | Cosmetic, copy, or minor usability issue |

## Status

| Status | Meaning |
| --- | --- |
| Open | Reported and not yet fixed |
| In Progress | Actively being fixed |
| Ready for Retest | Fix available for validation |
| Closed | Retested and accepted |
| Deferred | Accepted for a future release |

## Active Bugs

| ID | Date | Module | Severity | Status | Description | Owner | Retest Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| BUG-001 |  |  |  | Open |  |  |  |

## Beta 4.0 Watch List

| Area | Risk | Notes |
| --- | --- | --- |
| Planning Workspace | Critical Path visualization may expose unexpected schedule data quality issues | Validate with representative dependency graphs |
| Scheduling Engine | Invalid dependency graphs should fail clearly | Confirm graph validation messages are actionable |
| Float Columns | Users may confuse day offsets with calendar dates | Tooltip and documentation should clarify values |
| Milestones | Critical milestone filtering must remain understandable | Validate Release, Drop, Go Live, and Decision milestones |

## Closed Bugs

| ID | Date Closed | Module | Severity | Resolution |
| --- | --- | --- | --- | --- |
