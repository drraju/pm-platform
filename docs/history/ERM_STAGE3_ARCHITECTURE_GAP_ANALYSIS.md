# ERM Stage 3 Architecture Gap Analysis

## 1. Executive Summary

This document compares the current PM Platform architecture with the required capabilities for Epic 1.2 Enterprise Resource Management. It is based on repository source code, existing documentation, ADRs, and the Stage 2 Repository Investigation. It is not an Architecture Design Document and does not propose implementation details.

Repository facts:

- The platform has mature foundations for Auth, RBAC, Projects, Tasks, Planning, Scheduling, Enterprise Calendar, Portfolio, Dashboard, persistence, Docker deployment, and frontend feature composition.
- Enterprise Calendar is implemented as a domain module plus public REST/UI surface.
- Scheduling Engine is production-stable and isolated behind `SchedulingContext`.
- Current resource-related functionality exists only inside Planning as project-scoped resource capacities, allocations, and workload snapshots.
- A standalone ERM bounded context does not exist.

Analysis:

- The repository is architecturally ready for Stage 3.5 ADR Review because the major boundaries are documented and the current implementation patterns are discoverable.
- The largest gap is domain ownership: existing resource concepts are Planning-owned, while Epic 1.2 requires a governed Resource bounded context.
- The second major gap is identity separation: current task/project/planning resource references point to Users, while ERM requirements state that Users are not Resources.
- Stage 4 must resolve architectural decisions before implementation can begin.

Open questions:

- What is the final ERM permission model?
- How should existing Planning resource tables relate to future Resource concepts?
- What is the ERM organization/tenant scoping rule before SaaS multi-tenancy exists?

## 2. Existing Capabilities

| Capability | Description | Owner Module | Maturity | Reusability for ERM |
| --- | --- | --- | --- | --- |
| Authentication | JWT login, registration, session, `/auth/me`. | `backend/src/modules/auth` | Implemented | Reusable for protected ERM APIs and frontend sessions. |
| Authorization | Permission keys, decorators, guards, policy service, role/permission entities. | `backend/src/common/authz`, `backend/src/modules/users` | Implemented | Reusable for ERM access control, pending ERM permission decisions. |
| Users | User records, roles, assignable users, user management APIs/UI. | `backend/src/modules/users`, `frontend/app/(app)/users/page.tsx` | Implemented | Reusable as optional identity reference, but not sufficient as Resource domain. |
| Projects | Project CRUD, governance roles, project members, visibility, baselines. | `backend/src/modules/projects` | Implemented | Reusable for project assignment and visibility-related ERM integration. |
| Tasks | Task CRUD, assignees, WBS, milestones, dependencies. | `backend/src/modules/tasks` | Implemented | Reusable for task assignment context; currently user-assignee based. |
| Planning Workspace | Schedule snapshots, planning task schedules, portfolio dependencies, project-scoped resource capacity/allocation foundations. | `backend/src/modules/planning` | Implemented | Partially reusable for understanding current allocation/capacity behavior; ownership gap remains. |
| Scheduling Engine | Graph builder, forward pass, backward pass, float, critical path, orchestration through `PlanningScheduleEngineService`. | `backend/src/modules/planning`, `backend/src/common/scheduling` | Production-stable per docs | Reusable only through established Planning/Scheduling boundaries; must remain isolated. |
| Enterprise Calendar | Calendar entity, exceptions, validation, REST API, frontend administration UI. | `backend/src/modules/calendars`, `backend/src/modules/calendar`, `frontend/features/calendar` | Implemented | Reusable as calendar association source and UI/API pattern; Calendar ownership must remain intact. |
| Portfolio | Portfolio summary metrics from visible projects, risks, issues, tasks, health. | `backend/src/modules/portfolio` | Implemented | Reusable reporting consumer; no current resource utilization input. |
| Executive/User Dashboard | Assigned projects/tasks, overdue/upcoming tasks, risks, issues, health. | `backend/src/modules/dashboard` | Implemented | Reusable reporting surface; no current ERM metrics. |
| Persistence | TypeORM entities, SQL migrations, UUID base entities, audit columns, soft delete. | `backend/src/database`, `backend/src/common/entities` | Implemented | Reusable persistence conventions for any future ERM persistence. |
| Audit Model | `AuditableEntity` with created/updated/deleted actor columns. | `backend/src/common/entities/auditable.entity.ts` | Implemented | Reusable for ERM domain records requiring audit. |
| Validation | Global `ValidationPipe`, class-validator DTOs, domain validation services. | `backend/src/main.ts`, feature DTOs/services | Implemented | Reusable patterns for ERM validation. |
| API Documentation | Swagger setup and controller decorators. | `backend/src/main.ts`, controllers | Implemented | Reusable API convention for future ERM endpoints. |
| Frontend UI Framework | Next.js routes, React components, Tailwind CSS, feature folders. | `frontend/app`, `frontend/features`, `frontend/components` | Implemented | Reusable for ERM pages/components. |
| Shared Frontend Components | Page header, app shell, modal/form components, dashboard cards, tables. | `frontend/components` | Implemented | Reusable UI building blocks for ERM screens. |
| Testing | Jest backend specs, Vitest frontend tests, feature and integration-style tests. | `backend/src/**/*.spec.ts`, `frontend/tests` | Implemented | Reusable test patterns for ERM design verification later. |
| Docker/Health | Docker Compose for PostgreSQL, Redis, MinIO, backend, frontend; health/startup validation. | `docker-compose.yml`, `backend/src/modules/health` | Implemented | Reusable deployment and verification baseline. |

## 3. Required ERM Capabilities

| Required Capability | Why It Is Required | Current Partial Module | Already Exists | Gap Classification |
| --- | --- | --- | --- | --- |
| Resource Master | Epic 1.2 requires first-class resource identity, lifecycle, type, status, and governance. | Users and Planning resource foundations | No standalone Resource aggregate exists | Missing |
| Resource Profiles | Required to capture display name, role/title, team, location, manager, and optional user reference. | Users has identity/profile fields | Not as Resource Profile | Missing |
| Resource Types | Required to support human, contractor, team, equipment, facility, vehicle, and generic resources. | `ResourceAllocationUnit` supports `user` and `team` | Partially | Partial |
| Skills and Competencies | Required for searchable staffing and competency matching. | Not found | No | Missing |
| Calendar Association | Required to associate resources with calendar context and future effective calendar metadata. | Enterprise Calendar exists | Calendar exists, Resource association does not | Partial |
| Capacity | Required for daily/weekly/monthly capacity, utilization, and over-allocation visibility. | Planning `ResourceCapacity` | Partially, project-scoped | Partial |
| Availability | Required to show remaining availability and explain resource availability. | Planning `ResourceWorkloadSnapshot` and capacity/allocation concepts | Partially as snapshot output | Partial |
| Assignments | Required to assign resources to projects/tasks and view allocation demand. | Planning `ResourceAllocation`, Tasks `assigneeId`, Projects `ProjectMember` | Partially | Partial |
| Cost and Rates | Required by Epic 1.2 for future portfolio planning and controlled financial visibility. | Not found | No | Missing |
| Resource Dashboard | Required for list, filters, detail, capacity/availability/allocation summary. | Dashboard and frontend component patterns | Not as ERM dashboard | Missing |
| Resource Search and Filters | Required for finding resources by type, status, skill, team, and availability. | Users/Projects pages have list/filter patterns | Not for Resources | Missing |
| Resource Permissions | Required for resource governance and sensitive cost/availability visibility. | RBAC framework exists | ERM-specific permissions do not exist | Partial |
| Resource Reporting | Required for portfolio pressure and executive visibility. | Portfolio/Dashboard reporting foundations | No resource metrics yet | Partial |
| Non-Human Resource Support | Required by ADR-009 and Epic 1.2 vision. | Not found beyond team string in Planning | No | Missing |

## 4. Gap Matrix

| Capability | Exists | Partial | Missing | Notes |
| --- | --- | --- | --- | --- |
| Authenticated ERM access | Yes |  |  | JWT/Auth framework exists. |
| ERM permission keys |  | Yes |  | Permission framework exists; resource-specific keys not found. |
| Resource bounded context |  |  | Yes | Stage 2 found no standalone ERM/Resource module. |
| Resource aggregate |  |  | Yes | No `Resource` entity/module found. |
| Resource profile lifecycle |  |  | Yes | No Resource Profile implementation found. |
| Optional User reference model |  | Yes |  | Users exist; no Resource-to-User model exists. |
| Non-human resources |  | Yes |  | Planning supports team strings only; equipment/facility/vehicle/generic not found. |
| Skill taxonomy |  |  | Yes | No skills/competencies module or tables found. |
| Enterprise Calendar source | Yes |  |  | Calendar domain/API/UI exist. |
| Resource calendar assignment |  |  | Yes | Calendar exists; assignment to resources does not. |
| Daily capacity concept |  | Yes |  | Planning `ResourceCapacity` stores project-scoped date capacity. |
| Weekly/monthly capacity |  |  | Yes | No explicit ERM capability found. |
| Availability model |  | Yes |  | Planning workload snapshots include allocated/capacity/overallocated; no Resource availability domain. |
| Allocation demand |  | Yes |  | Planning `ResourceAllocation` exists and is project-scoped. |
| Project/task assignment |  | Yes |  | Task assignees and project members use Users; Planning allocations use user/team. |
| Cost/rate metadata |  |  | Yes | No current model found. |
| Resource dashboard |  |  | Yes | Dashboard exists, but not ERM-specific. |
| Resource search/filter |  |  | Yes | List/filter patterns exist in UI, but no Resource surface. |
| Portfolio resource pressure |  | Yes |  | Portfolio exists; no resource pressure metrics currently consumed. |
| Executive resource metrics |  | Yes |  | Dashboard exists; no utilization/availability metrics found. |
| Scheduling isolation | Yes |  |  | ADR-003 accepted; SchedulingContext internal. |
| Calendar ownership | Yes |  |  | Calendar owns working hours, holidays, exception days. |
| Persistence conventions | Yes |  |  | UUID, audit, soft delete, migrations are established. |
| Frontend feature pattern | Yes |  |  | Calendar feature is a reusable pattern. |

## 5. Reusable Components

| Asset | Location | Why It Can Be Reused |
| --- | --- | --- |
| `BaseEntity` | `backend/src/common/entities/base.entity.ts` | Provides UUID, timestamps, soft delete convention. |
| `AuditableEntity` | `backend/src/common/entities/auditable.entity.ts` | Provides actor audit columns used across domain records. |
| TypeORM repository injection | Existing feature services | Established persistence access pattern. |
| Additive SQL migrations | `backend/src/database/migrations` | Existing database evolution convention. |
| Permission guards/decorators | `backend/src/common/authz` | Existing authorization mechanism for protected modules. |
| `AuthorizationPolicyService` | `backend/src/common/authz/authorization-policy.service.ts` | Central permission resolution used by guards. |
| `ProjectVisibilityService` | `backend/src/modules/projects/project-visibility.service.ts` | Existing visibility service for project-scoped data access. |
| `ProjectHealthService` | `backend/src/modules/health/project-health.service.ts` | Existing cross-reporting health calculation pattern. |
| Global validation pipe | `backend/src/main.ts` | Enforces DTO whitelisting and transform globally. |
| DTO and Swagger patterns | Existing controllers/DTOs | Consistent API documentation and request validation pattern. |
| Calendar domain/API split | `backend/src/modules/calendars`, `backend/src/modules/calendar` | Demonstrates internal domain module plus public API module separation. |
| `CalendarMapper` pattern | `backend/src/modules/calendar/calendar.mapper.ts` | Demonstrates DTO-only public response mapping. |
| `CalendarValidationService` | `backend/src/modules/calendars/calendar-validation.service.ts` | Demonstrates reusable domain validation. |
| `SchedulingContext` | `backend/src/common/scheduling/scheduling-context.ts` | Existing scheduling adapter boundary; reusable as a constraint/reference only. |
| `SchedulingContextFactory` | `backend/src/common/scheduling/scheduling-context.factory.ts` | Existing adapter construction boundary; not a public API. |
| Frontend shared API client | `frontend/lib/api/client.ts` | Existing request, auth token, and error handling path. |
| Frontend feature folder pattern | `frontend/features/calendar` | Demonstrates API/hooks/components/constants/types organization. |
| Shared modal/form UI | `frontend/components/ui` | Reusable CRUD dialog/form UI patterns. |
| `PageHeader` and `AppShell` | `frontend/components/layout` | Reusable page identity and navigation layout. |
| Jest/Vitest tests | `backend/src/**/*.spec.ts`, `frontend/tests` | Existing test style for services, controllers, integration-like behavior, pages. |

## 6. Architectural Constraints

Mandatory constraints for Stage 4:

- Bounded contexts must remain explicit. Current modules separate Auth, Users/RBAC, Projects, Tasks, Planning, Calendar, Portfolio, Dashboard, RAID, Notifications, Integrations, and Health.
- Scheduling Engine must remain isolated. ADR-003 states it accepts `SchedulingContext`, does not access persistence, does not import Calendar or Resource entities, and does not expose public SchedulingContext APIs.
- Planning remains the scheduling consumer. Documentation shows PlanningService builds context through `SchedulingContextFactory` and consumes `PlanningScheduleEngineService`.
- Calendar owns working hours, holidays, exception days, and calendar definitions. Calendar services must not mutate schedules.
- Identity must remain separate from Resource domain. Epic 1.2 and ADR-006 state Users are not Resources.
- Database changes in later stages must follow additive migration conventions.
- Persistence should follow existing UUID, timestamp, soft delete, and audit conventions.
- API boundaries should use DTOs, validation, Swagger decorators, guards, and platform exception style.
- Existing APIs must remain backward compatible.
- Frontend route pages should stay thin and feature logic should live under `frontend/features`.
- Shared frontend API client should remain the API integration path.
- Portfolio and Dashboard are reporting consumers, not authoritative owners of Planning, Calendar, or future Resource data.
- Future AI Project Manager must consume deterministic outputs and must not become scheduling authority.

## 7. Integration Points

| Integration Point | Purpose | Existing Interface | Dependency Direction | Current Observations |
| --- | --- | --- | --- | --- |
| Enterprise Calendar | Calendar definitions, working hours, holidays, exception days, future resource calendar context. | `/calendar` API, `EnterpriseCalendar`, `EnterpriseCalendarException`, Calendar DTOs. | Calendar is currently consumed by Calendar UI/API only; future ERM direction must preserve Calendar ownership. | Calendar has no Resource association today. |
| Scheduling Engine | Deterministic scheduling, critical path, float, working day calculations per docs. | Internal `SchedulingContext`, `SchedulingContextFactory`, `PlanningScheduleEngineService`. | Planning consumes Scheduling; Scheduling must not import Calendar/Resource/persistence. | No calendar/resource inputs currently exist in SchedulingContext. |
| Planning Workspace | Project planning, snapshots, schedule rows, resource capacity/allocation foundations. | Planning REST endpoints, Planning entities, `PlanningService`. | Planning consumes Scheduling and repositories. Future ERM relationship is unresolved. | Current resource tables are Planning-owned and project-scoped. |
| Portfolio | Portfolio reporting and future resource pressure visibility. | `/portfolio/summary`, `PortfolioService`, portfolio DTOs. | Portfolio reads Projects, Risks, Issues, Tasks, visibility, health. | No resource utilization/capacity inputs currently consumed. |
| Executive Dashboard | Executive/user reporting and future utilization/resource visibility. | Dashboard controllers/services and frontend dashboard pages. | Dashboard reads Projects, ProjectMembers, Tasks, Risks, Issues, visibility, health. | No ERM-specific widgets or metrics found. |
| Future AI Project Manager | Future summaries/recommendations consuming deterministic platform outputs. | Documentation only. | AI must consume Planning/Portfolio/Dashboard outputs and must not schedule. | No current AI implementation found. |
| Auth/RBAC | Protect ERM administrative and reporting functions. | Guards, permission decorators, users/roles/permissions. | ERM would consume Auth/RBAC; Auth/RBAC should not depend on ERM. | Resource-specific permissions are not present. |
| Projects/Tasks | Project/task assignment context. | Project, ProjectMember, Task, TaskDependency entities/services. | Planning and reporting already consume Projects/Tasks. ERM relationship remains to be decided. | Current assignment concepts reference Users. |

## 8. Architectural Risks

| Risk | Description | Impact | Likelihood | Repository Evidence |
| --- | --- | --- | --- | --- |
| Ownership ambiguity | Resource capacity/allocation tables already exist inside Planning while ERM requires Resource ownership. | High | High | `backend/src/modules/planning/entities/resource-capacity.entity.ts`, `resource-allocation.entity.ts`, Stage 2 investigation. |
| Identity/resource coupling | Current project membership, task assignment, and Planning resources reference Users. ERM requires Users not be Resources. | High | High | `Task.assigneeId`, `ProjectMember.userId`, `ResourceCapacity.userId`, ADR-006. |
| Scheduling coupling | Future ERM may be tempted to feed scheduling directly or mutate dates. | High | Medium | ADR-003 prohibits Scheduling Engine persistence/entity dependencies; Resource Architecture says Resource must not mutate schedule dates. |
| Calendar logic duplication | Future resource availability could duplicate Calendar rules outside Calendar ownership. | Medium | Medium | Calendar owns working hours/holidays/exceptions; ADR-008 preserves Calendar ownership. |
| Duplicated capacity concepts | Existing Planning capacity/allocation may overlap with future Resource capacity/availability concepts. | High | High | Planning `ResourceCapacity`, `ResourceAllocation`, `ResourceWorkloadSnapshot`; ADR-007. |
| Permission gaps | ERM requires sensitive availability/cost governance, but no ERM permissions exist. | High | High | `PermissionKey` has project/task/portfolio/dashboard/user permissions but no resource-specific keys. |
| Organization scoping ambiguity | Calendar API exposes organization metadata but persistence does not have organization columns; ERM scoping remains unknown. | Medium | Medium | `DEFAULT_ORGANIZATION_ID = 'default'` in Calendar service; Stage 2 investigation. |
| Reporting performance | Resource search/utilization/portfolio pressure may require indexed aggregation; current resource reporting is limited. | Medium | Medium | Stage 1 success metrics mention avoiding N+1; current Portfolio/Dashboard do not consume resource pressure. |
| API consistency drift | Calendar uses DTO responses, while current Planning resource endpoints return entities. | Medium | Medium | Calendar mapper/DTO pattern vs Planning controller `ApiOkResponse({ type: ResourceAllocation })`. |
| Future cyclic dependencies | ERM, Planning, Calendar, and Scheduling may need to exchange context. | High | Medium | Stage 2 dependency analysis identifies Planning, Calendar, Scheduling, and future ERM boundaries as cyclic-risk areas. |
| Migration complexity | Existing `resource_*` Planning tables may conflict with future ERM naming/ownership. | Medium | High | Migration `013_v0_2_0_phase_1_enterprise_planning_engine.sql` creates resource tables. |
| Extensibility limits | Current `ResourceAllocationUnit` supports only `user` and `team`; ERM requires seven resource types. | Medium | High | `backend/src/common/enums/resource-allocation-unit.enum.ts`, ADR-009. |

## 9. Architectural Decisions Required

The following decisions remain for the Architecture Design Document. This section intentionally does not answer them.

- Resource identity model.
- Resource aggregate boundary.
- Resource lifecycle states.
- Resource type model.
- Optional User-to-Resource relationship.
- Team/resource grouping model.
- Skill and competency ownership.
- Capacity ownership.
- Availability ownership.
- Allocation and assignment ownership.
- Relationship between existing Planning resource tables and future ERM concepts.
- Calendar association ownership and effective calendar resolution boundary.
- Resource permission model.
- Resource visibility and privacy model.
- Cost/rate ownership and visibility rules.
- Organization/tenant scoping for ERM before SaaS multi-tenancy.
- Portfolio resource reporting integration boundary.
- Executive Dashboard resource metrics boundary.
- SchedulingContext extension strategy, if any.
- Read model strategy for utilization/remaining capacity, if any.
- API boundary conventions for ERM.
- Frontend feature boundary and navigation permissions.
- Migration compatibility strategy.

## 10. Dependencies That Must Not Change

Repository-backed invariants:

- Scheduling Engine owns CPM, graph validation, forward pass, backward pass, float, and critical path.
- Scheduling Engine must not access persistence.
- Scheduling Engine must not import Calendar or Resource entities.
- `SchedulingContext` remains an internal adapter, not a public API or database table.
- Calendar owns working hours, holidays, exception days, and calendar definitions.
- Calendar services must not mutate schedules.
- Planning remains the current consumer of Scheduling Engine output.
- Portfolio remains a reporting/aggregation context and not an owner of source project/task/resource data.
- Dashboard remains a reporting/aggregation surface and not an owner of source project/task/resource data.
- Users/Auth remain responsible for identity, login, RBAC, and user status.
- Resource must remain separate from User per Epic 1.2 and ADR-006.
- Database evolution must remain additive and migration-driven.
- Existing APIs and persisted behavior must remain backward compatible.
- Frontend should continue using route pages, feature folders, shared API client, and shared UI patterns.

## 11. Readiness Assessment

Strengths:

- Core platform architecture is documented and implemented.
- Scheduling isolation is accepted in ADR-003 and reflected in code structure.
- Calendar domain/API/UI are implemented and provide reusable patterns.
- Persistence conventions are consistent.
- RBAC, audit, validation, Swagger, testing, and Docker foundations exist.
- Stage 2 investigation has mapped current dependencies and boundaries.

Weaknesses:

- ERM bounded context is missing.
- Existing resource concepts are embedded in Planning.
- Current resource units do not cover required ERM resource types.
- Resource-specific permissions are missing.
- Cost, skills, resource profile lifecycle, and resource calendar assignment are missing.
- Portfolio/Dashboard do not currently consume resource pressure or utilization.

Unknowns:

- Final ERM permission taxonomy.
- Organization/tenant scoping.
- Future treatment of Planning resource capacity/allocation tables.
- Assignment ownership between ERM, Planning, Projects, and Tasks.
- Effective calendar resolution boundary.
- Cost visibility policy.
- Capacity unit/calculation ownership boundaries.

Prerequisites remaining:

- Stage 3.5 ADR Review for proposed ADR-006 through ADR-009.
- Stage 4 Architecture Design Document.
- Explicit decisions for the items listed in Section 9.

Overall readiness:

Ready for Stage 3.5 ADR Review.

The repository has sufficient documentation, source evidence, and Stage 2 investigation detail to proceed to ADR review. Additional implementation work should not begin until the ADR review and Stage 4 ADD resolve the architectural decisions above.
