# Product Backlog

This backlog covers Epic 1.2 Enterprise Resource Management and adjacent roadmap items. It is prioritized using MoSCoW tags.

## Implementation Status

| Feature | Status | Delivered | Notes |
| --- | --- | --- | --- |
| 1.2.1 Enterprise Resource Management Foundation | Completed | Resource aggregate, resource persistence, resource validation, internal Resource service, additive database migration. | Public Resource CRUD APIs were delivered in Feature 1.2.2. |
| 1.2.2 Resource CRUD API | Completed | Resource CRUD API, Resource Controller, Resource DTOs, Resource Mapper, Resource API Service, ERM Resource permissions, Swagger, tests. | Docker and Ubuntu verification completed. The next approved ERM feature is Feature 1.2.3 Resource Assignment. |
| 1.2.3 Resource Assignment | Completed | Resource Assignment persistence, validation, application service, duplicate-assignment business rule enforcement, REST API, testing, Docker verification, Ubuntu verification, and release readiness. | Duplicate assignments are never allowed for non-deleted assignments with the same resource, project, optional task, and date range. |
| 1.2.4 Skills Management | Completed | Skill catalog persistence, resource-skill association persistence, DTOs, mappers, validation services, application services, REST API, ERM RBAC wiring, and backend test coverage. | Implementation and release verification completed and merged. |
| 1.2.5 Resource Availability & Capacity Management | Release Ready | Resource Capacity Policy and Availability Override persistence, domain services, validation, REST APIs, ERM permissions, Swagger documentation, backend tests, and runtime verification. | Infrastructure, unit, integration, end-to-end, and documentation verification are complete. Stage 12 remains pending. Derived availability, utilization, remaining capacity, and scheduling integration remain deferred. |

## Must Have

| ID | Item | Description | Release |
| --- | --- | --- | --- |
| ERM-M-001 | Resource Domain | Create Resource aggregate with type, status, optional user link, audit fields. | v1.2 |
| ERM-M-002 | Resource CRUD API | Create, read, update, archive, list, search resources. | v1.2 |
| ERM-M-003 | Resource UI | Resource list, filters, create/edit/archive flows. | v1.2 |
| ERM-M-004 | Resource Types | Human, contractor, team, equipment, facility, vehicle, generic. | v1.2 |
| ERM-M-005 | User Link | Resource Profile may reference User but is not the User. | v1.2 |
| ERM-M-006 | Resource Status | Active, inactive, archived/unavailable lifecycle. | v1.2 |
| ERM-M-007 | Capacity Model | Daily, weekly, monthly capacity representation. | v1.2 |
| ERM-M-008 | Resource Assignment | Assign resources to projects and planning tasks. | v1.2 |
| ERM-M-009 | Availability View | Show capacity, allocation, and remaining capacity. | v1.2 |
| ERM-M-010 | Resource Permissions | Permission checks for read/update/admin operations. | v1.2 |
| ERM-M-011 | Scheduling Isolation | Resource work must not mutate schedule dates. | v1.2 |

## Should Have

| ID | Item | Description | Release |
| --- | --- | --- | --- |
| ERM-S-001 | Skills & Competencies | Skill taxonomy and resource skill levels. | v1.2 |
| ERM-S-002 | Team Assignment | Group human resources into teams. | v1.2 |
| ERM-S-003 | Calendar Assignment | Assign effective resource calendar source. | v1.2 |
| ERM-S-004 | Resource Detail Dashboard | Profile, capacity, availability, assignments, skills. | v1.2 |
| ERM-S-005 | Project Resource Panel | Project workspace resource allocation panel. | v1.3 |
| ERM-S-006 | Portfolio Resource Pressure | Portfolio-level pressure summary. | v1.5 |
| ERM-S-007 | Over-Allocation Indicators | Identify overload periods and contributors. | v1.5 |

## Could Have

| ID | Item | Description | Release |
| --- | --- | --- | --- |
| ERM-C-001 | Cost & Rates | Rate/cost metadata with restricted visibility. | v1.2/v1.3 |
| ERM-C-002 | Bulk Import | CSV import with validation report. | v1.3 |
| ERM-C-003 | Bulk Export | Export filtered resource lists. | v1.3 |
| ERM-C-004 | Certifications | Certification metadata linked to skills. | v1.4 |
| ERM-C-005 | Equipment Scheduling | Equipment/facility availability views. | v1.5 |
| ERM-C-006 | Forecasting | 30/60/90-day utilization forecast. | v1.5 |

## Won't Have In Epic 1.2

| ID | Item | Reason |
| --- | --- | --- |
| ERM-W-001 | Automatic Resource Leveling | Future scheduling integration; high risk to Scheduling Engine. |
| ERM-W-002 | Schedule Date Mutation | Must be handled only through approved Planning/Scheduling design. |
| ERM-W-003 | Timesheets | Separate product domain. |
| ERM-W-004 | Payroll | Out of product scope. |
| ERM-W-005 | Billing/Invoicing | Future finance integration, not ERM foundation. |
| ERM-W-006 | AI Staffing Plans | Future v2 direction. |
| ERM-W-007 | SaaS Tenant Administration | Future v3 direction. |
