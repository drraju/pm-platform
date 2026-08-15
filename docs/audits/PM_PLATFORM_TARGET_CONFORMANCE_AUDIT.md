# PM Platform Target Conformance Audit

- **Audit type:** Read-only, repository-to-target conformance audit
- **Audit date:** 2026-08-14
- **Repository:** `pm-platform`
- **Repository commit:** `352ac1e`
- **Evidence basis:** Current working tree, including pre-existing modified and untracked files
- **Governing target:** `docs/architecture/TARGET_PM_PLATFORM_MODEL_V1.md`
- **Current-state reference:** `docs/audits/PLATFORM_PRODUCT_ARCHITECTURE_AUDIT.md`

This report evaluates the repository as observed. It does not implement the target, alter the governing target, or assume that uncommitted work is complete. The target model is authoritative where it conflicts with older architecture documents or the prior audit.

## 1. Executive Summary

The platform is **partially conforming** to the target model. It has a credible domain foundation: one persisted Task entity, explicit Summary/Standard/Milestone kinds, direct dependency semantics, project membership and project roles, a real scheduling subsystem, substantial RAID and resource services, and a provider-agnostic AI platform. Those foundations should be preserved.

The main conformance failure is not missing domain breadth. It is inconsistent ownership of commands and authority. Three backend paths create or update the same Task, several frontend workspaces reconstruct hierarchy and planning calculations independently, and the browser infers capabilities from global permissions and role names instead of consuming backend-resolved object capabilities. The result is avoidable drift between Planning, Delivery, Today, My Tasks, Daily Review, and the server.

The most urgent risks are security-related:

- A known JWT fallback secret is active unless `JWT_SECRET` is supplied, while the production Docker image sets `NODE_ENV=production` and `docker-compose.yml` does not supply that variable.
- Access and refresh tokens use the same secret and payload shape; the API bearer strategy does not distinguish token purpose.
- Role changes do not invalidate or rebind existing JWT role claims.
- Portfolio-level visibility is treated as global project mutation authority by `AuthorizationPolicyService`, contrary to the target.
- Project reads, document reads, exports, and the assignable-user directory expose full internal projections to scoped external users; there is no Customer/Partner projection boundary.
- Task and document moves authorize the source object but do not establish equivalent authority over the destination project.

Product conformance is mixed. Project tabs are moving toward Overview, Planning, Delivery, Govern, Team, and Documents. However, global Today, My Tasks, Daily Review, and project Delivery/Today remain competing surfaces; Review has not moved under Delivery; Home does not own My Work; Resources has backend depth but no global workspace; and Intelligence is represented by an executive dashboard plus a separate AI Playground rather than one target-aligned destination.

The recommended sequence is:

1. Close authentication, project-scope, external-projection, and cross-project mutation gaps.
2. Establish one backend capability resolver and expose a frontend capability manifest.
3. Consolidate all Task mutations behind one canonical application service while retaining compatibility routes temporarily.
4. Consolidate My Work, Today, Delivery, and Review around shared projections and commands.
5. Add contextual quick-create and simplify hierarchy, roll-up, API-client, and AI-policy duplication.
6. Defer Program and Organisation entities; do not rewrite the Task model, hierarchy semantics, direct dependencies, or scheduling engine.

## 2. Audit Methodology

### Scope and rules

The audit was performed as static, read-only analysis. No application code, tests, configuration, schema, target document, prior audit, branch, commit, or remote was changed. The only created artifact is this report.

The evidence hierarchy was:

1. `TARGET_PM_PLATFORM_MODEL_V1.md` for target-state decisions.
2. Executable code, schema, migrations, tests, and deployment configuration for current behavior.
3. `PLATFORM_PRODUCT_ARCHITECTURE_AUDIT.md` as a current-state lead, verified against code before reuse.
4. Other architecture documents as context only; they do not override the target.

### Classification method

| Classification | Meaning |
|---|---|
| CONFORMING | Current implementation materially matches the locked target. |
| PARTIALLY CONFORMING | Important target behavior exists, but coverage, ownership, or UX is incomplete. |
| NON-CONFORMING | Current behavior contradicts or omits a locked target requirement. |
| DUPLICATED / COMPETING | More than one implementation owns the same target responsibility. |
| INSUFFICIENT EVIDENCE | Static repository evidence cannot determine the behavior reliably. |

Severity reflects present consequence: **CRITICAL**, **HIGH**, **MEDIUM**, or **LOW**. Priority reflects recommended order: **P0** immediate, **P1** next foundation, **P2** product convergence, **P3** cleanup, **P4** retain or defer.

Final scores use a weighted control assessment: CONFORMING = 1.0, PARTIALLY CONFORMING = 0.5, DUPLICATED / COMPETING = 0.25, and NON-CONFORMING = 0. Controls are weighted by consequence (Critical 4, High 3, Medium 2, Low 1). Insufficient-evidence controls are excluded rather than treated as failures.

### Repository coverage

The repository inventory contained 1,262 files: 626 under `backend`, 255 under `frontend`, 367 under `docs`, and 14 at repository root or elsewhere. The test inventory contained 192 test/spec files: 140 backend and 52 frontend. All repository paths were inventoried and searched for target concepts; behaviorally relevant implementations were then read directly.

Directly inspected evidence included:

- Target and audit sources: `docs/architecture/TARGET_PM_PLATFORM_MODEL_V1.md`, `docs/audits/PLATFORM_PRODUCT_ARCHITECTURE_AUDIT.md`.
- Product and navigation: `frontend/components/layout/app-navigation.ts`, `frontend/components/project/project-tabs.tsx`, `frontend/components/delivery/delivery-views.ts`, Dashboard, Today, My Tasks, Daily Review, Planning, Delivery, Govern, Team, Documents, executive, and redirect route pages.
- Task and planning domain: Task and TaskDependency entities, Task DTOs/controllers/services/modules, Projects task methods, Planning controller/service/graph/snapshot services, scheduling foundation, planning roll-up, milestone projection/query, dependency panels, and hierarchy utilities.
- IAM and external access: auth module/service/JWT strategy/guards, user/role/project-role enums, role migrations, authorization policy, project visibility, project service/controller, membership entity, UI capability resolver, app shell, documents, project export, and users directory.
- Portfolio, resources, and AI: portfolio services/controllers, resource modules/controllers/entities, AI gateway, registries, capabilities, skills, context assembly, execution pipeline, providers, response normalization, frontend AI policy code, and AI architecture documents.
- Deployment and data: `docker-compose.yml`, backend/frontend Dockerfiles, TypeORM configuration, entities, migrations, and schema initialization.
- Tests: task hierarchy/context/dependency/scheduling, planning services/workspaces, Delivery/Today/project workspaces, authorization/auth/users/roles, documents/export, resource modules, portfolio, and AI platform specs.

No tests were executed because the requested activity is an evidence-first, read-only audit. Test source was inspected as evidence of intended contracts and coverage.

## 3. Target Model Reference

The following locked target decisions govern this audit:

- Global navigation is Home, Portfolio, Projects, Planning, Resources, Intelligence, and Administration.
- Home owns My Work; Today is a My Work filter and a contextual Delivery mode, not an independent product area.
- Daily Review becomes Project > Delivery > Review.
- Project structure is Overview, Planning, Delivery, Govern, Team, Documents, and Reports.
- There is one canonical Task with Summary, Standard/Sub-task relationship, and Milestone kinds.
- Planning is the full authoring workspace. Delivery, My Work, and Today use contextual quick-create through the same Task application service.
- One command boundary owns create, update, assign, reassign, move, complete, and delete.
- Contextual parents or children can be visible without granting edit authority.
- Dependencies remain direct. A dependency on a parent does not propagate to its children.
- Effective authority combines global role, scope, project role, membership, assignment, capability, and object state.
- Portfolio visibility does not automatically grant mutation authority in every project.
- Customer and Partner users receive an explicit external projection.
- Portfolio is a valid concept. A persisted Program and Organisation/multitenancy model are deferred.
- AI is horizontal and must use canonical authorization, context, domain commands, and user approval before mutation.
- Frontend controls consume a backend-resolved capability manifest.
- Existing Task identity, hierarchy, milestone, direct dependency, project-membership, project-role, and scheduling concepts are retained rather than redesigned.

Older documents contain conflicting statements, notably broad Portfolio Manager edit authority, full project context for every visible user, My Tasks limited to direct assignment, tenant isolation as an immediate AI requirement, and a planned Program entity. Those statements are treated as superseded where they conflict with the governing target.

## 4. Current -> Target Conformance Matrix

| Area | Current state | Classification | Severity | Recommendation | Priority |
|---|---|---|---|---|---|
| Global navigation | Today, Daily Review, My Tasks, Risks, Issues, Calendar, executive Dashboard, and AI Playground compete with target destinations; Planning/Resources are unavailable. | NON-CONFORMING | HIGH | REDESIGN | P1 |
| Project workspace | Overview, Planning, Delivery, Govern, Team, Documents are visible; Reports is absent and Review is not under Delivery. | PARTIALLY CONFORMING | MEDIUM | CONSOLIDATE | P1 |
| Canonical Task identity | One persisted Task supports Summary, Standard, and Milestone. | CONFORMING | LOW | KEEP | P4 |
| Task command ownership | Tasks, Projects, and Planning services independently create/update the same Task. | DUPLICATED / COMPETING | HIGH | CONSOLIDATE | P1 |
| Task quick-create | Full creation exists in Planning; Delivery, My Work, and Today do not provide target quick-create. | NON-CONFORMING | MEDIUM | REDESIGN | P2 |
| Hierarchy visibility | Parent/child context and read-only contextual rows exist; hierarchy derivation is duplicated in several clients. | PARTIALLY CONFORMING | MEDIUM | CONSOLIDATE | P2 |
| Direct dependency semantics | Graph builder and tests preserve direct edges without parent-child propagation. | CONFORMING | LOW | KEEP | P4 |
| Scheduling | One backend scheduling foundation exists; lag is persisted but not applied and Start-to-Finish is silently omitted. | PARTIALLY CONFORMING | MEDIUM | INVESTIGATE | P2 |
| Delivery and Review | Delivery has List, Today, Board, Timeline, History; Daily Review is a separate global application. | DUPLICATED / COMPETING | HIGH | CONSOLIDATE | P1 |
| Home / My Work | My Tasks is a useful cross-project surface but sits outside Home and lacks Waiting/Delegated target views. | PARTIALLY CONFORMING | MEDIUM | CONSOLIDATE | P1 |
| Today | Global Today selects one project while Delivery also has Today and My Tasks has a Today filter. | DUPLICATED / COMPETING | MEDIUM | CONSOLIDATE | P1 |
| Role vocabulary | Seven global target roles exist; four project roles exist, with some UI/tests conflating global and project-manager language. | PARTIALLY CONFORMING | MEDIUM | SIMPLIFY | P2 |
| Effective authorization | Global permission checks and role-name inference are mixed with project scope; no canonical resolved capability contract exists. | NON-CONFORMING | CRITICAL | STRENGTHEN SECURITY | P0 |
| Portfolio authority | Portfolio/Executive visibility is treated as global project mutation authority. | NON-CONFORMING | HIGH | STRENGTHEN SECURITY | P0 |
| External users | Customer/Partner roles exist, but explicit project/document/export/user-directory projections do not. | NON-CONFORMING | HIGH | REDESIGN | P0 |
| Portfolio product | Cross-project summary and dependency concepts exist without an unnecessary Portfolio entity. | PARTIALLY CONFORMING | MEDIUM | KEEP | P2 |
| Program / Organisation | No persisted Program, Organisation, or tenant domain was found. | CONFORMING | LOW | DEFER | P4 |
| AI platform | Provider-agnostic horizontal platform and read-only capabilities exist; server object scope and real authorization hooks do not. | PARTIALLY CONFORMING | HIGH | STRENGTHEN SECURITY | P1 |
| Frontend capabilities | Controls use locally inferred roles/permissions; some workspaces pass mutation flags as true. | NON-CONFORMING | HIGH | REDESIGN | P1 |
| Backend boundaries | Domain modules exist, but Task commands, project projections, and scope decisions are split across services. | DUPLICATED / COMPETING | HIGH | CONSOLIDATE | P1 |
| Data model | Core entities match the target; compatibility vocabularies and one dormant schedule-snapshot entity remain. | PARTIALLY CONFORMING | LOW | SIMPLIFY | P3 |
| Test posture | Strong domain tests exist; high-risk negative authorization and external-projection tests are missing. | PARTIALLY CONFORMING | HIGH | STRENGTHEN SECURITY | P0 |

## 5. Product / Navigation Findings

### PROD-01 - Global navigation contradicts the target

- **Classification:** NON-CONFORMING
- **Severity / priority:** HIGH / P1
- **Recommendation:** REDESIGN

`frontend/components/layout/app-navigation.ts:10-109` exposes Home, Portfolio, Projects, Today, Daily Review, executive Dashboard, AI Playground, My Tasks, Risks, Issues, Calendar, and Users. Planning and Resources appear as unavailable items. Intelligence is not represented by its target name or a unified destination, and Administration is not a coherent top-level workspace.

This arrangement makes implementation history visible as product architecture. Risks and Issues belong under Govern, Daily Review belongs in Delivery, Today belongs inside My Work and Delivery, and AI is horizontal rather than a separate administrative playground for ordinary use.

The target navigation should be implemented after capability resolution so links and route entry are based on server-resolved access, not role-name lists.

### PROD-02 - Project structure is close but incomplete

- **Classification:** PARTIALLY CONFORMING
- **Severity / priority:** MEDIUM / P1
- **Recommendation:** CONSOLIDATE

`frontend/components/project/project-tabs.tsx:38-89` visibly provides Overview, Planning, Delivery, Govern, Team, and Documents. Legacy Today, Execution, Tasks, RAID, Calendar, and AI tabs are hidden or redirected, which is positive convergence. Reports is not a visible project destination, and Delivery lacks Review.

Retain the six aligned tabs, add Reports when its real journeys are ready, and place Review inside Delivery. Avoid restoring hidden legacy tabs as parallel workspaces.

### PROD-03 - Resources and Intelligence have uneven product depth

- **Classification:** PARTIALLY CONFORMING
- **Severity / priority:** MEDIUM / P2
- **Recommendation:** CONSOLIDATE

The backend contains substantial resource capability and tests, while the frontend has only project Team/resource views. The executive dashboard and AI Playground cover pieces of Intelligence but do not form the target destination. Reuse the existing resource and portfolio read models; do not create replacement domain engines for the sake of navigation.

### PROD-04 - Legacy routes are being redirected appropriately

- **Classification:** PARTIALLY CONFORMING
- **Severity / priority:** LOW / P3
- **Recommendation:** KEEP

Project Tasks and Execution redirect to Delivery; RAID redirects to Govern; older Kanban and timeline routes redirect toward current project routes. This is the right migration mechanism. The remaining requirement is an explicit redirect/deprecation timetable once target routes are stable.

## 6. Task Domain Findings

### TASK-01 - One canonical persisted Task exists

- **Classification:** CONFORMING
- **Severity / priority:** LOW / P4
- **Recommendation:** KEEP

`backend/src/modules/tasks/entities/task.entity.ts:10-107` is the single persisted Task identity. It carries project, parent, task kind, assignee, dates, status, and planning/execution attributes. No alternate PlanningTask, DeliveryTask, or MyWorkTask entity was found. Milestone behavior is projected from Task rather than persisted as a separate identity.

This is an important strength. Do not split the model by workspace.

### TASK-02 - Three command paths compete for Task ownership

- **Classification:** DUPLICATED / COMPETING
- **Severity / priority:** HIGH / P1
- **Recommendation:** CONSOLIDATE

Task creation is exposed through `POST /tasks`, `POST /projects/:projectId/tasks`, and `POST /planning/projects/:projectId/tasks`. `TasksService.create` owns one implementation, while `ProjectsService.createProjectTask` and `PlanningService.createPlanningTask` directly apply overlapping rules and persistence for Standard and Summary tasks. Both delegate only parts of Milestone behavior back to TasksService.

The CreateTask and CreateProjectTask DTOs are substantially duplicated. Planning adds another vocabulary (`ownerId`, `taskType`) for the same identity. This makes validation, authorization, hierarchy rules, defaults, and event behavior dependent on entry route.

Introduce one Task application command boundary and make all routes thin adapters. Preserve routes temporarily for compatibility; remove independent persistence logic.

### TASK-03 - Compatibility vocabulary obscures the canonical model

- **Classification:** PARTIALLY CONFORMING
- **Severity / priority:** LOW / P3
- **Recommendation:** SIMPLIFY

`CreateTaskDto` accepts `taskKind`, `taskType`, and `summaryCategory`; Planning uses owner terminology where the canonical model uses assignee. Compatibility may be necessary during migration, but it should be normalized at route boundaries and not leak into domain decisions or new UI contracts.

### TASK-04 - Cross-project Task movement lacks destination authorization

- **Classification:** NON-CONFORMING
- **Severity / priority:** HIGH / P0
- **Recommendation:** STRENGTHEN SECURITY

`UpdateTaskDto` is `PartialType(CreateTaskDto)`, making `projectId` mutable. `TasksService.update` authorizes management of the current Task/source project and validates destination fields and membership, but does not establish that the actor may mutate the destination project. A move must authorize both source and target scope before any state change.

## 7. Planning / Delivery / Review Findings

### PLAN-01 - Planning is the strongest authoring workspace

- **Classification:** PARTIALLY CONFORMING
- **Severity / priority:** MEDIUM / P2
- **Recommendation:** KEEP

`frontend/app/(app)/projects/[id]/planning/page.tsx:78-317` wires task create/update/delete and dependency operations into PlanningWorkspace. The backend owns schedules, snapshots, dependency validation, and graph generation. This matches the target direction, subject to canonical command and capability consolidation.

The page currently supplies mutation handlers without backend-resolved capability gating. Correct that through the capability manifest rather than adding another page-local role policy.

### PLAN-02 - Direct dependency semantics conform

- **Classification:** CONFORMING
- **Severity / priority:** LOW / P4
- **Recommendation:** KEEP

`PlanningGraphBuilderService` builds edges only between the selected predecessor and successor. `planning-graph-builder.service.spec.ts:124-159` explicitly verifies that a dependency from parent A to parent B does not create incoming dependencies on B's children. `SchedulingFoundationService` validates endpoints, self-links, parent-child links, duplicates, and cycles.

Do not introduce automatic dependency inheritance through hierarchy.

### PLAN-03 - Scheduling has two bounded semantic gaps

- **Classification:** PARTIALLY CONFORMING
- **Severity / priority:** MEDIUM / P2
- **Recommendation:** INVESTIGATE

Dependency lag is persisted on `TaskDependency` but is not represented in graph edges or schedule calculations inspected. Start-to-Finish dependencies are silently skipped by the graph builder while the mutation path supports only Finish-to-Start, Start-to-Start, and Finish-to-Finish.

Decide whether lag and Start-to-Finish are supported product concepts. Either implement them in the existing engine with tests or reject/deprecate them explicitly. Do not replace the scheduler.

### PLAN-04 - Review remains a competing application

- **Classification:** DUPLICATED / COMPETING
- **Severity / priority:** HIGH / P1
- **Recommendation:** CONSOLIDATE

Delivery supports List, Today, Board, Timeline, and History. `frontend/app/(app)/daily-review/page.tsx` independently selects projects, loads tasks, filters execution state, performs task actions, and builds AI context. It also passes `canEditTasks` and `canReassignTasks` as literal true values at lines 434-436.

Move Review under Project > Delivery and share Delivery's projection, actions, and resolved capabilities. Preserve a redirect from the old route during migration.

## 8. Personal Work Findings

### WORK-01 - My Tasks is a useful but misplaced My Work foundation

- **Classification:** PARTIALLY CONFORMING
- **Severity / priority:** MEDIUM / P1
- **Recommendation:** CONSOLIDATE

`frontend/app/(app)/tasks/page.tsx` already provides cross-project personal work with All, Today, Upcoming, and Overdue views. Home is currently a summary page whose task metric links to `/tasks`; it does not own the My Work experience. Waiting and Delegated target views are absent.

Promote the existing personal-work projection into Home/My Work. Preserve URL redirects and reuse its filtering logic instead of creating a new task identity or query domain.

### WORK-02 - Contextual visibility correctly differs from edit authority

- **Classification:** CONFORMING
- **Severity / priority:** LOW / P4
- **Recommendation:** KEEP

`TasksService.includePersonalTaskContext`, `frontend/lib/tasks/personal-work-context.ts`, and task-table capability handling include relevant parents and direct children while rendering contextual rows read-only when the actor lacks assignment or project authority. Backend tests explicitly assert that ownership of a parent does not grant edit authority over contextual child tasks.

Retain this rule as the canonical projection behavior.

### WORK-03 - Today exists in three competing forms

- **Classification:** DUPLICATED / COMPETING
- **Severity / priority:** MEDIUM / P1
- **Recommendation:** CONSOLIDATE

The top-level Today page selects one project and renders TodayWorkspace. Delivery has its own Today mode. My Tasks has a cross-project Today filter. The target supports the latter two contexts, not an independent single-project global product area.

Retire the global Today product destination after redirecting it to Home/My Work/Today or the last selected project's Delivery/Today.

### WORK-04 - Waiting and Delegated semantics need a product definition

- **Classification:** INSUFFICIENT EVIDENCE
- **Severity / priority:** MEDIUM / P2
- **Recommendation:** INVESTIGATE

The current model can derive some waiting states from dependencies and assignments, but no durable definition of "delegated by me" was found. Generic Task updates do not preserve a canonical delegator identity. Do not add schema until the Product Owner defines whether Delegated means last assigner, original delegator, current manager relationship, or an explicit delegation object.

## 9. IAM / Authorization Findings

### IAM-01 - Effective authority is not resolved by one canonical service

- **Classification:** NON-CONFORMING
- **Severity / priority:** CRITICAL / P0
- **Recommendation:** STRENGTHEN SECURITY

The backend combines global permissions, project membership, project role, governance fields, and assignment in several policy methods. The frontend independently infers access from global permissions, global role names, project fields, and membership in `resolveProjectUiCapabilities`. `Auth Me` returns global roles and permissions, not resolved object capabilities.

This falls short of the target formula: global role + scope + project role + membership + assignment + capability + object state. Establish one backend resolver that returns per-project and, where needed, per-object capabilities. Controllers and application services must enforce the same decisions; the frontend should consume them only for UX.

### IAM-02 - Global portfolio visibility becomes global project mutation

- **Classification:** NON-CONFORMING
- **Severity / priority:** HIGH / P0
- **Recommendation:** STRENGTHEN SECURITY

`AuthorizationPolicyService.canManageProjectWithPermissions` calls `hasGlobalProjectAccess` before evaluating project scope. That helper includes Portfolio/Executive-style access. Role migrations give Portfolio Manager project and task mutation permissions. Together, a Portfolio Manager can satisfy mutation checks for projects without project membership or scoped authority.

Replace "global project access" with separate read visibility and mutation scope decisions. Portfolio aggregation authority must not imply project mutation.

### IAM-03 - Visibility and mutation scope use different governor definitions

- **Classification:** PARTIALLY CONFORMING
- **Severity / priority:** MEDIUM / P1
- **Recommendation:** CONSOLIDATE

Direct project policy recognizes owner, business owner, delivery lead, and executive sponsor as governance authorities. `ProjectVisibilityService.getVisibleProjectIds` gives non-global actors projects they own, projects where they are members, and projects containing assigned tasks, but omits several governance fields. List and direct-access outcomes can therefore disagree.

The canonical resolver should own both list visibility and direct object capabilities.

### IAM-04 - Optional actor paths fail open

- **Classification:** NON-CONFORMING
- **Severity / priority:** MEDIUM / P0
- **Recommendation:** STRENGTHEN SECURITY

`AuthorizationPolicyService.canViewProject` and `ProjectVisibilityService.getVisibleProjectIds` return broad access when actor context is absent. Existing authenticated controllers may make exploitation path-dependent, but authorization helpers should not interpret a missing principal as unrestricted access. Require explicit system context for trusted internal jobs and fail closed otherwise.

### IAM-05 - Reported Project Manager mismatch is not reproduced by static policy

- **Classification:** INSUFFICIENT EVIDENCE
- **Severity / priority:** MEDIUM / P1
- **Recommendation:** INVESTIGATE

For one fully hydrated actor and project, static backend policy does not support "Task creation succeeds in Planning while Delivery is read-only": both creation and Delivery mutation ultimately require project management authority. A nearby reproducible mismatch does exist: the frontend exposes Planning/Delivery entry and some actions from global permission checks before project scope, while the backend then rejects the mutation.

Runtime actor identity, role claim, project ID, membership, route, and response details are required to distinguish stale tokens, differently shaped project data, or use of competing Task endpoints.

## 10. Role Model Findings

### ROLE-01 - The seven target global roles exist

- **Classification:** CONFORMING
- **Severity / priority:** LOW / P4
- **Recommendation:** KEEP

`UserRole` defines Platform Admin, Executive, Portfolio Manager, Project Manager, Project Team Member, Customer, and Partner. Project membership separately defines Owner, Manager, Contributor, and Viewer. This is a sound two-layer vocabulary.

### ROLE-02 - Permission unions and legacy names weaken role semantics

- **Classification:** PARTIALLY CONFORMING
- **Severity / priority:** HIGH / P1
- **Recommendation:** SIMPLIFY

Role migrations seed broad global task/project permissions and later consolidate legacy roles by permission union. Frontend leadership checks still include legacy `PROGRAM_MANAGER` and `SUPER_ADMIN` names. A frontend test titled for project managers actually uses the global Team Member role plus project Manager membership.

Remove legacy role-name inference after capability manifests are available. Treat global Project Manager as a persona/eligibility signal, not universal project authority.

## 11. External User Findings

### EXT-01 - Customer and Partner lack an explicit project projection

- **Classification:** NON-CONFORMING
- **Severity / priority:** HIGH / P0
- **Recommendation:** REDESIGN

`ProjectsService.findOne` returns the internal project aggregate to any actor who can view the project, including governance identities, membership details, RAID ownership, tasks, and latest updates. No Customer/Partner projection mapper or field policy was found. Older architecture text that promises full context to every visible actor conflicts with the governing target.

Create explicit internal and external read models. External projection rules must be server-enforced and tested independently of frontend hiding.

### EXT-02 - Documents are not read-scoped or externally projected

- **Classification:** NON-CONFORMING
- **Severity / priority:** HIGH / P0
- **Recommendation:** STRENGTHEN SECURITY

Document list and summary controller paths do not pass actor context to `DocumentsService`; the service verifies project existence and returns all records, including external links and approval states. Creation requires project read rather than an explicit contribution capability. Update permits a project move after confirming only that the destination exists.

Require actor context for reads, project both metadata and links, separate view/contribute/approve/manage capabilities, and authorize source and destination on moves.

### EXT-03 - Export and user directory expose internal information

- **Classification:** NON-CONFORMING
- **Severity / priority:** HIGH / P0
- **Recommendation:** REDESIGN

Project export is guarded by global ProjectRead and assembles full project, task, dependency, execution-history, and document data. `/users/assignable` returns all active users and roles, and the project Team page requests it for project readers. Neither path applies an external-user projection.

External exports must use the same projection as on-screen reads. Replace the global user directory with a scoped assignable-user query whose result depends on actor capability and project context.

## 12. Portfolio / Program / Organisation Findings

### PORT-01 - Portfolio works as an aggregate without premature persistence

- **Classification:** PARTIALLY CONFORMING
- **Severity / priority:** MEDIUM / P2
- **Recommendation:** KEEP

`PortfolioService` aggregates visible project, RAID, task, health, and dependency information. No independent Portfolio entity was found. This is sufficient for current cross-project insights and does not block a later persisted Portfolio if identity, ownership, lifecycle, or configuration journeys require one.

First correct project visibility and external projection because portfolio output inherits those policies.

### PORT-02 - Program and Organisation are correctly absent

- **Classification:** CONFORMING
- **Severity / priority:** LOW / P4
- **Recommendation:** DEFER

No persisted Program, Organisation, or tenant domain entity was found. AI contracts contain optional tenant/organisation concepts and Calendar uses a fixed default organisation adapter, but neither constitutes a product domain model.

Do not create Program or Organisation tables to satisfy older architecture documents. The older portfolio-engine plan for a Program entity and AI document demands for immediate tenant isolation are superseded for this target version.

## 13. AI Findings

### AI-01 - Provider-agnostic AI architecture is a strong foundation

- **Classification:** CONFORMING
- **Severity / priority:** LOW / P4
- **Recommendation:** KEEP

The backend contains a horizontal AI gateway, capability and skill registries, context assembly, prompt composition, execution coordination, provider adapters, normalized responses, telemetry/audit interfaces, and MCP foundations. Built-in enterprise capabilities are read-only and use project/task/RAID concepts instead of inventing AI-only domain objects.

Retain this provider architecture.

### AI-02 - AI authorization trusts caller-assembled context

- **Classification:** NON-CONFORMING
- **Severity / priority:** HIGH / P1
- **Recommendation:** STRENGTHEN SECURITY

`AiPlaygroundController.executeCapability` is guarded by ProjectRead but hard-codes request permissions to `[project.read]`, leaves roles empty, and accepts client-supplied project IDs and context source data. `CapabilityExecutionService` checks request-supplied permissions. `EnterpriseContextAssemblyService` can filter by allowed project IDs, but the controller does not supply a server-resolved set. The authorization pipeline stage is explicitly a placeholder, and module authorization/audit/telemetry providers are null.

Resolve actor, project scope, object projection, and capability on the server before context assembly. Never treat caller-asserted permissions or caller-built domain context as authorization evidence.

### AI-03 - AI mutation remains appropriately absent but not yet enabled safely

- **Classification:** PARTIALLY CONFORMING
- **Severity / priority:** MEDIUM / P2
- **Recommendation:** DEFER

No active AI mutation capability was found, so the repository is not currently bypassing Task commands through AI. Before adding writes, require a proposed-action response, explicit user approval, reauthorization at commit time, and execution through the canonical domain command service with ordinary audit behavior.

### AI-04 - Frontend AI policy code competes with the backend platform

- **Classification:** DUPLICATED / COMPETING
- **Severity / priority:** LOW / P3
- **Recommendation:** INVESTIGATE

`frontend/lib/ai/**` contains planning, governance, and authorization code that appears to be consumed by tests rather than runtime product paths. It overlaps responsibilities owned by the backend AI platform. Confirm consumers, then deprecate dormant policy code or narrow it to presentation-only helpers.

### AI-05 - One built-in permission name appears inconsistent

- **Classification:** NON-CONFORMING
- **Severity / priority:** LOW / P2
- **Recommendation:** SIMPLIFY

The Portfolio health capability declares `portfolio.read`, while the role/permission model uses `portfolio.view`. With exact permission checks, the capability is likely unreachable through the current controller contract. Normalize capability definitions to canonical permission identifiers and test every built-in capability against role grants.

## 14. Frontend Architecture Findings

### FE-01 - UI authorization is reconstructed locally

- **Classification:** NON-CONFORMING
- **Severity / priority:** HIGH / P1
- **Recommendation:** REDESIGN

`resolveProjectUiCapabilities` combines global permissions, role names, governor fields, membership, and project role. AppShell stores global roles/permissions in local storage and uses them for navigation filtering. Some pages pass CRUD booleans as true. This is not the target backend-resolved capability manifest and can expose actions that fail only after an API call.

Use one typed capability response for navigation, project tabs, workspace modes, and object actions. Continue enforcing on every backend command; the manifest improves coherence but is not a security boundary by itself.

### FE-02 - Hierarchy and roll-up logic are duplicated

- **Classification:** DUPLICATED / COMPETING
- **Severity / priority:** MEDIUM / P2
- **Recommendation:** CONSOLIDATE

`frontend/lib/tasks/task-hierarchy.ts` is shared, but ProjectWorkspaceTasks and PlanningWorkspace maintain local hierarchy/descendant derivations, while TodayWorkspace layers additional ancestor logic. Planning roll-up also exists in both frontend and backend with subtle duration-handling differences.

Choose a single frontend hierarchy projection helper for display and one backend source for authoritative roll-ups. Frontend code may preview unsaved edits, but should use the same explicit formulas and fixtures.

### FE-03 - Large workspaces concentrate unrelated responsibilities

- **Classification:** PARTIALLY CONFORMING
- **Severity / priority:** MEDIUM / P3
- **Recommendation:** SIMPLIFY

PlanningWorkspace, ProjectWorkspaceTasks, TodayWorkspace, the API client, and Daily Review combine querying, authorization assumptions, hierarchy, calculation, interaction, and rendering. Decompose only along established target boundaries: query/projection hooks, canonical commands, hierarchy display, schedule display, and view components. Avoid a broad visual rewrite before command and capability contracts stabilize.

### FE-04 - The API client is a cross-domain state boundary

- **Classification:** PARTIALLY CONFORMING
- **Severity / priority:** MEDIUM / P3
- **Recommendation:** CONSOLIDATE

The large frontend API client spans authentication, projects, tasks, planning, execution, documents, and other domains while also persisting tokens. Split it into typed domain clients behind one transport/session layer after token handling is corrected. This is a maintainability change, not a reason to change backend routes prematurely.

## 15. Backend Architecture Findings

### BE-01 - Module coverage is broad and aligned to the product

- **Classification:** PARTIALLY CONFORMING
- **Severity / priority:** LOW / P4
- **Recommendation:** KEEP

NestJS modules cover projects, tasks, planning, execution, RAID, resources, portfolio, documents, export, users, roles, auth, and AI. PostgreSQL/TypeORM persistence and Docker deployment match the mandated stack. The missing concern is not module presence but shared policy and command ownership.

### BE-02 - Application boundaries are bypassed inside feature services

- **Classification:** DUPLICATED / COMPETING
- **Severity / priority:** HIGH / P1
- **Recommendation:** CONSOLIDATE

ProjectsService and PlanningService directly persist Task state already owned by TasksService. Documents and project export build projections without a canonical audience policy. Portfolio, project lists, direct project reads, and action policies use related but different visibility rules.

Create narrow shared application services for Task commands, capability resolution, and audience projection. Keep modules as route/feature owners; do not form a generic service layer that erases domain vocabulary.

### BE-03 - Read projections need first-class ownership

- **Classification:** NON-CONFORMING
- **Severity / priority:** HIGH / P1
- **Recommendation:** REDESIGN

Internal and external consumers currently share service outputs. Define named projections for project summary/detail, personal work, Delivery, Review, portfolio, documents, export, and assignable users. Each projection should receive resolved actor scope and return only fields appropriate to that audience.

## 16. Data / Domain Findings

### DATA-01 - Core persistence matches locked concepts

- **Classification:** CONFORMING
- **Severity / priority:** LOW / P4
- **Recommendation:** KEEP

The schema contains Project, ProjectMember, Task, TaskDependency, project documents, RAID records, planning snapshots/schedules, execution history, users/roles, and resource entities. Task kinds and project roles are explicit. No duplicate Milestone identity was found.

### DATA-02 - Most target convergence does not require new schema

- **Classification:** CONFORMING
- **Severity / priority:** LOW / P4
- **Recommendation:** KEEP

Navigation changes, Review relocation, command consolidation, capability resolution, external projections, and contextual quick-create can initially use current entities. Security changes to refresh/session revocation or durable delegation semantics may need schema, but only after their contracts are defined.

### DATA-03 - Schedule snapshot duplication is dormant debt

- **Classification:** DUPLICATED / COMPETING
- **Severity / priority:** LOW / P3
- **Recommendation:** DEPRECATE

`planning-schedule-snapshot.entity.ts` is registered and actively referenced. `schedule-snapshot.entity.ts` defines another ScheduleSnapshot that is not registered in TypeORM or active module paths. Verify that it is unused, then remove the dormant definition rather than introducing another table.

### DATA-04 - Project membership is a useful scoped authority primitive

- **Classification:** CONFORMING
- **Severity / priority:** LOW / P4
- **Recommendation:** KEEP

`ProjectMember` enforces one active membership per project/user and stores an explicit project role. Use it with governance fields, assignment, capability, and object state in the resolver; do not overload the global role to replace project scope.

## 17. Test / Quality Findings

### TEST-01 - Domain behavior has meaningful coverage

- **Classification:** CONFORMING
- **Severity / priority:** LOW / P4
- **Recommendation:** KEEP

The repository has 192 test/spec files. Strong evidence exists for Task hierarchy validation, personal-work contextual visibility, contextual rows remaining read-only, dependency validation, direct dependency semantics, planning graph behavior, scheduling services, milestone projection, Delivery filters/views, role and policy basics, and AI registry/provider/normalization behavior.

### TEST-02 - High-risk negative authorization coverage is missing

- **Classification:** NON-CONFORMING
- **Severity / priority:** HIGH / P0
- **Recommendation:** STRENGTHEN SECURITY

Add regression tests for:

- Production startup failing without an explicit JWT secret.
- Refresh tokens being rejected as bearer access tokens.
- Role/status/password changes invalidating or rebinding active sessions appropriately.
- Portfolio Manager read access without unscoped project mutation.
- Missing actors failing closed.
- Source and destination authorization for Task and document moves.
- Customer/Partner project, document, export, RAID, history, member, and user-directory projections.
- Capability manifest results matching controller/application-service enforcement.
- AI project/object scope being server-derived.
- AI write approval and canonical command execution before any write capability is enabled.

### TEST-03 - Existing tests encode some unsafe behavior

- **Classification:** NON-CONFORMING
- **Severity / priority:** HIGH / P0
- **Recommendation:** REDESIGN

Auth tests expect access and refresh tokens to be generated from the same signed payload. Authorization fixtures grant Portfolio Manager broad project mutation permissions. These tests should be changed with the implementation; they are evidence of current behavior, not contracts to preserve.

### TEST-04 - Product convergence lacks end-to-end contracts

- **Classification:** PARTIALLY CONFORMING
- **Severity / priority:** MEDIUM / P2
- **Recommendation:** STRENGTHEN SECURITY

Add scenario tests for role + project scope + assignment across navigation, Planning, Delivery, Review, and My Work. Include the reported Project Manager scenario using a fixed actor/project fixture and verify both visible controls and API outcomes. Add one cross-workspace Task creation contract proving that every entry surface invokes the same command behavior.

## 18. Duplicate / Competing Implementation Register

| ID | Competing implementations | Risk | Target owner | Action | Priority |
|---|---|---|---|---|---|
| DUP-01 | TasksService, ProjectsService, PlanningService Task creation/update | Rules and authorization drift | Canonical Task application service | CONSOLIDATE | P1 |
| DUP-02 | CreateTaskDto, CreateProjectTaskDto, CreatePlanningTaskDto vocabularies | Inconsistent validation/defaults | Canonical command DTO plus route adapters | SIMPLIFY | P2 |
| DUP-03 | Daily Review and Delivery execution/review behavior | Divergent actions and capability flags | Delivery > Review | CONSOLIDATE | P1 |
| DUP-04 | Global Today, Delivery Today, My Tasks Today | Confusing product ownership | Home/My Work/Today and Delivery/Today | CONSOLIDATE | P1 |
| DUP-05 | Shared task hierarchy plus local Planning/Project/Today derivations | Display/order/context drift | Shared hierarchy projection | CONSOLIDATE | P2 |
| DUP-06 | Frontend and backend planning roll-up formulas | Different duration outcomes | Backend authoritative roll-up | CONSOLIDATE | P2 |
| DUP-07 | Frontend role/capability inference and backend policy | UI/API contradictions | Backend capability resolver/manifest | REDESIGN | P1 |
| DUP-08 | Frontend AI governance/policy library and backend AI platform | Two policy authorities | Backend AI platform | INVESTIGATE | P3 |
| DUP-09 | Active PlanningScheduleSnapshot and dormant ScheduleSnapshot | Concept ambiguity | PlanningScheduleSnapshot | DEPRECATE | P3 |
| DUP-10 | Legacy route pages and target workspaces | Bookmark and maintenance overhead | Target routes plus redirects | DEPRECATE | P3 |
| DUP-11 | TaskKind, TaskType, owner/assignee compatibility terms | Contract ambiguity | TaskKind and assignee | SIMPLIFY | P3 |
| DUP-12 | Full project aggregate reused for internal/external/export | Data overexposure | Audience-specific projections | REDESIGN | P0 |

## 19. Security Findings

| ID | Finding | Evidence | Severity | Recommendation | Priority |
|---|---|---|---|---|---|
| SEC-01 | Known JWT secret fallback can run in production | `backend/Dockerfile:14`; `auth.module.ts:17-19`; `jwt.strategy.ts:10-14`; no `JWT_SECRET` in `docker-compose.yml:48-71` | CRITICAL | STRENGTHEN SECURITY | P0 |
| SEC-02 | Refresh token is bearer-compatible | Access/refresh share secret and payload; JWT strategy checks no token type, issuer, or audience | HIGH | STRENGTHEN SECURITY | P0 |
| SEC-03 | Browser stores access and refresh tokens in localStorage | `frontend/lib/api/client.ts:627-652` | HIGH | STRENGTHEN SECURITY | P0 |
| SEC-04 | Role changes leave stale JWT `roleId` claims active | JWT strategy returns claim role; role updates do not revoke/version sessions | HIGH | STRENGTHEN SECURITY | P0 |
| SEC-05 | Portfolio visibility grants unscoped mutation | `AuthorizationPolicyService.canManageProjectWithPermissions` and broad role migration grants | HIGH | STRENGTHEN SECURITY | P0 |
| SEC-06 | External users receive internal project/document/export projections | ProjectsService detail, DocumentsService list, ProjectExportService, assignable-user directory | HIGH | REDESIGN | P0 |
| SEC-07 | Cross-project Task and document moves lack target-scope authority | Mutable `projectId`; source check plus destination existence/field validation | HIGH | STRENGTHEN SECURITY | P0 |
| SEC-08 | Missing actor can mean unrestricted project visibility | AuthorizationPolicyService and ProjectVisibilityService optional-actor branches | MEDIUM | STRENGTHEN SECURITY | P0 |
| SEC-09 | AI scope and permissions are caller asserted | AI Playground controller and placeholder authorization hook | MEDIUM | STRENGTHEN SECURITY | P1 |
| SEC-10 | UI action visibility can exceed server authority | Local capability reconstruction and literal mutation flags | MEDIUM | REDESIGN | P1 |
| SEC-11 | Default MinIO administrator credentials and floating image tag | `docker-compose.yml:35-41` | MEDIUM | STRENGTHEN SECURITY | P1 |

SEC-01 should fail startup in every non-test environment when secrets are absent. SEC-02 through SEC-04 should be addressed as one session design: purpose-bound short-lived access tokens, protected refresh rotation, revocation/session versioning, and current role resolution. The exact browser storage design should be chosen with the deployment architecture, but a long-lived bearer-compatible refresh token must not remain in localStorage.

## 20. Simplification Opportunities

1. Make one Task application service own all mutations; retain route adapters until callers migrate.
2. Make one backend capability resolver own visibility and mutation decisions; remove frontend role-name policies.
3. Turn Daily Review into a Delivery mode using the same query, action, and capability contracts.
4. Make Home/My Work the cross-project personal-work shell and treat Today as a filter.
5. Standardize hierarchy display on one frontend utility and authoritative roll-ups on the backend.
6. Replace one full project aggregate with named internal, external, export, and AI projections.
7. Split the frontend API client by domain behind one session-aware transport.
8. Remove dormant frontend AI policy and schedule snapshot code after consumer verification.
9. Normalize TaskKind/assignee terminology at boundaries while preserving compatibility aliases temporarily.
10. Keep Portfolio as an aggregate until a real independent lifecycle justifies persistence.

These changes reduce the number of authorities in the system. They do not require a new framework, a new task model, a second scheduling engine, or a broad UI rewrite.

## 21. Recommended Target-State Changes

### REC-01 - Canonical capability resolution

Create a backend application service that accepts actor and object context and resolves capabilities such as project view/manage, task create/update/reassign/move/complete, governance manage, document view/contribute/approve/manage, export, and AI use. Inputs should include current global role/permissions, project scope, membership/project role, assignment, audience type, and object state.

Return a typed manifest with project read projections. Enforce capabilities again in command handlers. **Recommendation: STRENGTHEN SECURITY, P0-P1.**

### REC-02 - Canonical Task command boundary

Move create, update, assign/reassign, move, complete, delete, hierarchy validation, membership validation, and audit/event behavior into one Task application service. Planning, Project, Delivery, My Work, Today, and future AI routes call it through adapters. **Recommendation: CONSOLIDATE, P1.**

### REC-03 - Audience-specific read projections

Define internal and external project/document/export projections, plus scoped assignable-user results. Reuse the same projection rules for UI, export, portfolio, and AI context. **Recommendation: REDESIGN, P0-P1.**

### REC-04 - Product workspace convergence

Use target navigation; move My Work under Home; retain Today only as My Work and Delivery modes; move Daily Review to Delivery/Review; preserve redirects; expose global Resources and Intelligence from existing capabilities. **Recommendation: CONSOLIDATE, P1-P2.**

### REC-05 - Contextual quick-create

After command and capability consolidation, add a compact create control to Delivery, My Work, and Today. It should capture the minimum target fields, infer project/parent from context where safe, and invoke the canonical Task create command. Planning remains the full authoring surface. **Recommendation: REDESIGN, P2.**

### REC-06 - AI integration gate

Replace placeholder AI authorization with the canonical resolver and server-derived projections. Keep capabilities read-only until proposed actions, explicit approval, reauthorization, canonical command execution, and audit are implemented. **Recommendation: STRENGTHEN SECURITY / DEFER, P1-P2.**

### REC-07 - Preserve locked foundations

Keep the Task entity and kinds, explicit parent relationships, contextual read-only behavior, direct dependencies, project membership and roles, the existing scheduling foundation, NestJS/Next.js/TypeScript/PostgreSQL, Docker deployment, and the provider-agnostic AI platform. **Recommendation: KEEP, P4.**

## 22. Prioritized Implementation Roadmap

### P0 - Security and authority containment

1. Require explicit JWT configuration outside tests; separate token purpose and add session revocation/versioning.
2. Fail closed on missing actors and distinguish portfolio read visibility from project mutation scope.
3. Require actor scope on document reads and authorize both source and destination for cross-project moves.
4. Define and enforce Customer/Partner projections for project, RAID, documents, exports, execution history, members, and user lookup.
5. Add negative regression tests with each security change.

### P1 - Canonical boundaries and workspace ownership

1. Implement the backend capability resolver and typed frontend manifest.
2. Consolidate Task mutations behind one application service and convert competing paths to adapters.
3. Move Daily Review into Delivery and remove literal mutation capability flags.
4. Move My Tasks into Home/My Work and redirect global Today to the correct contextual view.
5. Bind AI context assembly to server-resolved project/object scope.

### P2 - Complete target product journeys

1. Add contextual quick-create to Delivery, My Work, and Today through the canonical Task command.
2. Add Waiting/Delegated after Product Owner semantics are fixed.
3. Consolidate hierarchy and roll-up helpers.
4. Expose Resources and unify Intelligence using existing backend services.
5. Resolve lag and Start-to-Finish support explicitly in the existing scheduler.

### P3 - Controlled cleanup

1. Split oversized frontend responsibilities along stabilized query/command/view boundaries.
2. Split the API client behind one secure session transport.
3. Retire legacy routes after redirect telemetry and migration windows.
4. Remove dormant ScheduleSnapshot and frontend AI policy code after confirming no consumers.
5. Normalize Task terminology and remove expired compatibility aliases.

### P4 - Retain and defer

1. Preserve core Task, hierarchy, milestone, dependency, membership, role, scheduler, and AI provider architecture.
2. Defer persisted Program and Organisation/multitenancy models.
3. Defer a persisted Portfolio until independent lifecycle requirements are approved.

## 23. Dependency / Sequencing Map

```text
JWT/session containment ------------------------------+
Portfolio/external/source-target authorization -------+--> Canonical capability resolver
Negative security tests ------------------------------+                |
                                                                         +--> Frontend capability manifest
                                                                         |        |
Canonical Task command inventory --> Task application service ----------+        +--> Target navigation/actions
                                      |                                  |        |
                                      +--> Route adapters                 |        +--> Delivery/Review convergence
                                      +--> Cross-workspace command tests  |        +--> Home/My Work convergence
                                      +--> Contextual quick-create <------+                 |
                                                                                           +--> Legacy redirects/deprecation

External projection definitions --> Project/document/export projections --> Portfolio and AI-safe context

Backend roll-up contract --> Shared fixtures --> Frontend preview alignment

Product definition for Waiting/Delegated --> Query/read-model decision --> Schema only if required

AI server scope --> Proposed-action contract --> User approval --> Canonical command execution
```

Security containment precedes broader product exposure. Capability resolution precedes navigation and control cleanup. Canonical Task commands precede adding quick-create or AI writes. External projection precedes expanding exports, Portfolio insights, or AI context for Customer/Partner actors.

## 24. Decisions Required From Product Owner

1. **External projection:** Which project fields, RAID items, tasks, updates, members, documents, approval states, and exports may Customer and Partner users see or change?
2. **Portfolio authority:** Can Portfolio Managers ever issue project mutations without membership, and if so, through which explicitly portfolio-scoped commands and approval rules?
3. **Waiting semantics:** Does Waiting mean blocked by an incomplete dependency, awaiting another assignee, a manually selected state, or a union with visible reasons?
4. **Delegated semantics:** Does Delegated mean last assigned by me, originally delegated by me, currently supervised by me, or a durable delegation relationship?
5. **Route migration:** How long must `/today`, `/tasks`, and `/daily-review` bookmarks remain supported after Home/My Work and Delivery/Review launch?
6. **Quick-create defaults:** Which fields are mandatory, which are inferred from workspace context, and when may a user create under a contextual parent they cannot edit?
7. **Planning entry:** Should global Planning open a portfolio planning view, a recent-project selector, or a project-scoped workspace directly?
8. **Reports and Intelligence:** Which existing executive, portfolio, project report, and AI experiences make up the first target Intelligence and Project Reports releases?
9. **External contribution:** May Customer/Partner users create tasks, comments, RAID items, or draft documents, and which internal approval gate publishes those changes?
10. **Scheduling types:** Are lag and Start-to-Finish dependencies supported commitments or compatibility fields to reject/deprecate?

## 25. Insufficient Evidence / Questions

- The reported Project Manager case cannot be proven from static code as stated. Capture actor ID, current JWT role claim, resolved global permissions, project governance fields, membership/project role, create endpoint, Delivery endpoint, and HTTP responses in one reproducible fixture.
- No production environment configuration was available to determine whether `JWT_SECRET` is injected outside `docker-compose.yml`. The repository still permits and deploys the known fallback, so the finding stands.
- Runtime route analytics were not available to quantify usage of Today, My Tasks, Daily Review, old project routes, or AI Playground. Use analytics only to plan redirects, not to retain competing target concepts indefinitely.
- No durable business definition was found for Waiting or Delegated personal-work views.
- No approved Customer/Partner field-level projection specification was found.
- It is unclear whether `lagDays` and Start-to-Finish dependencies are intentionally deferred, legacy, or expected to schedule.
- Frontend `lib/ai` runtime consumers were not found through static imports outside tests; confirm build-time/dynamic consumers before deletion.
- The need for a persisted Portfolio identity remains unproven. Current aggregate behavior is enough for the locked target unless ownership/lifecycle journeys are approved.
- Test execution, database migration validation, browser workflow testing, and live API authorization probes were outside this read-only audit. Findings are based on repository evidence, not runtime certification.

## 26. Final Conformance Scorecard

| Dimension | Score | Overall classification | Principal strengths | Principal gaps |
|---|---:|---|---|---|
| PRODUCT CONFORMANCE | **57 / 100** | PARTIALLY CONFORMING | Project tabs, canonical project/task concepts, useful Planning/My Tasks/Portfolio capabilities | Competing Today/My Tasks/Review surfaces, incomplete target navigation, no contextual quick-create |
| ARCHITECTURE CONFORMANCE | **53 / 100** | PARTIALLY CONFORMING | Clean core entities, modular NestJS backend, real scheduler, provider-agnostic AI | Three Task command owners, duplicated projections/hierarchy/roll-ups, no canonical capability service |
| IAM / SECURITY CONFORMANCE | **23 / 100** | NON-CONFORMING | Seven roles, project memberships/roles, permission and policy foundations | JWT/session design, portfolio mutation scope, fail-open helpers, external projections, cross-project moves |
| UX CONFORMANCE | **47 / 100** | PARTIALLY CONFORMING | Strong Planning and Delivery components, contextual read-only task rows, route redirects | Product-area duplication, locally inferred controls, missing Resources/Intelligence/Reports convergence |
| AI CONFORMANCE | **61 / 100** | PARTIALLY CONFORMING | Horizontal registries/pipeline/providers, canonical read concepts, no unsafe write path enabled | Caller-asserted context/permissions, placeholder authorization, no approval/command integration |

**Overall assessment:** PARTIALLY CONFORMING, with P0 security containment required before broadening external, portfolio, export, or AI capabilities.

**Major conforming elements to retain:** one Task identity; Summary/Standard/Milestone kinds; explicit hierarchy; contextual visibility without edit inheritance; direct dependency semantics; project membership and project roles; current scheduling foundation; aggregate Portfolio capability; provider-agnostic AI architecture; mandated TypeScript/NestJS/Next.js/PostgreSQL/Docker stack.

**Major conflicts to resolve:** global navigation and project Review placement; three Task command paths; three Today/My Work representations; frontend/backend authorization drift; portfolio read-to-mutation escalation; missing external projections; competing hierarchy/roll-up/AI policy implementations.

**Do not change:** do not split Task by workspace, create a separate Milestone identity, propagate parent dependencies to children, replace the scheduling engine, collapse project roles into global roles, add Program/Organisation schema, or introduce a second AI/domain command path.

**Implementation order:** authentication and scoped authorization -> external/source-target projections -> capability resolver/manifest -> canonical Task commands -> Delivery/Review and Home/My Work convergence -> contextual quick-create -> simplification and deprecation.

**Product Owner decisions required:** external audience and contribution rules, portfolio mutation scope, Waiting/Delegated semantics, route migration window, quick-create defaults, Planning entry behavior, Reports/Intelligence composition, and dependency-type support.
