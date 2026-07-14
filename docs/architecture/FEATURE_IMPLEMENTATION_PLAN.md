| Feature | Description                    | Dependencies | Estimated Complexity | Status  |
| ------- | ------------------------------ | ------------ | -------------------- | ------- |
| 1.2.1   | ERM Domain Model & Persistence | None         | Medium               | Completed |
| 1.2.2   | Resource CRUD API              | 1.2.1        | Medium               | Implemented |
| 1.2.3   | Resource Assignment           | 1.2.2        | Medium               | Completed |
| 1.2.4   | Skills Management              | 1.2.1        | Medium               | Completed |
| 1.2.5   | Resource Availability & Capacity Management | 1.2.1 | High | Release Ready (Stage 11 complete) |
| 1.2.6   | Calendar Assignment            | 1.2.5        | High                 | Planned |
| 1.2.7   | Planning Integration           | 1.2.6        | High                 | Planned |
| 1.2.8   | Dashboard Integration          | 1.2.7        | Medium               | Planned |

## Architecture References

- Epic baseline: [ERM Architecture Design Document](ERM_ARCHITECTURE_DESIGN_DOCUMENT.md)
- Feature 1.2.2 ADD: [Feature 1.2.2 Resource CRUD API ADD](FEATURE_1.2.2_RESOURCE_CRUD_API_ADD.md)
- Epic product context: [Epic 1.2 Enterprise Resource Management](../product/epics/EPIC-1.2-Enterprise-Resource-Management.md)

## Implementation Status

### Feature 1.2.2

Status: Implemented

Delivered:

- Resource CRUD API
- Resource Controller
- Resource DTOs
- Resource Mapper
- Resource API Service
- ERM Resource permissions
- Swagger documentation
- Backend tests
- Docker verification
- Ubuntu verification

### Feature 1.2.5

Status: Release Ready (Stage 11 complete; Stage 12 pending)

Delivered:

- ERM-owned Resource Capacity Policy and Availability Override persistence
- Canonical `capacity_minutes_per_working_day` supply unit
- Domain services and validation services
- DTO, command, mapper, API service, and controller boundaries
- Status-based Capacity Policy archival
- Auditable Availability Override soft deletion
- Nested Resource ownership enforcement
- ERM capacity and availability permissions through existing RBAC
- Swagger/OpenAPI documentation
- Additive migration `023_v1_2_5_resource_availability_capacity_foundation.sql`
- Idempotent permission seed integration
- Unit, integration, Docker/PostgreSQL, and end-to-end verification

Deferred by design:

- Persisted availability projections
- Persisted utilization or remaining capacity
- Capacity snapshots or caching
- Calendar resolution and Scheduling integration
- Planning persistence reclassification
