# ADR-007: Capacity Model

## Status

Proposed for Epic 1.2.

## Context

Existing planning foundations include daily resource capacity and allocation records. Epic 1.2 requires a durable capacity model that supports daily, weekly, monthly, availability, allocation, remaining capacity, utilization, and over-allocation.

## Decision

Capacity will be modeled as explicit time-bucketed availability derived from base capacity, calendar context, status, and exceptions. Allocation is demand against capacity. Remaining capacity and utilization are calculated read models.

## Alternatives

| Alternative | Rejected Because |
| --- | --- |
| Store only allocation percent | Cannot answer availability or remaining capacity reliably. |
| Store only weekly capacity | Poor precision for calendar exceptions and daily overload. |
| Mutate schedules during capacity calculation | Violates scheduling isolation. |

## Consequences

- Resource utilization can be explained and tested.
- Over-allocation detection is separate from automatic leveling.
- Aggregation performance must be considered for portfolio views.

## Future Impact

Capacity read models can feed portfolio pressure, forecasting, and AI summaries. Automatic leveling remains a future ADR/ADD.

