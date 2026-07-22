# ADR-015: Enterprise Knowledge Platform Architecture

## Status

Proposed.

## Date

2026-07-22

## Authors

PM Platform Architecture

## Context

PM Platform is evolving from a project management application into an
Enterprise Delivery Operating System. Projects need structured knowledge in
addition to tasks, RAID records, schedules, teams, and dashboards.

The platform must support business, architecture, delivery, testing, release,
operations, and provider-hosted documents. It must not store binary files in
PostgreSQL. PostgreSQL stores metadata, lifecycle, permission, indexing, and
relationship records only. Document content remains in external storage
providers such as Google Drive, SharePoint, OneDrive, Amazon S3, MinIO, or
local storage. Google Drive is the first intended provider, but the domain and
application architecture must stay provider agnostic.

The knowledge platform also becomes the foundation for future AI retrieval,
RAG, document summarization, comparison, and agentic delivery assistance. This
ADR defines architecture only. It does not authorize implementation,
migrations, APIs, provider credentials, indexing jobs, or AI execution.

## Problem Statement

Project knowledge is currently not modeled as a first-class enterprise domain.
Documents may exist outside the platform, but PM Platform has no canonical
metadata, folder structure, lifecycle, provider abstraction, version model,
document permission policy, search boundary, or AI-ready knowledge index.

Without a provider-agnostic architecture, the first document integration would
couple project knowledge directly to Google Drive behavior and make future
SharePoint, OneDrive, S3, MinIO, or local storage support difficult. Without a
metadata-first model, future AI features would either require unsafe direct
provider access or inconsistent document discovery.

## Goals

- Introduce an enterprise-grade Knowledge Platform bounded context.
- Model project document workspaces, folders, documents, versions, categories,
  tags, external links, provider connections, permissions, indexes, templates,
  and lifecycle states.
- Store document metadata in PostgreSQL while keeping binary files and document
  bodies in external providers.
- Keep provider operations behind an abstraction that can support Google Drive
  first and additional providers later.
- Support configurable default project folder blueprints.
- Support metadata search, provider search, and future semantic search as
  separate responsibilities.
- Prepare the domain for future AI retrieval and RAG without implementing AI
  execution in this stage.
- Preserve clean architecture, SOLID dependency direction, and domain-driven
  boundaries.

## Non-goals

- No binary document storage in PostgreSQL.
- No document content extraction implementation.
- No Google Drive, SharePoint, S3, MinIO, OneDrive, or local provider adapter
  implementation.
- No database migration, API, worker, UI, queue, or production code.
- No AI model calls, embeddings, vector database, RAG pipeline, or agent
  executor.
- No replacement of provider-native sharing, audit, retention, or legal hold
  systems.
- No guarantee that every provider supports every optional operation.

## Architecture Decisions

### 1. Knowledge Platform is a separate bounded context

Knowledge Platform owns document metadata, folder hierarchy, lifecycle,
version records, category and tag classification, provider references,
document permissions, template definitions, and AI visibility metadata.

Project remains the parent business context. Knowledge references projects by
identifier and does not own project lifecycle, membership, or schedule data.

### 2. Metadata is authoritative inside PM Platform

PM Platform metadata is authoritative for:

- Project document workspace structure.
- Folder hierarchy displayed inside PM Platform.
- Document category, tags, lifecycle status, approval state, and AI visibility.
- Version records known to PM Platform.
- Searchability and indexing state.
- PM Platform document permissions.

Provider metadata is authoritative for:

- Binary file content.
- Provider-native document id and folder id.
- Provider-native URL and preview URL.
- Provider-native modified timestamps when returned by the provider.
- Provider-native sharing state outside PM Platform control.

### 3. Provider adapters are replaceable infrastructure

Application services depend on a storage provider interface, not on Google
Drive or any other provider SDK. Provider-specific adapters live in
infrastructure and translate PM Platform commands into provider operations.

### 4. Folder blueprints are configurable

The default project folder structure is a template, not a hard-coded product
rule. Organizations may alter, extend, disable, or version the blueprint.

### 5. Document lifecycle is platform-level metadata

Document lifecycle states are modeled independently from provider file state.
Provider deletion, provider archival, and platform archival must be reconciled
through metadata synchronization and audit policy.

### 6. Search has three layers

Metadata search uses PM Platform metadata stored in PostgreSQL. Provider search
delegates to external provider APIs. Future semantic search uses a
KnowledgeIndex that references approved, searchable, AI-visible document
records and externally extracted content.

### 7. AI readiness is controlled by policy

Documents are not automatically visible to AI features. Future AI retrieval may
only consume documents that are searchable, indexed, AI-visible, permission
compatible, and within retention policy.

## Storage Strategy

PostgreSQL stores metadata records only:

- Workspace, folder, document, version, category, tag, link, provider,
  connection, permission, index, and template records.
- Provider document ids, provider folder ids, URLs, mime types, checksums, and
  lifecycle state.
- Search and AI visibility flags.

PostgreSQL must not store:

- Binary files.
- Full document bodies.
- Provider refresh tokens in plaintext.
- Provider-owned ACLs as authoritative state.

External providers store:

- Binary document files.
- Native provider documents.
- Native folder and file versions when supported.
- Provider-native preview and download surfaces.

## Provider Strategy

Google Drive is the first intended provider. The domain remains provider
agnostic through an `ExternalStorageProvider` model and a storage provider
interface. Each provider adapter declares capability support, authentication
type, identifier format, and operation behavior.

Provider capability differences are expected. For example, local storage may
not support provider-native sharing, S3 may not support document preview
without a separate preview service, and Google Drive may expose native Docs
metadata differently from uploaded binary files.

The application layer must treat provider operations as fallible, auditable,
and eventually consistent with PM Platform metadata.

## Security

- Access to project documents requires project membership, platform role
  permissions, and document-level permission checks.
- Provider credentials are scoped to storage connections and must be encrypted
  or delegated to a secure secret store before implementation.
- PM Platform permissions do not replace provider-native authorization.
- Provider callbacks, tokens, and webhook events must be verified before
  mutating metadata.
- AI visibility is denied unless explicitly enabled by document policy.
- Deleted, archived, rejected, or superseded documents must not be retrieved by
  future AI features unless an explicit audit or comparison use case allows it.
- Search results must be permission-filtered before presentation or AI use.

## AI Readiness

The Knowledge Platform prepares future AI by maintaining:

- Stable document identity independent of provider id changes.
- Category, tag, lifecycle, approval, and project context metadata.
- Version relationships for comparison and supersession.
- AI visibility and searchability flags.
- KnowledgeIndex records that can later reference extracted text chunks,
  embeddings, checksums, freshness, and retention state.

Future AI capabilities may summarize architecture documents, compare LLD
versions, generate RAID candidates from test plans, generate release
checklists, answer project questions, and detect missing documentation. Those
capabilities require a separate AI retrieval and governance design before
implementation.

## Risks

| Risk | Mitigation |
| --- | --- |
| Provider lock-in through Google Drive-first implementation | Keep provider SDKs behind infrastructure adapters and test against the interface contract. |
| Metadata drift between PM Platform and provider | Use provider refresh, checksum, modified date, and reconciliation metadata. |
| Inconsistent permissions between provider and platform | Treat PM Platform permissions as required but not sufficient; provider access failures remain possible and auditable. |
| AI exposure of sensitive documents | Default `aiVisible` to false or policy-controlled and enforce permission filtering before retrieval. |
| Provider capability mismatch | Model provider capabilities and degrade unsupported operations explicitly. |
| Search index staleness | Track indexing status, indexed timestamp, checksum, and provider modified timestamp. |
| Overly rigid folder structures | Make blueprints configurable and versioned. |

## Alternatives Considered

| Alternative | Reason rejected |
| --- | --- |
| Store binary files in PostgreSQL | Increases database size, backup complexity, and operational risk; violates the metadata-only requirement. |
| Build directly on Google Drive entities | Creates provider lock-in and makes SharePoint, OneDrive, S3, MinIO, and local storage harder to support. |
| Treat provider folders as the only hierarchy | Prevents PM Platform from maintaining configurable project blueprints and provider-independent navigation. |
| Use provider search only | Cannot support consistent metadata filters, lifecycle filtering, permission filtering, or future semantic search. |
| Make all approved documents AI-visible | Creates privacy and governance risk; AI visibility must be explicit and permission-aware. |
| Implement AI retrieval in Epic 1.4 Stage 1 | Premature implementation before metadata, permissions, indexing, and provider boundaries are approved. |

## Consequences

- Knowledge Platform becomes a first-class architecture concern.
- Implementation must introduce a metadata domain before provider-specific
  integrations.
- Every provider integration must implement or explicitly reject the storage
  provider interface operations.
- Future AI work depends on approved metadata, permissions, lifecycle, and
  indexing architecture.
- Some provider behavior remains eventually consistent with PM Platform
  metadata.

## References

- [Enterprise Knowledge Platform Architecture](../enterprise-knowledge-platform.md)
- [Platform Architecture](../PLATFORM_ARCHITECTURE.md)
- [ADR-014 Client Platform Layering](ADR-014-client-platform-layering.md)
