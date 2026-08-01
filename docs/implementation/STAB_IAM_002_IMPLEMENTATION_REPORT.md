# STAB-IAM-002 Implementation Report

## 1. Executive Summary

STAB-IAM-002 fixed a false-success defect in User Administration role updates. The frontend sent the selected `roleId` to `PATCH /users/:id`, the controller bound it through `UpdateUserDto`, and validation allowed it. Persistence stopped in the service because the loaded `User` entity still carried the old `role` relation while its `roleId` scalar was changed before `save()`.

The fix aligns the loaded relation with the new canonical role before saving and returns a freshly reloaded user after persistence.

## 2. Root Cause

`UsersService.update()` loaded users with `relations: { role: { permissions: true } }`, then applied `Object.assign(user, updateUserDto)` with the new `roleId`. The entity still had `user.role` pointing at the previous role. Saving an entity with a stale loaded join relation can keep the join column tied to the old relation, so the API reported success without reliably persisting the selected role.

## 3. Investigation Findings

- Frontend edit form uses the selected role option value as `roleId`.
- API client sends `PATCH /users/:id` with a JSON body containing `roleId`.
- Controller passes `UpdateUserDto` directly to `UsersService.update()`.
- `UpdateUserDto` derives from `CreateUserDto`, so `roleId` is part of the validation boundary.
- Global `ValidationPipe` uses whitelist mode, but `roleId` is not stripped.
- `ensureCanonicalRole()` rejects unsupported role ids before persistence.
- The stale relation existed after `findUserEntity()` because it loads `role`.
- The service saved the entity without replacing `user.role` with the selected role.

## 4. Files Changed

- `backend/src/modules/users/users.service.ts`
- `backend/src/modules/users/tests/users.service.spec.ts`

## 5. Implementation Details

`UsersService.update()` now captures the canonical `Role` returned by `ensureCanonicalRole()` and assigns it to `user.role` when `roleId` is updated. This keeps the TypeORM relation and `roleId` join column in sync before `usersRepository.save(user)`.

After save, the service reloads the user through the existing read path before returning the response. This ensures the API response reflects persisted state, including the updated role relation.

## 6. Architecture Impact

The change stays within existing boundaries:

- Controller remains thin.
- DTO and validation shape are unchanged.
- Service continues to own update logic.
- Repository usage remains TypeORM repository persistence.
- No RBAC, authentication, authorization, permission, API, or schema redesign was introduced.

## 7. Test Results

Backend:

- `npm test -- users.service.spec.ts --runInBand`
- Result: 8 tests passed.
- `npm run build`
- Result: passed.
- `npm test -- users --runInBand`
- Result: failed in unrelated suites selected by the broad Jest pattern. Failures included sandbox listener errors (`listen EPERM: operation not permitted 0.0.0.0`) in Supertest-based resource/milestone specs and existing AI provider registry expectation mismatches. The focused STAB-IAM-002 users service regression suite passed.

Frontend:

- Initial invalid command: `npm test -- project-api-client.test.ts --runInBand`
- Result: failed before execution because Vitest does not support `--runInBand`.
- Corrected command: `npm test -- project-api-client.test.ts`
- Result: 24 tests passed.

Manual verification:

- Docker/PostgreSQL manual verification could not be executed because the local Docker daemon was unavailable at `unix:///Users/ramdatla/.docker/run/docker.sock`.

## 8. Regression Verification

Added backend regression coverage for these role transitions:

- `TEAM_MEMBER` to `PROJECT_MANAGER`
- `PROJECT_MANAGER` to `PORTFOLIO_MANAGER`
- `PLATFORM_ADMIN` to `PROJECT_MANAGER`

The tests verify:

- `usersRepository.save()` receives the updated `roleId`.
- `usersRepository.save()` receives the updated `role` relation.
- The response is loaded again through `usersRepository.findOne()`.
- Unsupported role changes are rejected before save.

## 9. Technical Debt

- The work-item checklist mentions `DELIVERY_LEAD` and `ADMIN`, but this branch's canonical roles use `PORTFOLIO_MANAGER` and `PLATFORM_ADMIN`; `DELIVERY_LEAD` is not currently a valid user administration role.
- `UpdateUserDto` inherits from `CreateUserDto`, which means update validation still includes create-only fields such as `password`. The current bug did not require changing that DTO shape.

## 10. Recommendation

Keep relation and join-column fields synchronized whenever updating TypeORM entities that were loaded with relations. For future user administration changes, prefer regression tests that assert both the scalar foreign key and relation object passed to persistence.
