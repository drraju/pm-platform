# Changelog

All notable PM Platform changes should be documented in this file.

This project also keeps detailed release documentation in
[docs/releases](docs/releases/README.md).

## Unreleased

### Added

- Added Enterprise Dependency Management read APIs for visible dependency detail and project dependency collections.
- Added derived dependency health, blocked-state, and bounded downstream-impact projections.
- Added dependency filtering, deterministic sorting, pagination, traversal limits, Swagger contracts, and architecture tests.

### Changed

- Preserved existing task-dependency mutation routes while establishing DTO-only enterprise dependency read contracts.
- Improved dependency impact traversal to use a linear-time queue and retain complete graph context for detail reads.

### Compatibility

- No database migration or breaking API change is required for Feature 1.3.2.
- Start-to-Finish and nonzero-offset dependencies remain readable but report unknown health until their scheduling mathematics are explicitly implemented.

### Documentation

- Added root project governance documents:
  - `CHANGELOG.md`
  - `CONTRIBUTING.md`
  - `SECURITY.md`
  - `SUPPORTED_VERSIONS.md`

### Notes

- Continue recording detailed release notes under `docs/releases/`.
- Continue recording architecture decisions under `docs/adr/`.
- Continue recording planned work under `docs/roadmap/`.

## Current Release Line

The active release documentation set includes:

- [v1.1.1 Planning Engine Stabilization](docs/releases/v1.1.1-planning-engine-stabilization.md)
- [v1.1.0 beta1](docs/releases/v1.1.0-beta1.md)
- [v1.0.6 Planning Foundation](docs/releases/v1.0.6.md)

## Historical Releases

Historical release notes are indexed in
[docs/releases/README.md](docs/releases/README.md).

## Changelog Maintenance

- Add new user-visible changes under `Unreleased`.
- Move completed items into a release section when a release is cut.
- Keep implementation details in release notes when they are too detailed for
  this summary.
- Link to ADRs, release notes, and migration documents where useful.
