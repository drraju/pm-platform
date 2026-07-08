# Security Architecture

## Authentication

The backend uses JWT authentication through Passport. The auth module exposes login/register/session-related endpoints and a JWT strategy. Frontend stores access and refresh tokens in local storage through the shared API client/auth helpers.

## Authorization

Authorization uses permission keys and guards:

- `JwtAuthGuard`
- `PermissionsGuard`
- `RequirePermissions`
- `RequireAnyPermissions`
- `AuthorizationPolicyService`

Permission keys include dashboard, executive, portfolio, project, task, RAID, notification, integration, user, role, and permission management capabilities.

## RBAC

Roles are persisted in `roles`; permissions are persisted in `permissions`; role grants are persisted in `role_permissions`.

The frontend filters navigation using permission keys returned by `/auth/me`.

## Project Visibility

Project access is enforced by policy services:

- Global project permissions.
- Project governance roles: owner, business owner, executive sponsor, delivery lead.
- Project membership.
- Task assignment expansion for certain task permissions.

## Organization Isolation

The current platform primarily enforces project-level visibility, not full tenant isolation. Calendar API work includes a default organization scope because a full organization/tenant model is not yet implemented. SaaS multi-tenancy is a roadmap item.

## Sensitive Data

Password hashes must never be returned to clients. Serialization and DTO boundaries should strip sensitive fields.

## Future Permission Model

Future work should add domain-specific permissions where current features reuse broader permissions. Example: Enterprise Calendar currently uses existing project/admin-style permissions in UI/API because no dedicated calendar permission exists.

