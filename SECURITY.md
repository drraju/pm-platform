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

- JWT authentication
- RBAC and permission policies
- project-scoped visibility rules
- PostgreSQL persistence
- Docker Compose deployment

Related documentation:

- [Security Architecture](docs/architecture/security.md)
- [Backend Architecture](docs/architecture/backend.md)
- [Release Documentation](docs/releases/README.md)

## Secrets And Configuration

Local defaults in development files are not production credentials.

Production deployments should provide secure values for:

- database credentials
- JWT secrets
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
