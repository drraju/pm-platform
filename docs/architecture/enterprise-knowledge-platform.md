# Enterprise Knowledge Platform Architecture

## Purpose

Epic 1.4 establishes Enterprise Knowledge Management as the foundation for
provider-agnostic document workspaces, search, future AI retrieval, and future
RAG. This document is architecture only. It does not define production code,
database migrations, APIs, provider adapters, workers, or AI implementation.

## Scope

The Knowledge Platform supports:

- Project document workspaces.
- Configurable folder hierarchy.
- Document metadata and lifecycle.
- Document categories, tags, links, templates, versions, and permissions.
- External storage providers.
- Metadata search, provider search, and future AI semantic search.
- Future AI capabilities that consume controlled project knowledge.

The platform stores metadata only. Binary files and document bodies remain in
external providers.

## Domain Model

### Aggregate Boundaries

| Aggregate | Responsibility | Notes |
| --- | --- | --- |
| KnowledgeWorkspace | Owns the project knowledge workspace and root folder relationship. | One active workspace per project by default. |
| Folder | Owns hierarchy and folder metadata within a workspace. | May map to a provider folder. |
| Document | Owns document identity, metadata, lifecycle, category, tags, links, permissions, and latest version pointer. | Does not own binary content. |
| ExternalStorageProvider | Describes provider type and capabilities. | Provider catalog metadata, not credentials. |
| StorageConnection | Owns tenant/project/provider connection metadata and credential reference. | Credential material remains outside plaintext metadata. |
| KnowledgeIndex | Owns indexing state for search and future AI retrieval. | References document versions and extraction state. |
| DocumentTemplate | Owns reusable document template metadata. | May reference provider-native template ids. |

### Entity Catalog

| Entity | Purpose | Key Relationships |
| --- | --- | --- |
| Workspace | Knowledge container for a project. | Belongs to Project; has root Folder; has many Documents. |
| Project | Existing delivery project aggregate. | Has zero or one active Workspace. |
| Folder | Logical document hierarchy node. | Belongs to Workspace; optional parent Folder; has child Folders and Documents. |
| Document | Metadata record for a provider-hosted document. | Belongs to Workspace, Project, Folder, Category, Provider, StorageConnection; has versions, tags, links, permissions, indexes. |
| DocumentVersion | Version metadata for a Document. | Belongs to Document; may reference provider version id and checksum. |
| DocumentCategory | Controlled taxonomy such as Business, Architecture, Delivery, Testing, Release, Operations. | Used by Documents and Templates. |
| DocumentTag | Flexible project or enterprise tag. | Many-to-many with Documents. |
| DocumentLink | Relationship between documents or external URLs. | Source Document to target Document or external URL. |
| ExternalStorageProvider | Provider definition such as Google Drive, SharePoint, OneDrive, S3, MinIO, Local. | Has many StorageConnections and provider capability metadata. |
| StorageConnection | Configured connection to a provider for a tenant, project, or workspace. | Belongs to Provider; used by Workspaces, Folders, and Documents. |
| DocumentPermission | Document-level permission grant or restriction. | Belongs to Document; references user, role, team, customer, or project membership scope. |
| KnowledgeIndex | Search and future AI indexing metadata. | Belongs to Document and optionally DocumentVersion. |
| DocumentTemplate | Reusable document template metadata. | Belongs to Category and Provider; can be applied to Folder or Workspace blueprint. |
| DocumentStatus | Lifecycle state value. | Used by Document and DocumentVersion. |

### Relationships

```text
Project 1 --- 0..1 Workspace
Workspace 1 --- 1 Root Folder
Workspace 1 --- many Folders
Workspace 1 --- many Documents

Folder 0..1 parent --- many child Folders
Folder 1 --- many Documents

Document many --- 1 Project
Document many --- 1 Workspace
Document many --- 0..1 Folder
Document many --- 0..1 DocumentCategory
Document many --- 1 ExternalStorageProvider
Document many --- 0..1 StorageConnection
Document 1 --- many DocumentVersions
Document many --- many DocumentTags
Document 1 --- many DocumentLinks
Document 1 --- many DocumentPermissions
Document 1 --- many KnowledgeIndex records

DocumentTemplate many --- 0..1 DocumentCategory
DocumentTemplate many --- 1 ExternalStorageProvider
StorageConnection many --- 1 ExternalStorageProvider
```

## Document Metadata Model

Document metadata is the canonical PM Platform view of a provider-hosted
document. The model must not include binary file content.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| id | UUID | Yes | Stable PM Platform document identifier. |
| workspaceId | UUID | Yes | Knowledge workspace that owns the document. |
| projectId | UUID | Yes | Project context for authorization and navigation. |
| folderId | UUID nullable | No | Logical PM Platform folder. |
| provider | enum | Yes | Provider key such as google_drive, sharepoint, onedrive, s3, minio, local. |
| providerDocumentId | string | Yes | Provider-native file or document id. |
| providerFolderId | string nullable | No | Provider-native folder id for the containing folder. |
| storageConnectionId | UUID nullable | No | Configured provider connection used for access. |
| title | string | Yes | Display title. |
| description | string nullable | No | Business description or abstract. |
| categoryId | UUID nullable | No | Controlled category reference. |
| categoryCode | string nullable | No | Denormalized category code for search. |
| tags | string array or relation | No | Flexible tag labels. |
| ownerUserId | UUID nullable | No | PM Platform document owner. |
| providerOwnerId | string nullable | No | Provider-native owner when available. |
| version | string | Yes | Current PM Platform display version. |
| latestVersionId | UUID nullable | No | Latest known DocumentVersion. |
| status | DocumentStatus | Yes | Lifecycle state. |
| mimeType | string nullable | No | Provider-reported MIME type. |
| extension | string nullable | No | File extension when available. |
| sizeBytes | number nullable | No | Provider-reported size when available. |
| createdDate | timestamp | Yes | PM Platform metadata creation timestamp. |
| modifiedDate | timestamp | Yes | PM Platform metadata update timestamp. |
| providerCreatedDate | timestamp nullable | No | Provider-created timestamp. |
| providerModifiedDate | timestamp nullable | No | Provider-modified timestamp. |
| approvalState | enum nullable | No | Not required, pending, approved, rejected, or superseded. |
| approvalOwnerId | UUID nullable | No | User responsible for approval. |
| approvalDate | timestamp nullable | No | Latest approval decision timestamp. |
| documentUrl | string nullable | No | Provider or platform document URL. |
| previewUrl | string nullable | No | Provider preview URL when available. |
| downloadUrl | string nullable | No | Temporary or provider-controlled download URL when available. |
| searchable | boolean | Yes | Whether the document may appear in search. |
| indexed | boolean | Yes | Whether the current version has an index record marked ready. |
| aiVisible | boolean | Yes | Whether future AI retrieval may consider this document after permission checks. |
| retentionPolicy | string nullable | No | Retention policy key. |
| retentionUntil | date nullable | No | Earliest deletion/archive eligibility date. |
| checksum | string nullable | No | Current content checksum when provider or extraction process supplies one. |
| checksumAlgorithm | string nullable | No | Algorithm for checksum, such as sha256. |
| sensitivity | enum nullable | No | Public, internal, confidential, restricted, or customer-confidential. |
| classification | string nullable | No | Enterprise classification label. |
| externalRevision | string nullable | No | Provider revision or etag. |
| syncStatus | enum | Yes | Synced, pending, failed, conflict, deleted_external. |
| lastSyncedAt | timestamp nullable | No | Last provider reconciliation timestamp. |
| createdBy | UUID | Yes | User that created metadata. |
| modifiedBy | UUID nullable | No | User that last changed metadata. |
| archivedAt | timestamp nullable | No | Archive timestamp. |
| deletedAt | timestamp nullable | No | Soft-delete timestamp. |

### DocumentVersion Fields

| Field | Description |
| --- | --- |
| id | Stable PM Platform version identifier. |
| documentId | Parent document. |
| versionLabel | Human-readable version label. |
| providerVersionId | Provider-native version or revision id. |
| providerDocumentId | Provider-native document id at the time of version capture. |
| title | Title at version capture. |
| status | Version lifecycle state. |
| checksum | Version checksum when available. |
| mimeType | Version MIME type. |
| sizeBytes | Version size. |
| createdDate | PM Platform version record creation date. |
| providerModifiedDate | Provider modified timestamp for that version. |
| createdBy | User that registered the version. |
| changeSummary | Optional human-readable change summary. |
| supersedesVersionId | Previous version superseded by this version. |

## Project Folder Blueprint

The default folder hierarchy is a configurable blueprint applied when a
project knowledge workspace is created. The blueprint is versioned so future
projects can adopt new structures without mutating historical projects unless
an administrator explicitly applies a migration plan.

```text
Project Knowledge Workspace
├── 01 Business
│   ├── Statement of Work
│   ├── Business Case
│   ├── Proposal
│   └── Requirements
├── 02 Architecture
│   ├── HLD
│   ├── LLD
│   ├── Architecture Decisions
│   └── Deployment Diagram
├── 03 Delivery
│   ├── Sprint Plans
│   ├── Delivery Plan
│   ├── RAID Inputs
│   └── Decision Log
├── 04 Testing
│   ├── Test Strategy
│   ├── Test Cases
│   ├── Test Evidence
│   └── UAT
├── 05 Release
│   ├── Release Notes
│   ├── Release Checklist
│   ├── Deployment Plan
│   └── Rollback
└── 06 Operations
    ├── Runbooks
    ├── Knowledge Transfer
    ├── Support Guides
    └── Service Transition
```

### Blueprint Rules

- Folder codes are display order hints, not business identifiers.
- Each folder can define allowed categories, suggested templates, default
  permissions, and AI visibility defaults.
- Organizations can create additional folders such as Commercial, Legal,
  Security, Data, Vendor, or Customer.
- Folders may map to provider folders but remain PM Platform metadata first.
- Blueprint changes require explicit versioning and administrator approval.

## Storage Provider Abstraction

The provider interface is a contract only. Implementations must live outside
the domain layer.

```ts
interface KnowledgeStorageProvider {
  authenticate(input: AuthenticateProviderRequest): Promise<ProviderAuthResult>;
  createWorkspace(input: CreateProviderWorkspaceRequest): Promise<ProviderWorkspaceRef>;
  createProject(input: CreateProviderProjectRequest): Promise<ProviderProjectRef>;
  createFolder(input: CreateProviderFolderRequest): Promise<ProviderFolderRef>;
  upload(input: UploadDocumentRequest): Promise<ProviderDocumentRef>;
  download(input: DownloadDocumentRequest): Promise<ProviderDownloadRef>;
  preview(input: PreviewDocumentRequest): Promise<ProviderPreviewRef>;
  move(input: MoveDocumentRequest): Promise<ProviderDocumentRef>;
  copy(input: CopyDocumentRequest): Promise<ProviderDocumentRef>;
  delete(input: DeleteDocumentRequest): Promise<ProviderDeleteResult>;
  share(input: ShareDocumentRequest): Promise<ProviderShareResult>;
  search(input: ProviderSearchRequest): Promise<ProviderSearchResult>;
  getMetadata(input: ProviderMetadataRequest): Promise<ProviderMetadata>;
  list(input: ProviderListRequest): Promise<ProviderListResult>;
  refreshToken(input: RefreshProviderTokenRequest): Promise<ProviderAuthResult>;
  disconnect(input: DisconnectProviderRequest): Promise<ProviderDisconnectResult>;
}
```

### Provider Capability Model

Each provider declares support for:

- Workspace creation.
- Folder creation.
- Upload and download.
- Native preview.
- Copy and move.
- Soft delete and hard delete.
- Provider search.
- Provider-native sharing.
- Version metadata.
- Checksums or etags.
- Token refresh.
- Webhook or change notification support.

Unsupported operations must fail explicitly with a provider capability error.

## Document Lifecycle

### States

| Status | Meaning |
| --- | --- |
| Draft | Document is being prepared and is not approved for delivery use. |
| In Review | Document has been submitted for review or approval. |
| Approved | Document is accepted as the current authoritative version. |
| Rejected | Document failed review and requires changes or replacement. |
| Superseded | Document version is no longer current because a newer approved version exists. |
| Archived | Document is retained for historical purposes and hidden from normal active views. |

### Transitions

```text
Draft -> In Review
Draft -> Archived
In Review -> Approved
In Review -> Rejected
Rejected -> Draft
Approved -> Superseded
Approved -> Archived
Superseded -> Archived
Archived -> Draft only through explicit restore policy
```

### Lifecycle Rules

- Only Approved documents are authoritative by default.
- Rejected documents are not AI-visible unless explicitly allowed for review
  analysis.
- Superseded documents remain available for version comparison and audit.
- Archived documents are hidden from active workspace views but retained until
  retention policy allows disposal.
- Provider deletion does not automatically delete metadata without a
  reconciliation decision.

## Permission Model

Document access is the intersection of platform role permissions, project
membership, document-level permissions, lifecycle policy, and provider access.

### Permission Actions

| Action | Description |
| --- | --- |
| document.read | View metadata and open provider URL when provider allows. |
| document.preview | Request provider preview. |
| document.download | Download provider-hosted content. |
| document.create | Create document metadata and provider object. |
| document.update | Edit document metadata. |
| document.uploadVersion | Register or upload a new version. |
| document.review | Move documents into or out of review. |
| document.approve | Approve or reject documents. |
| document.archive | Archive documents. |
| document.delete | Delete metadata or request provider delete. |
| document.share | Change PM Platform sharing metadata or provider share when supported. |
| document.managePermissions | Manage document-level permission records. |
| document.manageTemplates | Create and maintain document templates. |
| document.manageProviderConnection | Configure storage provider connection metadata. |
| document.search | Search permitted documents. |
| document.aiRead | Allow future AI retrieval after policy checks. |

### Role Defaults

| Role | Default Permissions |
| --- | --- |
| Project Manager | read, preview, create, update, uploadVersion, review, approve, archive, search, aiRead for permitted documents. |
| Architect | read, preview, create, update, uploadVersion, review, search, aiRead for architecture and delivery documents. |
| Developer | read, preview, create, update own drafts, uploadVersion own drafts, search for permitted delivery and architecture documents. |
| Tester | read, preview, create and update testing documents, uploadVersion testing documents, review testing artifacts, search. |
| Customer | read and preview explicitly shared approved documents; no default AI visibility grant. |
| Executive | read, preview, search approved portfolio-relevant documents; no update by default. |
| Administrator | manage provider connections, templates, permissions, categories, retention metadata, and all document lifecycle operations. |

### DocumentPermission Scopes

Document permissions may target:

- User.
- Project role.
- Platform role.
- Project team.
- Customer organization.
- Workspace.
- Folder.
- Document.

More specific permissions override inherited defaults only within approved
security policy. Deny rules take precedence over allow rules.

## Search Architecture

### Metadata Search

Metadata search is served from PM Platform metadata. It supports filtering by:

- Project.
- Workspace.
- Folder.
- Category.
- Tags.
- Status.
- Owner.
- Provider.
- Modified date.
- Approval state.
- Searchable flag.
- AI visibility flag for future AI planning surfaces.

Metadata search is responsible for permission filtering before returning
results.

### Provider Search

Provider search delegates to external provider APIs when a provider connection
supports search. It is useful for provider-native text search, provider
ownership, native document title discovery, and reconciliation.

Provider search results must be normalized into provider result references and
must not bypass PM Platform permission checks when results are shown inside PM
Platform.

### Future AI Semantic Search

Future semantic search uses KnowledgeIndex records and a separate AI retrieval
layer. It may search extracted text chunks, summaries, embeddings, entities,
and document relationships. Semantic search is not a replacement for metadata
or provider search.

Semantic search must filter by:

- User permissions.
- Project context.
- Document status.
- Retention policy.
- Sensitivity.
- `searchable`.
- `indexed`.
- `aiVisible`.

## KnowledgeIndex Architecture

KnowledgeIndex records represent readiness for search and future AI retrieval.
They do not require storing binary files in PostgreSQL.

| Field | Description |
| --- | --- |
| id | Stable index record id. |
| documentId | Indexed document. |
| documentVersionId | Indexed version when version-specific. |
| indexType | metadata, provider, extracted_text, semantic, summary, relationship. |
| status | pending, indexing, ready, stale, failed, disabled. |
| sourceChecksum | Checksum used to detect staleness. |
| sourceModifiedDate | Provider modified date used to detect staleness. |
| indexedAt | Last successful index timestamp. |
| indexLocation | Reference to external index storage when applicable. |
| chunkCount | Number of extracted chunks when applicable. |
| embeddingModel | Future embedding model identifier when applicable. |
| errorCode | Last indexing error code. |
| errorMessage | Last indexing error summary. |

## Future AI Integration

Future AI services consume documents through an AI Knowledge Layer, not through
direct provider SDK calls. The AI Knowledge Layer resolves user intent,
permissions, project context, metadata filters, index state, and retrieval
policy before any document content is used.

Potential future capabilities:

- Summarize HLD.
- Compare LLD versions.
- Generate RAID candidates from a Test Plan.
- Generate Release Checklist from release notes, deployment plan, rollback
  plan, and testing evidence.
- Answer project questions using approved project documents.
- Detect missing documentation against the project folder blueprint.
- Identify stale documents based on provider modified date, lifecycle, and
  expected delivery phase.
- Produce knowledge readiness reports for executives.

### AI Guardrails

- AI retrieval is denied by default unless document policy allows it.
- AI responses must cite document metadata and version references.
- Sensitive, archived, rejected, or external-customer documents require
  explicit policy decisions before use.
- AI may use metadata and index references only after permission filtering.
- Agentic AI must not mutate provider documents or platform metadata without a
  future execution, authorization, and audit ADR.

## Future Roadmap

| Feature | Description | Dependencies | Estimated Complexity |
| --- | --- | --- | --- |
| 1.4.1 Knowledge Domain | Define domain entities, metadata model, lifecycle, categories, tags, permissions, and templates. | ADR-015 | High |
| 1.4.2 Storage Provider Framework | Define provider registry, capability model, connection metadata, and provider interface contracts. | 1.4.1 | High |
| 1.4.3 Google Drive Integration | Implement first provider adapter, authentication, folder/document operations, and reconciliation policy. | 1.4.2, security review | High |
| 1.4.4 Document Workspace | Add project document workspace UX, configurable folder blueprint, and document navigation. | 1.4.1, 1.4.2 | High |
| 1.4.5 Metadata APIs | Add API layer for metadata-only workspace, folder, document, version, category, tag, and permission operations. | 1.4.1 | Medium |
| 1.4.6 Search | Implement metadata search and provider search routing with permission filtering. | 1.4.2, 1.4.5 | Medium |
| 1.4.7 Versioning | Add document version registration, supersession, comparison metadata, and provider revision tracking. | 1.4.5 | Medium |
| 1.4.8 Permissions | Add document-level permission enforcement, inheritance, deny rules, and audit records. | 1.4.1, existing RBAC | High |
| 1.4.9 Templates | Add configurable document templates and folder blueprint template bindings. | 1.4.1, 1.4.4 | Medium |
| 1.4.10 AI Knowledge Layer | Add AI retrieval architecture, KnowledgeIndex usage, semantic search, RAG governance, and AI-visible policy. | 1.4.6, 1.4.7, 1.4.8, AI governance ADR | Very High |

## Implementation Constraints for Later Stages

- All document content remains outside PostgreSQL.
- Provider adapters must not leak provider SDK types into domain models.
- Provider credentials must not be stored as plaintext metadata.
- Search and AI retrieval must be permission-filtered.
- AI execution and provider mutation require a separate ADR.
- Database changes must be additive and separately reviewed when
  implementation begins.

## Architecture References

- [ADR-015 Enterprise Knowledge Platform Architecture](adr/ADR-015-enterprise-knowledge-platform.md)
- [Platform Architecture](PLATFORM_ARCHITECTURE.md)
- [ADR-014 Client Platform Layering](adr/ADR-014-client-platform-layering.md)
