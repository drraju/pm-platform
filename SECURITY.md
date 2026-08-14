# Security Policy

## Supported Project

PM Platform is currently under active development. Security support follows the
supported versions policy in [SUPPORTED_VERSIONS.md](SUPPORTED_VERSIONS.md).

## Reporting A Vulnerability

Do not open public issues for suspected vulnerabilities.

Report security concerns privately to the project maintainer or repository
owner with:

- affected area
- reproduction steps
- expected impact
- affected version or commit
- logs or screenshots if safe to share

If no private security channel is configured for the repository, contact the
maintainer directly before disclosing details publicly.

## Security Expectations

Contributors should:

- avoid committing secrets or credentials
- avoid committing customer or production data
- keep authentication and authorization checks server-side
- use least privilege for roles and permissions
- validate DTOs and API inputs
- avoid exposing stack traces or sensitive internals to users
- document security-sensitive architecture changes

## Current Security Model

PM Platform uses:

- purpose-separated JWT access and refresh tokens with distinct secrets
- hashed password storage
- short-lived, single-use password reset tokens stored only as hashes
- RBAC and permission policies
- project-scoped visibility rules
- PostgreSQL persistence
- Docker Compose deployment

Password reset requests return a generic success response regardless of whether
an account exists. Reset tokens expire after a short window, are marked consumed
after use, and password updates refresh `password_changed_at` so older JWTs are
rejected by token validation.

Access tokens default to 15 minutes and refresh tokens default to 7 days. Token
validation checks current account status, role, email, and password-change time,
so those changes invalidate previously issued authority. Non-test startup fails
when either JWT secret is missing or when both token purposes share one secret.

The browser client currently stores both tokens in `localStorage`. This leaves
them accessible to JavaScript running in the page and increases the impact of an
XSS defect. Replacing refresh-token storage with a Secure, HttpOnly, SameSite
cookie requires a separately designed CSRF and session-delivery change; it is a
required hardening follow-up and is not silently approximated by this P0 change.

Related documentation:

- [Security Architecture](docs/architecture/security.md)
- [Backend Architecture](docs/architecture/backend.md)
- [Release Documentation](docs/releases/README.md)

## Secrets And Configuration

Local defaults in development files are not production credentials.

Production deployments should provide secure values for:

- database credentials
- distinct `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` values
- integration credentials
- object storage credentials
- external service tokens

Do not reuse local Docker Compose defaults in production.

## Dependency Security

Dependencies are managed separately for:

- `backend/package.json`
- `frontend/package.json`

Before production release, review dependency audit results and resolve
high-impact vulnerabilities where practical.

## Disclosure

Security fixes should be coordinated privately until a patched version or
mitigation is available.
