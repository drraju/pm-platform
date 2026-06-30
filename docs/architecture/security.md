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
