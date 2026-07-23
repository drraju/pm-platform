# PM Platform v1.1 Planned REST API

## Overview

This document lists planned REST endpoints only. It does not define
implementation details.

All endpoints should require authentication. Project-scoped endpoints should
enforce project visibility and appropriate update permissions.

## Project Calendars

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/planning/projects/:projectId/calendars` | List project calendars. |
| POST | `/planning/projects/:projectId/calendars` | Create project calendar. |
| GET | `/planning/projects/:projectId/calendars/:calendarId` | Get project calendar detail. |
| PATCH | `/planning/projects/:projectId/calendars/:calendarId` | Update project calendar. |
| DELETE | `/planning/projects/:projectId/calendars/:calendarId` | Archive project calendar. |
| POST | `/planning/projects/:projectId/calendars/:calendarId/assign` | Assign calendar to project. |
| GET | `/planning/projects/:projectId/calendars/effective` | Get effective project calendar. |

## Project Calendar Exceptions

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/planning/projects/:projectId/calendars/:calendarId/exceptions` | List exceptions. |
| POST | `/planning/projects/:projectId/calendars/:calendarId/exceptions` | Create exception. |
| PATCH | `/planning/projects/:projectId/calendars/:calendarId/exceptions/:exceptionId` | Update exception. |
| DELETE | `/planning/projects/:projectId/calendars/:calendarId/exceptions/:exceptionId` | Delete or archive exception. |

## Resources

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/resources` | List resources. |
| POST | `/resources` | Create resource. |
| GET | `/resources/:resourceId` | Get resource detail. |
| PATCH | `/resources/:resourceId` | Update resource. |
| DELETE | `/resources/:resourceId` | Archive resource. |
| GET | `/resources/search` | Search resources by role, status, user, or name. |

## Resource Calendars

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/resources/:resourceId/calendars` | List resource calendars. |
| POST | `/resources/:resourceId/calendars` | Create resource calendar. |
| GET | `/resources/:resourceId/calendars/:calendarId` | Get resource calendar detail. |
| PATCH | `/resources/:resourceId/calendars/:calendarId` | Update resource calendar. |
| DELETE | `/resources/:resourceId/calendars/:calendarId` | Archive resource calendar. |
| GET | `/resources/:resourceId/availability` | Get effective resource availability. |

## Resource Calendar Exceptions

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/resources/:resourceId/calendars/:calendarId/exceptions` | List resource exceptions. |
| POST | `/resources/:resourceId/calendars/:calendarId/exceptions` | Create resource exception. |
| PATCH | `/resources/:resourceId/calendars/:calendarId/exceptions/:exceptionId` | Update resource exception. |
| DELETE | `/resources/:resourceId/calendars/:calendarId/exceptions/:exceptionId` | Delete or archive resource exception. |

## Resource Allocations

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/planning/projects/:projectId/resource-allocations` | List project allocations. |
| POST | `/planning/projects/:projectId/resource-allocations` | Create allocation. |
| GET | `/planning/projects/:projectId/resource-allocations/:allocationId` | Get allocation detail. |
| PATCH | `/planning/projects/:projectId/resource-allocations/:allocationId` | Update allocation. |
| DELETE | `/planning/projects/:projectId/resource-allocations/:allocationId` | Archive allocation. |
| GET | `/resources/:resourceId/allocations` | List allocations for a resource. |

## Resource Utilization

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/planning/projects/:projectId/resource-utilization` | Get project resource utilization. |
| GET | `/resources/:resourceId/utilization` | Get utilization for a resource. |
| GET | `/resources/utilization` | Get utilization summary across resources. |
| GET | `/resources/over-allocations` | Get over-allocation summary. |

## Resource Leveling

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/planning/projects/:projectId/resource-leveling/recommendations` | Generate leveling recommendations. |
| GET | `/planning/projects/:projectId/resource-leveling/recommendations` | List recommendations. |
| GET | `/planning/projects/:projectId/resource-leveling/recommendations/:recommendationId` | Get recommendation detail. |
| PATCH | `/planning/projects/:projectId/resource-leveling/recommendations/:recommendationId` | Update recommendation status. |

## Baselines

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/planning/projects/:projectId/baselines` | List baselines. |
| GET | `/planning/projects/:projectId/baselines/:baselineId` | Get baseline detail. |
| GET | `/planning/projects/:projectId/baselines/:baselineId/compare` | Compare baseline to current plan. |
| POST | `/planning/projects/:projectId/baselines/:baselineId/select` | Select comparison baseline. |
| GET | `/planning/projects/:projectId/baseline-comparison` | Get active baseline comparison. |

## Portfolio Enhancements

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/portfolio/planning-summary` | Get portfolio planning summary. |
| GET | `/portfolio/schedule-health` | Get schedule health indicators. |
| GET | `/portfolio/baseline-variance` | Get baseline variance summary. |
| GET | `/portfolio/resource-pressure` | Get resource pressure summary. |
| GET | `/portfolio/milestones` | Get portfolio milestone summary. |
| GET | `/portfolio/projects/:projectId/planning-drilldown` | Get project planning drilldown context. |

## Permissions

Planned permission categories:

- Calendar read.
- Calendar update.
- Resource read.
- Resource update.
- Allocation read.
- Allocation update.
- Baseline read.
- Baseline update.
- Portfolio planning read.

Existing project management permissions should be reused where possible before
adding new permission keys.
