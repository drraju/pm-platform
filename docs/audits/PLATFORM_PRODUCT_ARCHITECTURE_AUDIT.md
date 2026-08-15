# PM Platform Product, UX & Architecture Audit

**Audit date:** 2026-08-14
**Mode:** Read-only, evidence-first architecture and product audit
**Repository snapshot:** `352ac1e` plus pre-existing uncommitted worktree changes
**Implementation status:** No recommendation in this report has been implemented

## 1. Executive Summary

### Verdict

The platform has a coherent core domain surrounded by an increasingly incoherent product and application shell.

The strongest part is the task and scheduling foundation. There is one persisted `Task` model, explicit Summary/Standard/Milestone semantics, one persisted `TaskDependency` identity, cycle validation, and a graph model that correctly treats a dependency on a standard parent Task as a direct edge on that Task. The repository explicitly tests that `A -> B` remains `A -> B` when `B` has children; it does not invent `A -> B1` or `A -> B2`. That behavior should be kept.

The weakest parts are authentication/session security, project-scoped data enforcement, workspace boundaries, and duplicated task authority. The repository-provided Docker deployment does not provide `JWT_SECRET`, while both signing and validation fall back to a public development secret. Refresh tokens have the same claims and verifier as access tokens, current database roles are not rebound during JWT validation, project document reads omit project authorization, and task/document moves authorize only the source project. These issues require review before further feature work.

Incremental UX development has also produced five partially overlapping task surfaces: Planning, Today, My Tasks, Delivery, and Daily Review. The minimum coherent model is three responsibilities, not five products:

1. **Planning** authors structure, schedule, dependencies, ownership, and baselines.
2. **Delivery** executes and reviews one project; Daily Review becomes a Delivery review mode.
3. **Home / My Work** executes personal work across projects; Today becomes a saved time filter, not a separate workspace.

This does not require multiple task models. Contextual task creation may remain available in more than one UI, but every create/update command should resolve through one backend task application boundary and one action-specific authorization policy.

### Finding Counts

| Severity | Count |
| --- | ---: |
| Critical | 1 |
| High | 5 |
| Medium | 12 |
| Low | 7 |
| **Total** | **25** |

### Recommendation Counts

| Priority | Count |
| --- | ---: |
| P0 - Security / correctness | 5 |
| P1 - Product model consolidation | 5 |
| P2 - Architectural consolidation | 6 |
| P3 - UX simplification | 4 |
| P4 - Technical cleanup | 5 |
| **Total** | **25** |

### Keep These Decisions

- Keep one canonical persisted `Task` entity.
- Keep Sub-task as a parent relationship, not a second entity.
- Keep Summary as a non-executable roll-up item and Milestone as a zero-duration scheduling event.clear

- Keep dependency edges attached to their selected endpoints; do not propagate parent dependencies to children.
- Keep backend authorization authoritative and make frontend capabilities a projection of it.
- Keep Planning distinct from execution; simplify the surfaces around it.

## 2. Audit Scope and Method

The audit traced frontend routes and workspaces through API clients, NestJS controllers, DTOs, services, TypeORM entities, SQL migrations, authorization policy, tests, ADRs, product specifications, and git history. Major flows reviewed were Project, Task, Planning, Dependency, Document, Team/User, Export, RAID, personal work, and AI capability execution.

Evidence was gathered with read-only repository and git commands. Existing tests were inspected but not executed because no implementation behavior was changed and static evidence was sufficient for the conclusions. No formatter, linter, generator, migration, or automated transformation was run.

The worktree was already dirty before this audit. Current-worktree behavior was reviewed where relevant, especially the dependency eligibility changes, but it was not represented as committed history.

### Evidence Limits

- No production environment, deployed container, secrets manager, ingress, or network policy was inspected.
- No live database was queried, so effective role-permission rows and migration state remain unverified.
- No analytics, support data, user interviews, or task-completion telemetry were available to quantify workspace usage.
- No external API consumer inventory was available to determine exact backward-compatibility obligations.
- The repository does not establish whether Program and persisted Portfolio are funded near-term requirements or only target architecture.
- Runtime visual, accessibility, and mobile testing was outside this static audit.

## 3. Current Product Model

| Concept | Persisted? | Actual purpose and distinction | Classification |
| --- | --- | --- | --- |
| Platform | No single entity | Application/system boundary | KEEP |
| Workspace | No | UI composition and navigation context; implemented inconsistently | REDEFINE |
| Organization | Calendar uses fixed `default`; AI carries optional IDs | Target context without a canonical identity or data boundary | UNCERTAIN |
| Portfolio | No Portfolio entity | Aggregate of visible Projects plus planning portfolio dependencies | REDEFINE |
| Program | No | Documented target concept only | UNCERTAIN |
| Project | Yes | Primary delivery, governance, membership, and visibility boundary | KEEP |
| Global role | Yes | Platform persona and permission bundle | KEEP, narrow meaning |
| Project role | Yes, on `ProjectMember` | Project-specific authority: owner/manager/contributor/viewer | KEEP |
| User | Yes | Authenticated identity with one global role | KEEP |
| Team | Yes, as project membership | Project scope and project role assignment | KEEP |
| Task | Yes | Canonical unit of planned/executed work | KEEP |
| Sub-task | Relationship only | Standard Task whose parent is a Standard Task; one execution depth | KEEP as relationship |
| Summary | Task kind | Non-executable hierarchy and roll-up node | KEEP |
| Milestone | Task kind | Zero-duration scheduling checkpoint | KEEP |
| Task dependency | Yes | Scheduling edge between executable endpoints | KEEP |
| RAID dependency | Yes, separate entity | Governance dependency record, not a scheduling edge | KEEP; clarify name |
| Portfolio dependency | Yes | Cross-project planning relationship | KEEP if Portfolio target is approved |
| Document | Yes | Project-scoped external document link and approval metadata | KEEP |
| RAID | Four persisted subtypes | Governance register for risks, assumptions, issues, dependencies | KEEP |
| Execution update | Yes | Auditable status/progress/next-step update attached to a Task | KEEP |
| Planning | View plus snapshots | Plan authoring, WBS, schedule, dependencies, critical path, resources | KEEP |
| Delivery | View | Project execution, board/list/today/timeline/history | KEEP and REDEFINE |
| Today | View | One selected project's time-focused execution queue | CONSOLIDATE into Home/My Work and Delivery filters |
| My Tasks / My Work | View | Assigned work across projects | CONSOLIDATE into Home/My Work |
| Daily Review | View | Project execution review, AI summary, completion workflow | CONSOLIDATE into Delivery |

The core conceptual problem is not too many entities. It is that views have acquired workspace-level identity and partially independent rules for the same Task.

## 4. Current Workspace Model

The global navigation in `frontend/components/layout/app-navigation.ts` exposes Home, Portfolio, Projects, Today, Daily Review, an unavailable Planning item, an unavailable Resources item, and a route labelled Dashboard that internally represents Intelligence. It separately exposes My Tasks, Risks, and Issues as work queues, and AI Playground, Enterprise Calendars, and Users as administration links.

The accepted workspace ADR defines seven primary workspaces: Home, Portfolio, Projects, Planning, Resources, Intelligence, and Administration. Current navigation therefore mixes target workspaces, capability queues, unavailable placeholders, and administrative modules at the same level.

| Surface | Primary user/job | Main actions | Unique value | Top-level? |
| --- | --- | --- | --- | --- |
| Planning | PM/planner authors the plan | Create/edit hierarchy, owners, dates, dependencies, baseline and schedule | Dense WBS/scheduling authoring | Yes, once it has a real directory/route; retain project deep links |
| Today | PM/team member acts on near-term project work | Execution updates and history for one selected project | Time filter and spreadsheet-like interaction | No; filter/mode |
| My Tasks | Individual acts on assigned work | Cross-project execution updates and filtering | Personal cross-project scope | Home capability, not separate queue |
| Delivery | Project team executes one project | List, board, today, timeline, history, execution updates | Canonical project execution context | Project capability |
| Daily Review | PM/team lead reviews project execution | Filters, updates, AI review, completion summary | Bounded review workflow | Delivery mode/action, not top-level |

## 5. Workspace Overlap Matrix

Legend: `Y` full capability, `C` conditional or limited, `D` display/report only, `-` absent.

| Capability | Planning | Today | My Tasks | Delivery | Daily Review |
| --- | :---: | :---: | :---: | :---: | :---: |
| Create Task | Y | - | - | - | - |
| Create Sub-task | Y | - | - | - | - |
| Edit Task | Y | C execution | C assigned execution | C execution | C execution; UI overstates authority |
| Assign / reassign | Y | C | C | C | C; UI unconditional after page gate |
| Status | Y | Y | Y | Y | Y |
| Progress | Y | Y | Y | Y | Y |
| Planned/target dates | Y planned | C target/due | C target/due | C target/due | C target/due |
| Dependencies | Y | - | - | - | - |
| WBS/hierarchy | Y author | D context | D context | D context | D context |
| Review/history | D schedule | C history | C latest update | Y history/today | Y AI/completion |
| Reporting | Y critical path/resources | C queue counts | C personal counts | C timeline/history | Y review summary |

Evidence: Planning handlers in `frontend/app/(app)/projects/[id]/planning/page.tsx`; Today composition in `frontend/app/(app)/today/page.tsx`; My Tasks in `frontend/app/(app)/tasks/page.tsx`; Delivery modes in `frontend/app/(app)/projects/[id]/delivery/page.tsx`; Daily Review in `frontend/app/(app)/daily-review/page.tsx`.

## 6. Task Lifecycle Map

| Stage | Current owners/surfaces | Assessment |
| --- | --- | --- |
| Create | `POST /tasks`, `POST /projects/:projectId/tasks`, `POST /planning/projects/:projectId/tasks`; Planning UI | Three command paths for one entity |
| Assign | Planning create/edit; task update; execution update in several surfaces | Same field, different UI gates and payloads |
| Plan | Planning workspace and Task planning fields | Correct primary ownership |
| Schedule | Planning snapshots, graph builder, schedule engine | Coherent, but lag/SF limitations are unsafe when stored |
| Execute | Delivery, Today, My Tasks, Daily Review | Four overlapping projections of execution |
| Update | Generic task update, project task update, execution update | Full mutation and execution mutation boundaries are not consistently named or owned |
| Review | Delivery history and Daily Review completion/AI | Duplicated project execution context |
| Complete | Task transition helper plus execution updates | Shared backend transition exists; multiple frontend entry points |
| Report | Planning, Delivery history/timeline, dashboards, export | Derived from canonical data; broadly coherent |

There is one underlying Task model, not multiple competing persisted models. The competition is in command ownership, DTOs, frontend rules, and workspace framing.

## 7. Task Hierarchy Model

### Canonical Semantics

- `Task.taskKind` is `standard`, `summary`, or `milestone`.
- `parentTaskId` is the hierarchy link; it is stored as an ID rather than a TypeORM relation.
- Summary is non-executable: assignee, status, progress, dates, and effort are roll-up controlled.
- Milestone is executable scheduling identity with zero duration and aligned start/end dates.
- A Standard Task may be a parent and remain executable.
- A Standard child of a Standard parent is a Sub-task; a Sub-task cannot contain another Standard child.
- WBS numbers are derived from parent/sibling order and sequence numbers.
- Ownership is `assigneeId`; execution visibility can expand from assignment.

### Duplication

`frontend/lib/tasks/task-hierarchy.ts` is the newest shared hierarchy builder, but it coexists with local hierarchy construction in `ProjectWorkspaceTasks`, `PlanningWorkspace`, and `TodayWorkspace`. `include-task-ancestors.ts` and `personal-work-context.ts` add personal projections. Backend hierarchy validation is repeated in `TasksService`, `ProjectsService`, and parts of `PlanningService`.

The target is not one universal UI tree component. It is one canonical hierarchy contract and shared selectors for parent/ancestor/descendant/WBS semantics, with workspace-specific presentation layered on top.

## 8. Dependency/Scheduling Findings

### Confirmed Correct Behavior

`SchedulingFoundationService.validateTaskDependency` permits FS, SS, and FF edges, rejects self-links, Summary endpoints, direct parent-child edges, duplicates, and cycles. `PlanningGraphBuilderService.buildEdges` creates one edge between the selected predecessor and successor.

For `A -> B`, where Standard Task `B` has `B1` and `B2`, the graph contains only `A -> B`. `B1` and `B2` remain hierarchy children with no inherited incoming dependency. This is explicitly covered by `PlanningGraphBuilderService` test `keeps dependencies on standard parent tasks as direct task edges`. The current Planning and legacy dependency UIs exclude Summary endpoints but allow Standard parents. **Keep this behavior.**

### Finding SCHED-01 - Stored dependency semantics exceed schedule calculations [MEDIUM]

`TaskDependency.lagDays` is persisted and the legacy dependency panel can edit it, but `PlanningGraphEdge` has no lag field and schedule analysis does not apply lag. Stored Start-to-Finish edges are silently skipped by `PlanningGraphBuilderService.buildEdges`, while new SF mutations are rejected.

**Impact:** A user/API can observe a persisted dependency whose scheduling effect is zero or silently absent.
**Future recommendation:** Decide whether lag and SF are unsupported or supported. Until support exists, reject non-zero lag and surface legacy SF as a validation issue rather than silently ignoring it. Do not change direct parent-Task semantics.
**Affected:** E14, E15, E16, E17.

## 9. IAM/Authorization Findings

### Actual Capability Chain

`JWT roleId -> role_permissions -> global permission -> project governor/membership/assignment -> operation-specific controller/service check` is the intended backend chain. Frontend capability logic approximates this from `/auth/me`, stored role/permission snapshots, project governance IDs, membership role, and task assignee.

### Actual Role Matrix

The matrix below reflects migration seeds plus policy code; effective production rows require database verification because migration 029 unions permissions from legacy roles.

| Role | View | Edit | Execute | Administration |
| --- | --- | --- | --- | --- |
| Platform Admin | Platform-wide | Platform-wide through permissions | All | Users, roles, permissions |
| Portfolio Manager | All projects/portfolio/executive | Broad project/task/RAID where seeded | All visible work | No user admin by canonical intent |
| Project Manager | Owned, governed, member, assigned | Project if governor or owner/manager member | Project work | Team/project lifecycle, not platform IAM |
| Team Member | Member projects; assigned task can expand visibility | Own RAID contribution and limited task fields | Assigned Task | None |
| Executive | All projects/portfolio | None by seed | None | None |
| Customer | Assigned/member projects | None by seed | None | None |
| Partner | Assigned/member/assigned-task projects | Own task execution/comment/reassign | Assigned Task | None |

### IAM-01 - Read authorization fails open when actor is omitted [MEDIUM]

`AuthorizationPolicyService.canViewProject` and `ProjectVisibilityService.getVisibleProjectIds` return broad access when no actor is supplied, while edit methods fail closed. This compatibility posture directly enabled the document read gap.

**Impact:** Any controller or internal caller that forgets to thread the actor can turn a scoped read into an unscoped read.
**Future recommendation:** Make production read services require an actor or an explicit trusted-system principal; eliminate optional-actor ambiguity.
**Affected:** E07, E09.

### IAM-02 - List visibility and direct visibility disagree [MEDIUM]

Direct policy recognizes `ownerId`, `businessOwnerId`, `deliveryLeadId`, and `executiveSponsorId`. `ProjectVisibilityService.getVisibleProjectIds` lists only owner, membership, and assigned-task projects for non-global actors.

**Impact:** A formal governor can direct-access/manage a project that is absent from project lists and dashboards.
**Future recommendation:** Use the same project-scope resolver for list and object access.
**Affected:** E09, E10.

### IAM-03 - Frontend action visibility disagrees with backend authority [MEDIUM]

Planning wires all mutation handlers without a capability contract. Govern passes all CRUD flags as true. Daily Review passes `canEditTasks` and `canReassignTasks` as literal true after a broader leadership page gate. Project tab visibility is calculated without project context. The backend generally rejects unauthorized mutations, but the UI shows actions that will fail and hides Govern from some users who can contribute RAID.

**Impact:** Repeated 403s, hidden legitimate work, and pressure to weaken backend controls.
**Future recommendation:** Return action-specific capabilities for the selected project and object; consume the same contract in tabs, pages, and components.
**Affected:** E11, E12, E13.

### IAM-04 - Permission helpers collapse distinct actions into generic management [MEDIUM]

`resolveProjectUiCapabilities` treats any of task update/comment/reassign as task update capability, and backend `canManageTask` similarly accepts any task permission before applying project authority. Legacy role names remain in frontend leadership sets after role consolidation.

**Impact:** Custom permission bundles can produce incorrect UI and overly broad internal notions of management.
**Future recommendation:** Model `task.view`, `task.edit_fields`, `task.execute`, `task.assign`, `task.delete`, and project administration separately. Remove role-name inference from action authorization.
**Affected:** E08, E12, E26.

### IAM-05 - AI capability scope is asserted by the controller, not resolved from policy [MEDIUM]

The AI capability endpoint requires `project.read`, then supplies a hard-coded permission list and client-provided `projectIds`/context data to `CapabilityExecutionService`. It does not resolve each project through `AuthorizationPolicyService`.

**Impact:** Current source data is mostly client-supplied, but this boundary becomes an object-scope bypass as soon as capabilities assemble server data or tools.
**Future recommendation:** Build AI execution scope from the authenticated actor and authorized project IDs server-side; treat requested scope as untrusted.
**Affected:** E25.

## 10. Security Findings

### SEC-01 - Predictable signing secret in the repository Docker deployment [CRITICAL]

Both `AuthModule` and `JwtStrategy` fall back to `development-jwt-secret`. `backend/Dockerfile` sets production mode, while `docker-compose.yml` does not pass `JWT_SECRET` to the backend.

**Impact:** Under the repository-provided Docker deployment, an attacker can sign accepted tokens. With a known user ID and a role ID available to the attacker, forged actor identity can combine with target project membership/governance. `/users/assignable` makes active user IDs and emails broadly enumerable. This can bypass authentication and cause horizontal or elevated project actions.
**Future recommendation:** Fail startup without a strong secret/key in every non-test environment, rotate deployed keys, and prefer asymmetric signing with issuer/audience/key ID validation.
**Affected:** E01, E02, E03, E06.

### SEC-02 - Refresh tokens are valid seven-day bearer access tokens [HIGH]

`AuthService.issueSession` signs access and refresh tokens with the same service, secret, and claims. The only difference is expiry. `JwtStrategy` validates no token type, issuer, audience, or session record. The frontend stores both in local storage.

**Impact:** A refresh token can be presented directly to protected APIs, making the effective bearer lifetime seven days. Local-storage compromise exposes both token classes. Logout is client-side deletion only.
**Future recommendation:** Add typed, audience-bound refresh tokens, rotation/reuse detection, server-side revocation/session version, a refresh endpoint, and a browser storage design appropriate to the threat model.
**Affected:** E04, E05.

### SEC-03 - Role changes do not invalidate or rebind existing JWTs [HIGH]

`JwtStrategy.validate` loads user status and `passwordChangedAt`, then trusts `payload.roleId`. `UsersService.findTokenValidationUser` does not select current `roleId`; `UsersService.update` records role changes but does not update a session version or invalidation timestamp.

**Impact:** A demoted user's access token retains old permissions until expiry, and the refresh token remains directly usable for seven days. `/auth/me` can show the new role while backend guards authorize the stale role claim.
**Future recommendation:** Resolve the current role during validation or validate a role/session version; invalidate all sessions on role/status/security changes.
**Affected:** E03, E06.

### SEC-04 - Project document reads omit project-scope authorization [HIGH]

`DocumentsController.summary` and `findProjectDocuments` do not pass the actor. `DocumentsService.findProjectDocuments` checks only that the project exists and returns all matching records, including URLs and approval states. Mutation paths do call authorization.

**Impact:** Any authenticated user with global `project.read` can query a known/guessed project ID and retrieve document metadata and external links outside their assigned scope.
**Future recommendation:** Require actor-aware project visibility for list, summary, and single-document reads; add negative cross-project tests and external audience projections.
**Affected:** E07.

### SEC-05 - Cross-project moves authorize only the source project [HIGH]

`UpdateTaskDto` and `UpdateProjectDocumentDto` inherit `projectId`. `TasksService.update` authorizes the existing task, then validates fields/membership against the destination without checking destination authority. `DocumentsService.update` checks management on the source document project and only confirms that the destination exists.

**Impact:** A source-project manager can move a Task or document link into a project they are not authorized to manage, contaminating another project's data and potentially exposing it to that audience.
**Future recommendation:** Remove project reassignment from ordinary update DTOs or implement an explicit move command requiring source and destination authority in one transaction.
**Affected:** E18, E19.

### SEC-06 - External roles receive internal project projections [HIGH]

Customer and Partner are scoped by membership/assignment, but `ProjectsService.findOne` returns the same aggregate used internally: all Tasks and latest execution updates, RAID items and owners, members and their global role names, and governance users. Document reads return drafts as well as approved links. `/users/assignable` returns every active user's ID, email, and global role to any `project.read` user.

**Impact:** This exceeds the identity architecture's Customer intent of project progress and approved deliverables and Partner intent of assigned collaboration. It creates confidentiality and personal-data exposure across trust boundaries.
**Future recommendation:** Define audience-specific project/document/task projections and project-scoped assignee directories. Do not use global role alone as the external content policy.
**Affected:** E06, E20, E27.

### SEC-07 - Docker exposes default MinIO administration credentials [LOW]

`docker-compose.yml` uses `minioadmin/minioadmin`, publishes API and console ports, and tracks `minio/minio:latest`. Current document storage is external links, so repository evidence does not show sensitive PM data in this bucket.

**Impact:** Deployment hardening and supply reproducibility risk; current data impact is unproven.
**Future recommendation:** Parameterize credentials, pin an image version, restrict published ports, and remove MinIO if no owned storage capability uses it.
**Affected:** E02.

## 11. API/Domain Responsibility Findings

### DOM-01 - Three task command APIs and services own the same rules [MEDIUM]

Task creation exists in `TasksService.create`, `ProjectsService.createProjectTask`, and `PlanningService.createPlanningTask`, with three overlapping DTOs. Projects and Tasks duplicate normalization, hierarchy, assignee-membership, and lifecycle validation; Planning directly saves Standard/Summary Tasks but delegates Milestones to the canonical Tasks service.

**Impact:** The same Task can acquire different defaults, validation, audit behavior, and response shape depending on route.
**Future recommendation:** One Task application service owns create/update/move/delete; project and planning controllers adapt transport/context only. Keep contextual endpoints only as aliases during migration.
**Affected:** E21, E22.

### DOM-02 - Roll-up business rules are duplicated across tiers [MEDIUM]

`backend/src/modules/tasks/planning-rollup.ts` and `frontend/features/projects/planning.ts` independently calculate task kind, summary dates, effort, and progress decoration.

**Impact:** A UI can display a different plan from the persisted/scheduled backend interpretation.
**Future recommendation:** Backend owns roll-up truth and returns explicit derived fields; frontend limits itself to presentation selectors.
**Affected:** E23.

### DOM-03 - Target Organization/Portfolio/Program concepts lack canonical identities [MEDIUM]

There is no Organization, Portfolio, or Program entity. Portfolio is an aggregate over Projects; Calendar accepts only a fixed `default` organization; AI requests carry optional tenant/organization IDs without a corresponding platform boundary.

**Impact:** The documented route/context model cannot be enforced, and cross-project relationships may be mistaken for a complete portfolio domain.
**Future recommendation:** Product ownership must decide whether this is a single-organization project platform or a portfolio/program platform. Add persisted identities only if approved business journeys require them.
**Affected:** E24, E28.

### DOM-04 - Task type compatibility is a second vocabulary [LOW]

DTOs and normalizers accept both `TaskKind` (`standard/summary/milestone`) and compatibility `TaskType` (`task/summary/milestone`), with additional compatibility fields such as `summaryCategory`.

**Impact:** More branches and naming ambiguity, but the mapping is centralized enough to contain current risk.
**Future recommendation:** Keep compatibility until consumers are inventoried; publish one canonical vocabulary and deprecate aliases with telemetry/versioning.
**Affected:** E29.

## 12. Frontend Architecture Findings

### FE-01 - Hierarchy semantics are reconstructed by multiple workspaces [MEDIUM]

`task-hierarchy.ts` provides a shared builder, but `ProjectWorkspaceTasks` still has local hierarchy/sort/parent logic, `PlanningWorkspace` has its own visible-row/descendant/WBS/move logic, and `TodayWorkspace` has local traversal around the shared builder.

**Impact:** Eligibility, ancestor display, collapse behavior, WBS, and parent options can drift by workspace. The recent dependency eligibility regression is an example of this class of problem.
**Future recommendation:** Define canonical hierarchy selectors and conformance tests; preserve specialized Planning row mechanics where they express authoring behavior.
**Affected:** E30, E31.

### ARCH-01 - Components concentrate product rules and rendering [LOW]

`PlanningWorkspace` is 5,386 lines, `ProjectWorkspaceTasks` 2,997, and `TodayWorkspace` 1,646. Size is not the finding by itself; these components combine hierarchy, permissions, selection, dialogs, command payloads, filtering, keyboard behavior, and presentation.

**Impact:** Changes to one product rule require broad regression testing and encourage local copies.
**Future recommendation:** After product boundaries are approved, separate selectors, command adapters, state machines, and view components along existing behavior boundaries.
**Affected:** E31.

### ARCH-02 - The API client is a cross-domain coupling point [LOW]

`frontend/lib/api/client.ts` is 1,724 lines and owns auth storage plus contracts/functions across projects, tasks, documents, planning, AI, exports, and other domains. Feature modules often re-export it.

**Impact:** Contract changes and auth behavior touch a broad module; domain ownership is obscured.
**Future recommendation:** Keep one transport primitive, then move typed domain clients to feature boundaries after API ownership is settled.
**Affected:** E05, E31.

## 13. UX Consistency Findings

### PROD-01 - Five surfaces implement three task jobs [MEDIUM]

Today and My Tasks both execute personal/near-term work; Delivery and Daily Review both review and update project execution; Planning is the only complete creation/structure surface. Shared Task identity is preserved, but action availability and framing differ.

**Impact:** Users must choose a surface before knowing which actions it supports, and teams maintain multiple interaction models for the same fields.
**Future recommendation:** Consolidate to Planning, Delivery (including Review), and Home/My Work (including Today filter). Allow contextual commands only through the canonical Task command boundary.
**Affected:** E11, E13, E32.

### UX-01 - Terminology exposes implementation history [LOW]

The same area is called Home/Dashboard, Intelligence/Dashboard, My Tasks/My Work/Assigned Work, Daily Review/Standup, and task owner/assignee. Global Risks and Issues coexist with the Govern/RAID framing.

**Impact:** Navigation and field meaning require translation, particularly for occasional and external users.
**Future recommendation:** Approve one product lexicon and apply it when routes/workspaces are consolidated; retain old terms only in redirects/migration messaging.
**Affected:** E11, E28, E32.

## 14. Legacy/Complexity Findings

### Candidate Register

| Candidate | Evidence | Classification | Future action |
| --- | --- | --- | --- |
| `frontend/lib/tasks/task-hierarchy.ts` | New shared hierarchy used by personal work | KEEP | Make it part of canonical selector package |
| Planning mode in `ProjectWorkspaceTasks` | Current Planning route uses `PlanningWorkspace`; planning mode remains heavily tested | VERIFY, then DEPRECATE | Confirm no runtime caller before removal |
| `ProjectWorkspaceSummary`, `ProjectWorkspaceBaselines`, `ProjectWorkspaceRegisterSection` | References are predominantly tests; current project routes use newer compositions | VERIFY | Use build/import/runtime evidence before classifying deletion |
| Project `tasks`, `execution`, `raid`, root `kanban`, `timeline` routes | Redirect to Delivery/Govern/new routes | KEEP temporarily, then DEPRECATE | Add route telemetry and sunset policy |
| Top-level `/raid` | Exists while navigation exposes Risks and Issues separately | REVIEW | Choose canonical Govern/RAID discovery model |
| `ScheduleSnapshot` entity | Not registered or migrated; repository review calls it dormant | DELETE after verification | Remove only in cleanup release |
| `TaskType` and compatibility fields | Accepted alongside `TaskKind` | DEPRECATE | Versioned contract migration |
| Daily Review top-level route | Still active after Delivery consolidation | CONSOLIDATE | Preserve URL redirect to Delivery Review |

### LEG-01 - Dormant schedule entity duplicates active naming [LOW]

`schedule-snapshot.entity.ts` declares `schedule_snapshots`, but it is not registered or migrated. Active scheduling uses `PlanningScheduleSnapshot` and `PlanningTaskSchedule`.

**Impact:** Misleading architecture discovery and accidental future registration risk.
**Future recommendation:** Verify no external metadata tooling imports it, then remove it in P4.
**Affected:** E33.

### LEG-02 - Redirected routes and superseded components lack a formal sunset [LOW]

Delivery modernization converted older project routes to redirects, but the repository retains older component modes and tests without a deprecation register or route telemetry.

**Impact:** Engineers cannot distinguish compatibility surface from active product surface.
**Future recommendation:** Maintain a deprecation inventory with owner, replacement, consumer evidence, and removal date.
**Affected:** E32, E34.

## 15. Documentation vs Code Findings

| Topic | Classification | Assessment |
| --- | --- | --- |
| Seven workspace hierarchy | DOCUMENTATION CORRECT / CODE DRIFT | Accepted UX ADR is clear; current nav adds Today/Daily Review and work queues, while Planning/Resources are unavailable placeholders |
| Project workspace as canonical context | DOCUMENTATION CORRECT / CODE DRIFT | Current project tabs are close, but capability/context loading is repeated and Planning/Govern actions are not permission-aware |
| Seven canonical roles | MOSTLY ALIGNED | Enum and migration align; frontend/ADR still contain legacy `PROGRAM_MANAGER`/`SUPER_ADMIN` references |
| Customer approved-deliverable scope | DOCUMENTATION CORRECT / CODE DRIFT | Code returns internal aggregate and all document states |
| Users cannot access unassigned projects | AMBIGUOUS | Executives/portfolio roles intentionally have global access; assignment can expand from task; document read accidentally bypasses both |
| Information Architecture Blueprint | AMBIGUOUS STATUS | It recommends approval and canonical organization routes, but current routes are explicitly labelled legacy and no organization domain exists |
| IAM hardening ADR | CODE AND DOC BOTH IDENTIFY GAPS | Proposed ADR documents missing refresh/revocation controls but includes stale role terminology |
| Parent Task dependency semantics | CODE CORRECT | Foundation, graph builder, frontend eligibility, and regression tests agree |
| Dormant `ScheduleSnapshot` | DOCUMENTATION CORRECT | Data review accurately identifies it as unregistered/unmigrated |

### DOC-01 - Authoritative documents have inconsistent status and vocabulary [MEDIUM]

The accepted workspace ADR, proposed/approval-recommending blueprint, authoritative identity matrix, proposed IAM ADR, and current navigation each use partially different route, role, and workspace vocabularies.

**Impact:** Teams can cite different documents as authority and implement incompatible interpretations.
**Future recommendation:** Establish an architecture index with status, supersedes/superseded-by, product owner, effective date, and code conformance checks.
**Affected:** E26, E28, E35.

## 16. Git History / Evolution Findings

History explains the accumulation without making it inevitable:

- `009de16` (2026-06-06) introduced the shell, Projects, and My Tasks.
- `687571e` (2026-06-29) established project workspace/execution management.
- Planning evolved rapidly from June 25 through July with scheduling, WBS, milestones, hierarchy, and snapshots.
- `a1b1b3d` (2026-07-15) introduced the accepted workspace-first ADR and navigation together. The commit added 11,739 lines and already combined seven workspace labels with separate work queues.
- `35514c5` (2026-08-01) added Daily Review and a separate project Execution page (1,462 insertions).
- `f839a74` (2026-08-08) added Delivery, Govern, and Today while redirecting old project Execution/Tasks/RAID routes (8,793 insertions, 2,722 deletions). This was partial consolidation plus a new top-level surface.
- `8719250` (2026-08-13) aligned some execution capabilities but did not cover Planning, Govern, or Daily Review hard-coded action gates.
- `352ac1e` (2026-08-13) introduced shared task hierarchy utilities for personal work, but older hierarchy implementations remained.

The recurring pattern is additive modernization: a new workspace solves a real workflow, then older routes are redirected while components, capability rules, and tests continue to represent both generations. Formal product deprecation and domain command consolidation did not accompany the UI consolidation.

## 17. Complexity Scorecard

Scores are 1 (poor/high complexity) to 5 (strong/simple).

| Area | Score | Evidence-based explanation |
| --- | :---: | --- |
| Product conceptual simplicity | 2 | Core entities are understandable; view concepts have become products |
| Navigation simplicity | 2 | Target workspaces, queues, modules, and unavailable placeholders are mixed |
| Task model simplicity | 4 | One Task entity with explicit kinds; compatibility vocabulary is contained debt |
| Workspace separation | 2 | Planning is distinct; execution/personal/review surfaces overlap materially |
| Permission consistency | 2 | Sound global/project/assignment ingredients, inconsistent action composition |
| Backend authorization integrity | 2 | Strong centralized policy in many paths, but critical session and scoped-read/move gaps |
| Frontend/backend authorization alignment | 2 | Shared helper exists, yet key pages bypass or overgeneralize it |
| Domain/API clarity | 2 | One entity but three task command owners and overlapping DTOs |
| Frontend reuse | 2 | Shared foundations exist alongside multiple hierarchy/task interaction engines |
| UX consistency | 3 | Common visual foundation and shared entities; terminology/actions vary by workspace |
| Documentation alignment | 2 | Rich architecture record, but statuses and code conformance have drifted |
| Legacy complexity | 2 | Redirects contain some legacy, but dormant/superseded modes lack sunset evidence |
| Maintainability | 2 | Large responsibility clusters and duplicated rules raise change blast radius |

## 18. Evidence Register

| ID | Exact repository evidence | Current behavior and significance |
| --- | --- | --- |
| E01 | `backend/src/modules/auth/auth.module.ts` - `JwtModule.register`; `backend/src/modules/auth/strategies/jwt.strategy.ts` - constructor | Both use `JWT_SECRET ?? 'development-jwt-secret'` |
| E02 | `docker-compose.yml` - `backend`, `minio`; `backend/Dockerfile` - runner | Production image; no JWT secret; default exposed MinIO credentials |
| E03 | `backend/src/modules/auth/strategies/jwt.strategy.ts` - `validate` | Returns payload role ID after checking only user status/password change |
| E04 | `backend/src/modules/auth/auth.service.ts` - `issueSession`; `backend/src/modules/auth/auth.controller.ts` | Same payload/verifier for access and refresh; no refresh endpoint |
| E05 | `frontend/lib/api/client.ts` - `storeSession`, `clearSession`, `apiRequest` | Both tokens and permission snapshots are in local storage; logout is local |
| E06 | `backend/src/modules/users/users.service.ts` - `findTokenValidationUser`, `update`, `findAssignableUsers`; controller `findAssignable` | Role not loaded for token validation; role change does not revoke; global active-user directory |
| E07 | `backend/src/modules/documents/documents.controller.ts` - `summary`, `findProjectDocuments`; service same methods | Actor omitted; read checks existence only |
| E08 | `backend/src/common/authz/authorization-policy.service.ts` - `canManageTask`, `canManageRaid` | Any permission in an operation family is collapsed before project authority |
| E09 | `backend/src/common/authz/authorization-policy.service.ts` - `canViewProject`; `project-visibility.service.ts` - `getVisibleProjectIds` | Optional actor read fails open; list scope differs from direct scope |
| E10 | `backend/src/common/authz/authorization-policy.service.ts` - `isProjectGovernor` | Four governance fields grant direct project scope |
| E11 | `frontend/components/layout/app-navigation.ts`; `frontend/components/project/project-tabs.tsx` | Mixed nav taxonomy; project tabs calculate capabilities without project context |
| E12 | `frontend/features/auth/capabilities.ts` - `resolveProjectUiCapabilities` | Role/permission/project/assignment logic is combined; legacy role names remain |
| E13 | Planning, Govern, Daily Review page components | Mutation handlers without capabilities; all-true RAID flags; literal task edit/reassign flags |
| E14 | `backend/src/common/scheduling/scheduling-foundation.service.ts` - `validateTaskDependency` | Endpoint, parent-child, duplicate, and cycle rules |
| E15 | `backend/src/modules/planning/planning-graph-builder.service.ts` - `buildEdges` | Direct edges; Summary rejection; SF silently skipped; no lag |
| E16 | `backend/src/modules/planning/tests/planning-graph-builder.service.spec.ts` | Explicit direct-edge standard-parent regression test |
| E17 | `backend/src/modules/tasks/entities/task-dependency.entity.ts`; `frontend/components/projects/project-task-dependency-panel.tsx` | Lag persisted and editable |
| E18 | `backend/src/modules/tasks/dto/update-task.dto.ts`; `TasksService.update` | `projectId` is mutable; destination authorization absent |
| E19 | `backend/src/modules/documents/dto/update-project-document.dto.ts`; `DocumentsService.update` | Document project is mutable; destination existence only |
| E20 | `backend/src/modules/projects/projects.service.ts` - `findOne` | Full internal aggregate returned to every visible actor |
| E21 | Task, Project, and Planning controllers plus create DTOs | Three creation routes/contracts for Task |
| E22 | `TasksService.create`; `ProjectsService.createProjectTask`; `PlanningService.createPlanningTask` | Duplicated rules; partial delegation only for Milestones |
| E23 | `backend/src/modules/tasks/planning-rollup.ts`; `frontend/features/projects/planning.ts` | Parallel roll-up/decoration rules |
| E24 | Backend entity inventory; `portfolio.service.ts`; Calendar organization resolver | No Organization/Portfolio/Program identity; Portfolio is aggregate; org is fixed default |
| E25 | `backend/src/modules/ai-playground/ai-playground.controller.ts` - `executeCapability`; `CapabilityExecutionService.execute` | Controller asserts permission and passes requested project scope |
| E26 | `backend/src/database/migrations/003_v1_0_5_1_authorization_alignment.sql`, `029_stab_rbac_001_role_consolidation.sql`; `UserRole` enum | Permission seed and seven-role consolidation, including legacy permission union |
| E27 | `docs/architecture/03-platform/IDENTITY_ARCHITECTURE.md` | Authoritative role/audience intent, including approved Customer deliverables |
| E28 | Workspace ADR and Information Architecture Blueprint | Accepted seven-workspace model and proposed canonical organization routes |
| E29 | `CreateTaskDto`, `TaskKind`, `TaskType`, `SchedulingFoundationService.mapTaskKind` | Dual compatibility vocabulary |
| E30 | `frontend/lib/tasks/task-hierarchy.ts`, `include-task-ancestors.ts`, `personal-work-context.ts` | New shared personal-work hierarchy selectors |
| E31 | `PlanningWorkspace`, `ProjectWorkspaceTasks`, `TodayWorkspace`, `frontend/lib/api/client.ts` | Multiple local rule engines and responsibility concentration |
| E32 | Current route inventory and five workspace pages | Overlapping execution/review/personal surfaces |
| E33 | `backend/src/modules/planning/entities/schedule-snapshot.entity.ts`; `docs/reviews/STAB-DATA-004-project-purge-hardening.md` | Dormant entity explicitly documented |
| E34 | Git commits `35514c5`, `f839a74`, `8719250`, `352ac1e`, `a1b1b3d` | Incremental workspace and helper evolution |
| E35 | `docs/architecture/decisions/ADR-016-iam-rbac-hardening.md` | Proposed session hardening plus stale role references |

## 19. Target Product Model

### Core Concepts

1. **Project** is the delivery, governance, membership, and external-sharing boundary.
2. **Task** is the single work identity from plan through completion.
3. **Task hierarchy** has Summary, Standard Task, Sub-task relationship, and Milestone.
4. **Task dependency** is a direct scheduling edge; RAID dependency is explicitly governance, not scheduling.
5. **Execution Update** is the auditable progress/review event, not a second Task state model.
6. **Portfolio/Program/Organization** become persisted only after product approval of journeys and scope.

### Product Responsibilities

- Planning owns plan authoring and schedule analysis.
- Projects owns project context and composes delivery/governance/team/documents/reports.
- Home owns personal orchestration, not duplicate task truth.
- Intelligence owns analysis, not source data.
- Administration owns identity, policy, integration, and configuration.

## 20. Target Workspace Model

### Global Navigation

Use the accepted seven-workspace taxonomy as the long-term model:

1. Home
2. Portfolio
3. Projects
4. Planning
5. Resources
6. Intelligence
7. Administration

Only show a workspace as an active destination when it has a real route and job. Contextual project Planning links may deep-link into the Planning workspace. Risks, Issues, My Tasks, Today, Documents, Calendars, AI, and Users are capabilities or queues inside an owning workspace, not peer workspaces.

### Project Capabilities

- Overview
- Delivery: List, Board, Today filter, Timeline, History, Review
- Govern: RAID and decisions
- Team
- Documents
- Reports
- Planning transition/deep link

### Consolidation of the Five Task Surfaces

`Planning + Today + My Tasks + Delivery + Daily Review` becomes:

- **Planning**
- **Projects > Delivery** (including Review and Today filter)
- **Home > My Work** (including Today/Overdue/Upcoming saved filters)

## 21. Target Capability Model

The backend should return action-specific capability decisions for a selected context. Recommended vocabulary:

| Capability class | Examples |
| --- | --- |
| View | `project.view`, `task.view`, `document.view_approved`, `document.view_internal` |
| Edit | `project.edit_metadata`, `task.edit_plan`, `task.edit_execution`, `raid.edit_own` |
| Execute | `task.record_update`, `task.complete`, `review.run`, `review.complete` |
| Assign | `task.assign`, `task.reassign`, `document.assign_owner` |
| Administer | `project.manage_team`, `project.archive`, `iam.manage_users`, `iam.manage_roles` |

Capability resolution inputs are current server-side global permissions, project scope/role, object ownership/assignment, lifecycle state, and audience policy. Frontend role names must not independently grant actions.

## 22. Target Role Model

Keep the seven global roles unless user research proves a missing platform persona. Clarify that they are broad personas/trust classes, not complete authorization:

- Platform Admin: platform administration.
- Portfolio Manager: cross-project oversight and approved portfolio management.
- Project Manager: potential project management; actual authority requires project scope/role.
- Team Member: internal contributor; actual execution comes from membership/assignment.
- Executive: read-only portfolio/intelligence projection.
- Customer: external read-only audience projection for explicitly shared/approved content.
- Partner: external collaboration projection for explicitly assigned content/actions.

Project roles remain owner/manager/contributor/viewer. Task assignment grants bounded execution, not automatic access to every internal project field. External audience policy is a separate projection concern even if Customer/Partner remain global roles.

## 23. Target Task Creation Model

Planning is the primary authoring experience for WBS, Tasks, Sub-tasks, Milestones, ownership, dates, and dependencies.

The product owner may approve contextual quick-create in Delivery or Home. If approved, it is a shortcut to the same command, defaults to a Standard Task, clearly shows project/parent, and can transition to Planning for full structure/schedule editing. It must not create a second task type, DTO rule set, or service implementation.

One backend Task application service owns create, update, move, complete, and delete. Execution updates remain a bounded command with a narrower field policy and audit record.

## 24. Target Architecture Model

### Backend

`Controller adapter -> Task/Project application service -> domain policy -> repository/transaction`

- Controllers supply route context and authenticated actor.
- One task command service owns task invariants.
- One project-scope policy resolves list/object/source/destination authority.
- Planning owns schedule projection/snapshots, not Task identity.
- Backend returns derived hierarchy/roll-up fields and action capabilities.
- External projection mappers define approved Customer/Partner data.

### Frontend

`Workspace route -> context provider -> domain query/commands -> canonical selectors -> workspace view`

- One transport primitive, domain-scoped typed clients.
- One project context provider for project, members, actor, and capabilities.
- One hierarchy selector contract; specialized Planning view mechanics remain local.
- One execution editor model shared by Home and Delivery.
- Review is a Delivery workflow, not a copied execution product.

## 25. Consolidation Map

| Current | Target | Action |
| --- | --- | --- |
| Today top-level workspace | Home My Work filter + Delivery Today filter | CONSOLIDATE |
| My Tasks work queue | Home > My Work | CONSOLIDATE |
| Daily Review top-level workspace | Projects > Delivery > Review | CONSOLIDATE |
| Delivery | Canonical project execution | KEEP / REDEFINE |
| Planning project tab | Planning workspace deep link with project context | KEEP / REDEFINE |
| Three Task create APIs | One command owner with temporary adapters | CONSOLIDATE |
| Multiple hierarchy builders | Canonical hierarchy selectors + specialized views | CONSOLIDATE |
| Frontend role/capability inference | Server-resolved action capability contract | REDEFINE |
| Customer/Partner global role scope | External audience projection + project sharing | REDEFINE |
| Portfolio aggregate | Aggregate now; persisted Portfolio only if approved | REVIEW |
| Program docs only | Add only with approved program journeys | REVIEW |
| Fixed default organization | Explicit single-org decision or canonical Organization | REVIEW |
| `TaskType` aliases | `TaskKind` canonical contract | DEPRECATE |
| Dormant `ScheduleSnapshot` | Active `PlanningScheduleSnapshot` only | DELETE after verification |
| Redirected project routes | Canonical Delivery/Govern/Planning routes | DEPRECATE with telemetry |
| AI Playground in general admin nav | Restricted internal administration/developer capability | REDEFINE |

## 26. Prioritized Remediation Backlog

All items are future recommendations. None were implemented by this audit.

### P0 - Security / Correctness (5)

| ID | Problem and evidence | Future recommendation | Affected areas | Risk / dependency | Size | Migration | Backward compatibility |
| --- | --- | --- | --- | --- | :---: | --- | --- |
| P0-01 | Predictable JWT fallback; E01-E03 | Require/rotate strong keys; validate issuer/audience/key ID; fail startup | Auth, Docker, deploy | Critical; deploy inventory | M | Yes, key/session rollover | Yes, coordinated session expiry |
| P0-02 | Refresh token is accepted as access and stored with access token; E04-E05 | Typed refresh flow, rotation, revocation, reuse detection, secure browser transport | Auth API, frontend session | High; P0-01 | L | Yes, sessions/client | Yes, login rollout |
| P0-03 | JWT trusts stale `roleId`; E03, E06 | Bind current role/session version and invalidate on role/status/security changes | Auth, Users, guards | High; P0-02 helpful | M | Yes, token/session version | Yes, forced re-auth |
| P0-04 | Document/external/user directory reads exceed scope; E06-E07, E20, E27 | Actor-required reads, audience projections, project-scoped people lookup, negative tests | Documents, Projects, Users, Export | High; product audience decision | L | Possibly response contracts | Yes, external/internal clients |
| P0-05 | Task/document moves check source only; E18-E19 | Explicit transactional move command requiring both scopes; audit other mutable parent/scope fields | Tasks, Documents, authorization | High; scope resolver | M | No data migration; API migration | Yes, reject/deprecate update field |

### P1 - Product Model Consolidation (5)

| ID | Problem and evidence | Future recommendation | Affected areas | Risk / dependency | Size | Migration | Backward compatibility |
| --- | --- | --- | --- | --- | :---: | --- | --- |
| P1-01 | Navigation mixes workspaces/queues/placeholders; E11, E28 | Approve one effective workspace/nav model and availability rule | Navigation, routes, product docs | Product risk; owner approval | M | Yes, routes/preferences | Yes, redirects |
| P1-02 | Today and My Tasks overlap; PROD-01 | Create Home > My Work; Today becomes filter/mode | Home, Today, Tasks | Adoption risk; P1-01 | L | Yes, preferences/URLs | Yes, redirects/deep links |
| P1-03 | Daily Review duplicates Delivery execution context; PROD-01 | Move Review/AI/completion into Delivery | Daily Review, Delivery | Workflow risk; P1-01 | L | Yes, preferences/URL | Yes, redirect |
| P1-04 | Task creation has no approved product rule; DOM-01 | Planning primary; decide bounded contextual quick-create | Planning, Delivery, Home | Product decision; P2-01 | M | No data migration | Preserve route aliases initially |
| P1-05 | Organization/Portfolio/Program target is undefined; DOM-03 | Decide single-org vs portfolio/program product scope before adding entities/routes | Portfolio, planning, calendar, AI | Strategic risk | S decision / XL implementation | Only if approved | Requires explicit version plan |

### P2 - Architectural Consolidation (6)

| ID | Problem and evidence | Future recommendation | Affected areas | Risk / dependency | Size | Migration | Backward compatibility |
| --- | --- | --- | --- | --- | :---: | --- | --- |
| P2-01 | Three Task command owners; E21-E22 | One Task application command service; controllers become adapters | Tasks, Projects, Planning | High change risk; P1-04 | XL | No data; API/service migration | Yes, route adapters |
| P2-02 | Hierarchy selectors and validation are duplicated; E30-E31 | Canonical hierarchy contract/selectors and conformance suite | Frontend Tasks/Planning/Today; backend Tasks | Regression risk; P2-01 | L | No | Preserve output shapes |
| P2-03 | Roll-ups exist in frontend and backend; E23 | Backend-derived roll-up contract; frontend display-only | Tasks, Planning, Projects | Schedule/report risk; P2-01 | L | Possibly snapshot rebuild | Yes, add then remove fields |
| P2-04 | Action capabilities are inferred per page; E08, E11-E13 | Server-resolved project/object capability manifest and shared project context provider | Authz, project pages, components | Security/UX; P0 scope fixes | L | API addition | Additive first |
| P2-05 | Stored lag/SF does not match scheduler; SCHED-01 | Approve support policy, reject unsupported writes, surface legacy validation, then implement only if funded | Dependencies, graph, scheduler, UI | Correctness; product scheduling decision | M or XL | Legacy dependency audit | Yes, validation rollout |
| P2-06 | Rule/state/rendering concentrated in large modules; ARCH-01/02 | Decompose by approved commands, selectors, state, and domain clients | Planning UI, execution UI, API client | Maintainability; P1/P2 boundaries first | XL | No | Internal imports only |

### P3 - UX Simplification (4)

| ID | Problem and evidence | Future recommendation | Affected areas | Risk / dependency | Size | Migration | Backward compatibility |
| --- | --- | --- | --- | --- | :---: | --- | --- |
| P3-01 | Competing product vocabulary; UX-01 | Approve lexicon for Home, My Work, Review, Intelligence, assignee/owner, RAID | Navigation, labels, docs | Adoption; P1-01 | M | Saved labels/help only | Keep redirect terms |
| P3-02 | Actions appear/hide inconsistently; IAM-03/04 | Render from action capabilities; standardize forbidden vs unavailable states | Project tabs/pages/task editors | UX/security; P2-04 | L | No | No |
| P3-03 | Workspace context/preferences are stored per overlapping page | Define one URL/saved-view context contract for project, filter, date, and view | Home, Delivery, Planning | State migration; P1-02/03 | L | Yes, preferences | Read old keys temporarily |
| P3-04 | Status/progress/dates/owner edit patterns vary by Task surface | One execution editor interaction model with workspace-specific density | TaskTable, TodayWorkspace, ProjectWorkspaceTasks | Regression; P1 consolidation | L | No | No |

### P4 - Technical Cleanup (5)

| ID | Problem and evidence | Future recommendation | Affected areas | Risk / dependency | Size | Migration | Backward compatibility |
| --- | --- | --- | --- | --- | :---: | --- | --- |
| P4-01 | Redirected routes/components have no sunset; LEG-02 | Deprecation register, telemetry, then remove proven-unused routes/modes | Frontend routes/components/tests | Low; P1 complete | M | Route cleanup | Yes, timed redirects |
| P4-02 | Dual Task vocabulary; DOM-04 | Deprecate `TaskType`/compatibility fields after consumer inventory | DTOs, API client, tests | Contract risk; P2-01 | M | Contract migration | Yes, version/deprecation |
| P4-03 | Dormant `ScheduleSnapshot`; LEG-01 | Verify no consumer, then remove class/reference | Planning entity/docs | Low | S | No database table exists | Verify tooling first |
| P4-04 | Monolithic API client and duplicated cross-workspace tests | Domain clients and contract-focused test fixtures after behavior consolidation | Frontend API/tests | Low; P2-06 | L | No | Internal imports |
| P4-05 | ADR statuses/legacy roles/deployment defaults drift | Architecture index, conformance checks, stale role cleanup, pin/remove unused services | Docs, auth constants, Docker | Governance; P0/P1 decisions | M | No | No |

## 27. Migration / Compatibility Considerations

### Data and API

- No Task data migration is required to consolidate workspaces; they already share Task identity.
- Task command consolidation should preserve existing routes as thin adapters until client telemetry proves they can be removed.
- Removing mutable `projectId` from update DTOs is a breaking validation change; provide an explicit move command first if moving is a supported job.
- External audience projections can be additive endpoints/versioned representations before internal aggregate responses are narrowed.
- Lag/SF remediation needs a read-only inventory of stored dependencies before stricter validation or recalculation.
- Session hardening will intentionally invalidate current tokens and requires a coordinated re-authentication window.

### Frontend and Routes

- `/today`, `/tasks`, and `/daily-review` should redirect while preserving project/filter context.
- Persisted workspace preference keys need one-time import into the target Home/Delivery saved-view model.
- Legacy project routes should remain until inbound links and bookmarks are measured.

### Test / Regression Risk

Existing high-value coverage includes:

- `planning-graph-builder.service.spec.ts` for direct standard-parent dependency edges, Summary exclusion, cycles, and legacy SF.
- `planning-workspace.test.tsx` for dependency endpoint eligibility, WBS editing, hierarchy moves, and long-row behavior.
- `tasks.service.spec.ts` and authorization policy specs for assignee execution and project roles.
- `today-workspace.test.tsx`, `tasks-page.test.tsx`, `project-workspace.test.tsx`, and Delivery/navigation tests for current surface behavior.

Missing security regressions include forged/default-secret deployment protection, refresh-token rejection as bearer access, role-change session invalidation, cross-project document reads, destination authorization for Task/document moves, external field projections, governor list/direct consistency, and AI project-scope resolution.

Consolidation will affect many page-level tests that assert labels and duplicated interaction details. Preserve domain/command/security tests first; rewrite surface tests around the approved target journeys instead of mechanically porting every old workspace assertion.

## 28. Risks

| Risk | Consequence | Mitigation before implementation |
| --- | --- | --- |
| Fixing UX before P0 | Cleaner UI over insecure scope/session behavior | Complete P0 design and deployment verification first |
| Big-bang workspace rewrite | Lost bookmarks, preferences, and trusted workflows | Redirects, telemetry, incremental composition |
| Over-centralizing UI | Planning loses dense authoring behavior | Centralize semantics/commands, not every presentation |
| Treating docs as automatically correct | Builds unapproved Program/Organization complexity | Product-owner decisions and ADR status review |
| Keeping every compatibility route forever | Architecture never converges | Time-bound deprecation register |
| Removing compatibility without consumer evidence | Breaks unknown clients | API inventory, logs, versioning |
| Expanding Customer/Partner rights for convenience | Trust-boundary data exposure | Explicit audience projections and negative tests |
| Implementing dependency propagation | Changes schedule semantics without requirement | Preserve direct selected-endpoint model |

## 29. Open Product Decisions

The five decisions that must precede consolidation are:

1. **Workspace model:** Approve Home/My Work, Project Delivery (with Review), and Planning as the three Task responsibilities inside the seven-workspace platform taxonomy.
2. **Task creation:** Decide whether Delivery/Home receive bounded quick-create or always transition to Planning. In either case, approve one command owner.
3. **External audience:** Define exactly which Project, Task, RAID, member, and document fields Customer and Partner can see/change, including approval/publication semantics.
4. **Portfolio boundary:** Decide whether Portfolio and Program need persisted identity/membership or whether Portfolio remains an aggregate of Projects for the next product stage.
5. **Organization boundary:** Declare the product single-organization or fund a real Organization/tenant model before adopting organization-scoped routes and AI context.

Repository evidence is insufficient to decide these from code alone. User research is also needed to determine whether PMs require team-wide Today outside Delivery, whether Daily Review completion is operationally adopted, and which existing API routes have external consumers.

## 30. Recommended Next Steps

1. Review the six Critical/High findings with Security and Engineering; verify deployed JWT/key/session configuration and live role/migration state.
2. Have Product, Design, Security, and Architecture answer the five open decisions and record them in approved ADRs/product decisions.
3. Convert P0 items into independently testable remediation tickets with negative authorization acceptance criteria.
4. Approve the target Task command and capability contracts before changing any workspace.
5. Instrument route/API usage and create a formal deprecation register.
6. Consolidate Home/Today/My Tasks and Delivery/Daily Review incrementally, preserving URLs and preferences.
7. Perform architectural cleanup only after behavior and ownership have converged.

This audit recommends no immediate feature addition. The highest-value move is to secure the current platform, approve the product boundaries, and then remove duplicate responsibilities in that order.
