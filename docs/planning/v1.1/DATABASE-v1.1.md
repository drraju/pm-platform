# PM Platform v1.1 Database Architecture

## Overview

v1.1 database changes should be additive and preserve existing project, task,
planning schedule, dependency, baseline, RAID, user, and portfolio data.

No destructive migration should be required for v1.1.

## New Entities

### ProjectCalendar

Purpose:

- Represents working-time rules for a project.

Key fields:

- id
- projectId
- name
- description
- timezone
- defaultWorkingDays
- workingDayStart
- workingDayEnd
- hoursPerDay
- status
- createdAt
- updatedAt

Relationships:

- Belongs to Project.
- Has many CalendarExceptions.

Indexes:

- projectId
- projectId + status
- projectId + name

### CalendarException

Purpose:

- Represents non-standard working or non-working dates.

Key fields:

- id
- calendarId
- date
- exceptionType
- name
- workingDayStart
- workingDayEnd
- hours

Relationships:

- Belongs to ProjectCalendar.

Indexes:

- calendarId
- calendarId + date
- calendarId + exceptionType

### Resource

Purpose:

- Represents a planning resource, optionally linked to an application user.

Key fields:

- id
- userId
- displayName
- resourceType
- primaryRole
- status
- defaultCapacityPercent
- defaultCalendarId
- createdAt
- updatedAt

Relationships:

- Optionally belongs to User.
- Optionally belongs to ResourceCalendar.
- Has many ResourceAllocations.

Indexes:

- userId
- status
- resourceType
- displayName

### ResourceCalendar

Purpose:

- Represents resource-specific availability.

Key fields:

- id
- resourceId
- name
- timezone
- defaultWorkingDays
- workingDayStart
- workingDayEnd
- hoursPerDay
- inheritanceMode
- status

Relationships:

- Belongs to Resource.
- Has many ResourceCalendarExceptions.

Indexes:

- resourceId
- status
- resourceId + status

### ResourceCalendarException

Purpose:

- Represents resource-specific availability exceptions.

Key fields:

- id
- resourceCalendarId
- date
- exceptionType
- name
- availabilityPercent
- hours

Relationships:

- Belongs to ResourceCalendar.

Indexes:

- resourceCalendarId
- resourceCalendarId + date

### ResourceAllocation

Purpose:

- Represents planned resource demand for a project or planning task.

Key fields:

- id
- projectId
- taskId
- resourceId
- allocationStart
- allocationFinish
- allocationPercent
- plannedHours
- status
- notes
- createdAt
- updatedAt

Relationships:

- Belongs to Project.
- Belongs to Resource.
- Optionally belongs to Task or PlanningTaskSchedule.

Indexes:

- projectId
- resourceId
- taskId
- allocationStart + allocationFinish
- resourceId + allocationStart + allocationFinish
- projectId + allocationStart + allocationFinish

### ResourceUtilizationSnapshot

Purpose:

- Optional read model for capacity vs demand summaries.

Key fields:

- id
- resourceId
- projectId
- periodStart
- periodEnd
- capacityHours
- allocatedHours
- allocationPercent
- isOverAllocated
- calculatedAt

Relationships:

- Belongs to Resource.
- Optionally belongs to Project.

Indexes:

- resourceId + periodStart + periodEnd
- projectId + periodStart + periodEnd
- isOverAllocated
- calculatedAt

### LevelingRecommendation

Purpose:

- Stores generated read-only resource leveling recommendations.

Key fields:

- id
- projectId
- resourceId
- recommendationType
- affectedTaskIds
- overloadStart
- overloadFinish
- severity
- rationale
- status
- generatedAt
- dismissedAt

Relationships:

- Belongs to Project.
- Belongs to Resource.
- References affected task IDs as recommendation metadata.

Indexes:

- projectId
- resourceId
- status
- generatedAt

### BaselineComparisonPreference

Purpose:

- Stores selected baseline comparison preference per project or user.

Key fields:

- id
- projectId
- userId
- baselineId
- scope
- createdAt
- updatedAt

Relationships:

- Belongs to Project.
- Optionally belongs to User.
- Belongs to ProjectBaseline.

Indexes:

- projectId
- userId
- projectId + userId

## Relationships

```text
Project
  -> ProjectCalendar
  -> ResourceAllocation
  -> LevelingRecommendation
  -> BaselineComparisonPreference

Resource
  -> ResourceCalendar
  -> ResourceAllocation
  -> ResourceUtilizationSnapshot
  -> LevelingRecommendation

ProjectBaseline
  -> BaselineComparisonPreference
```

## Migration Strategy

1. Add new tables and nullable relationships.
2. Add default calendar behavior in service layer before backfill.
3. Add indexes before high-volume utilization queries are enabled.
4. Backfill optional resource records only after user/resource mapping rules are approved.
5. Keep existing schedule and baseline data unchanged.
6. Enable UI modules after APIs and permissions are validated.

## Future Scalability

- Partition utilization snapshots by time period if volume grows.
- Add materialized portfolio summaries for large installations.
- Add resource skills and location dimensions later.
- Add calendar versioning if schedule audit requires historical calendar rules.
- Add scenario-specific allocation tables for future what-if planning.
- Add async recalculation jobs for resource utilization and portfolio summaries.
