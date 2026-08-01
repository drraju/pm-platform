# M17 AI Daily Review Assistant

## Repository Investigation

The Daily Review page already loaded the selected project, tasks, execution updates, members, and RAID data. M16 provided enterprise capability metadata and execution routing, while M13 supplied declarative skills and M15 supplied `StructuredAIResponse`.

## Architecture

M17 adds `daily-review-analysis` and `daily-review-assistant`. The frontend sends the data it has already loaded as M11 context source data. `CapabilityExecutionService` validates the capability and permission, delegates to M14, and returns M15 structured output. No chat, memory, planning, task mutation, or workflow execution was added.

## Enterprise Context

The request reuses project, task, execution, RAID, team, user, and workspace source buckets. The backend continues to use M11 assembly and authorization boundaries; no duplicate project or task queries were introduced.

## Skill and Capability

`DAILY_REVIEW_ANALYSIS` is registered as `daily-review-analysis` with required project, task, execution, RAID, team, workspace, and user context. `daily-review-assistant` is registered as an internal delivery capability requiring `project.read` and returning a review response type.

## Execution Flow

1. Project Manager selects a project in Daily Review.
2. The user clicks **AI Daily Review**.
3. Existing project data is mapped to M11 source data.
4. The capability endpoint validates and routes the request.
5. M11, M12, M14, and M15 execute unchanged.
6. The page renders summary, findings, risks, recommendations, action items, warnings, and opportunities when returned.

## Frontend Integration

Added a compact AI Daily Review action and structured response panel to the existing Daily Review workspace. The panel does not parse raw text to infer meaning; it renders typed response sections and retains provider raw content only in the backend response contract.

## Files Changed

- `backend/src/ai/skills/built-in-skill-definitions.ts`
- `backend/src/ai/capabilities/built-in-enterprise-capability-definitions.ts`
- `backend/src/ai/capabilities/capability-execution.service.ts`
- `backend/src/ai/capabilities/enterprise-capability.types.ts`
- `backend/src/modules/ai-playground/ai-playground.controller.ts`
- `frontend/app/(app)/daily-review/page.tsx`
- `frontend/lib/api/client.ts`
- M17 capability and execution tests

## Testing

Backend capability, skill, execution, Playground, and architecture tests pass: 6 suites, 24 tests. Frontend Daily Review navigation tests pass: 12 tests. Backend and frontend production builds pass, and `git diff --check` passes.

## Future Extension Points

Future work can add a production AI provider response with populated structured sections, capability-specific response schemas, refresh/export actions, and richer context freshness diagnostics. Automatic task updates, scheduling, planning, chat, agents, and workflow execution remain out of scope.
