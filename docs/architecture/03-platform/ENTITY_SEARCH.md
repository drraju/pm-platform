# Global Entity Search Foundation

## Responsibilities

`EntityRegistry` is independent from the command framework. It snapshots
registered providers, rejects duplicate provider and entity IDs, supplies the
current pathname/project/permission context, filters entity metadata, and
notifies presentation consumers when providers register or unregister.

Entities contain searchable presentation metadata and an existing navigation
target. They do not expose actions and cannot execute business workflows.

## Provider Integration

Workspace pages create providers from data they already hold in client state.
The React integration registers those providers with the AppShell registry and
unregisters them when the workspace or data snapshot changes. Stage 5.5
includes providers for loaded projects, assigned or visible tasks, and loaded
RAID items. It does not fetch data or retain a second application data store.

Provider results remain subject to the permissions supplied by AppShell. A
provider may also inspect the pathname or current project from the registry
context when a future entity source needs workspace-specific exposure.

## Palette Integration

The Command Palette consumes the command and entity registries separately.
Command results remain first and retain execution, favorites, and recent-command
behavior. Entity results follow under their own heading and navigate through
the palette's existing router callback. A single keyboard index spans both
sections so arrow and Enter behavior remains continuous.

Entity filtering is deterministic and token-based across title, subtitle,
keywords, and category. Fuzzy matching, ranking, semantic search, backend
indexing, and new API requests are intentionally out of scope.

## Scalable Presentation

Stage 5.6 keeps provider presentation metadata outside the frozen entity
registry contract. Application providers may expose an optional section title,
description, and maximum displayed result count. A shell-scoped presentation
catalog tracks this metadata while the entity registry continues to own the
complete searchable snapshot.

After deterministic registry filtering, the palette applies provider limits in
provider/category order and then an overall configurable result cap. Command
results use a separate configurable cap while retaining favorite, recent, and
registration order. Filtering and section construction are memoized so
keyboard-selection changes do not rescan large provider snapshots.
