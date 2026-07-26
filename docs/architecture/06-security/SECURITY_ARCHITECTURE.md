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

# Security Architecture

## Purpose

Security protects project data, customer information, governance records, and operational integrity. The platform must support enterprise controls while remaining practical for self-hosted deployments.

## Authentication

Current authentication uses application-managed login and JWT-based sessions. Authentication identifies the user; authorization determines what the user can see or change.

## Authorization

Authorization is role and permission based. Backend services enforce access decisions for every protected operation. Frontend checks improve usability but are not security boundaries.

```text
Request -> JWT Guard -> Permissions Guard -> Visibility Policy -> Domain Service
```

## RBAC

RBAC should support:

- Global roles.
- Project roles.
- Permission keys.
- Project membership visibility.
- Future customer and partner access.

## Password Hashing

Passwords must be hashed with an approved adaptive hashing algorithm. Plaintext passwords must never be logged, stored, exported, or seeded outside secure development fixtures.

## Change Password

Authenticated users can change their own password through `POST /auth/change-password`. The workflow verifies the current password before accepting a replacement, enforces the backend password policy, rejects password reuse, and records `users.password_changed_at` when the hash is updated. Password material is never logged; the audit integration point records only the event type, user id, timestamp, IP address, and user agent.

Existing JWTs issued before `password_changed_at` are rejected by the JWT strategy. The frontend clears local authentication state after a successful change and sends the user back to login.

## JWT

JWTs should be short-lived enough to limit exposure and include only necessary identity claims. Sensitive authorization decisions should use server-side role and permission lookups.

## Secrets

Secrets include database credentials, JWT signing keys, integration tokens, and future AI provider keys. They must be supplied through environment variables or Docker secrets, not committed to source control.

## Docker Secrets

Production-like deployments should prefer Docker secrets or equivalent secret stores. Environment files are acceptable for local development and controlled UAT only.

## Audit Logging

Audit logging should capture:

- Authentication events.
- Permission and role changes.
- Project membership changes.
- Planning baseline captures.
- RAID updates.
- AI-generated or AI-assisted actions.

## Backups and Disaster Recovery

Backups must include PostgreSQL data and any external artifact references needed to restore operational continuity. Recovery procedures should be tested before production use.

## Future SSO

Planned enterprise authentication includes:

- OAuth/OIDC.
- SAML.
- Enterprise identity provider mapping.
- Just-in-time user provisioning.

## Security Principles

- Least privilege by default.
- Backend authorization is mandatory.
- Secrets are externalized.
- Audit important state changes.
- Prefer explicit project membership checks.
- Treat AI and integrations as permission-bound clients.
