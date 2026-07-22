"use client";

import React, { useMemo, useState } from "react";
import {
  EmptyState,
  StatusBadge,
  SummaryCard,
  WorkspaceContent,
  WorkspaceSection,
} from "@/components/foundation";
import type {
  ApiAssignableUser,
  ApiDocumentApprovalStatus,
  ApiDocumentReference,
  ApiDocumentReviewStatus,
  ApiDocumentStorageProvider,
  ApiProject,
  ApiProjectDocument,
  ApiProjectDocumentSummary,
  ApiStorageProviderReference,
} from "@/lib/api/client";

type DocumentFormState = {
  approvalStatus: ApiDocumentApprovalStatus;
  category: string;
  description: string;
  documentType: string;
  externalUrl: string;
  lastReviewedAt: string;
  nextReviewAt: string;
  ownerId: string;
  storageProvider: ApiDocumentStorageProvider;
  title: string;
  version: string;
};

export type DocumentFilters = {
  approvalStatus: string;
  category: string;
  description: string;
  documentType: string;
  ownerId: string;
  reviewStatus: string;
  sortBy: string;
  sortDirection: "ASC" | "DESC";
  storageProvider: string;
  title: string;
  version: string;
};

type ProjectWorkspaceDocumentsProps = {
  categories: ApiDocumentReference[];
  documents: ApiProjectDocument[];
  documentTypes: ApiDocumentReference[];
  filters: DocumentFilters;
  isSaving?: boolean;
  onCreateDocument: (input: DocumentFormState) => Promise<void> | void;
  onFiltersChange: (filters: DocumentFilters) => void;
  owners: ApiAssignableUser[];
  project: ApiProject;
  storageProviders: ApiStorageProviderReference[];
  summary: ApiProjectDocumentSummary | null;
};

const approvalStatuses: ApiDocumentApprovalStatus[] = [
  "DRAFT",
  "UNDER_REVIEW",
  "APPROVED",
  "SUPERSEDED",
  "ARCHIVED",
];

const reviewStatuses: ApiDocumentReviewStatus[] = [
  "CURRENT",
  "REVIEW_DUE_SOON",
  "OVERDUE",
  "NEVER_REVIEWED",
];

const sortOptions = [
  ["title", "Title"],
  ["version", "Version"],
  ["owner", "Owner"],
  ["createdAt", "Created Date"],
  ["updatedAt", "Updated Date"],
  ["lastReviewedAt", "Last Reviewed"],
  ["nextReviewAt", "Next Review"],
  ["approvalStatus", "Approval Status"],
] as const;

const defaultFilters: DocumentFilters = {
  approvalStatus: "",
  category: "",
  description: "",
  documentType: "",
  ownerId: "",
  reviewStatus: "",
  sortBy: "updatedAt",
  sortDirection: "DESC",
  storageProvider: "",
  title: "",
  version: "",
};

export function createDefaultDocumentFilters(): DocumentFilters {
  return { ...defaultFilters };
}

function initialFormState(
  providers: ApiStorageProviderReference[],
  documentTypes: ApiDocumentReference[],
  categories: ApiDocumentReference[],
): DocumentFormState {
  return {
    approvalStatus: "DRAFT",
    category: categories[0]?.name ?? "Other",
    description: "",
    documentType: documentTypes[0]?.name ?? "Other",
    externalUrl: "",
    lastReviewedAt: "",
    nextReviewAt: "",
    ownerId: "",
    storageProvider: providers[0]?.value ?? "OTHER",
    title: "",
    version: "",
  };
}

export function ProjectWorkspaceDocuments({
  categories,
  documents,
  documentTypes,
  filters,
  isSaving = false,
  onCreateDocument,
  onFiltersChange,
  owners,
  project,
  storageProviders,
  summary,
}: ProjectWorkspaceDocumentsProps) {
  const [formState, setFormState] = useState<DocumentFormState>(() =>
    initialFormState(storageProviders, documentTypes, categories),
  );
  const [urlError, setUrlError] = useState<string | null>(null);

  const summaryCards = useMemo(
    () => [
      ["Total Documents", summary?.totalDocuments ?? documents.length],
      ["Approved", summary?.approved ?? 0],
      ["Draft", summary?.draft ?? 0],
      ["Under Review", summary?.underReview ?? 0],
      ["Overdue Reviews", summary?.overdueReviews ?? 0],
    ],
    [documents.length, summary],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isHttpUrl(formState.externalUrl)) {
      setUrlError("Enter a valid http:// or https:// URL.");
      return;
    }

    setUrlError(null);
    await onCreateDocument(formState);
    setFormState(initialFormState(storageProviders, documentTypes, categories));
  }

  function updateField<K extends keyof DocumentFormState>(
    field: K,
    value: DocumentFormState[K],
  ) {
    setFormState((current) => ({ ...current, [field]: value }));
  }

  function updateFilter<K extends keyof DocumentFilters>(
    field: K,
    value: DocumentFilters[K],
  ) {
    onFiltersChange({ ...filters, [field]: value });
  }

  return (
    <WorkspaceContent aria-label="Project documents">
      <WorkspaceSection
        aria-label="External document summary"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
        padding="none"
      >
        {summaryCards.map(([label, value]) => (
          <SummaryCard headingLevel={2} key={label} title={label}>
            <p className="text-3xl font-semibold text-slate-950">{value}</p>
          </SummaryCard>
        ))}
      </WorkspaceSection>

      <WorkspaceSection
        aria-label="External document link controls"
        className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]"
        padding="none"
      >
        <SummaryCard
          description="Documents are stored as external links only. PM Platform does not authenticate with external repositories."
          headingLevel={2}
          title="External Document Links"
        >
          <dl className="grid gap-4 sm:grid-cols-2">
            <MetadataItem label="Project" value={project.name} />
            <MetadataItem label="Linked Documents" value={documents.length} />
            <MetadataItem
              label="Authentication"
              value="Not used for external storage"
            />
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-500">
                Architecture
              </dt>
              <dd className="mt-1">
                <StatusBadge dot tone="success">
                  Metadata only
                </StatusBadge>
              </dd>
            </div>
          </dl>
          <DocumentBreakdown
            heading="By Storage Provider"
            values={summary?.byStorageProvider}
          />
          <DocumentBreakdown heading="By Category" values={summary?.byCategory} />
        </SummaryCard>

        <SummaryCard headingLevel={2} title="Add Document Link">
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Title
              <input
                className="rounded-sm border border-slate-300 px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-brand/30"
                onChange={(event) => updateField("title", event.target.value)}
                required
                type="text"
                value={formState.title}
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              External URL
              <input
                aria-describedby={urlError ? "document-url-error" : undefined}
                className="rounded-sm border border-slate-300 px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-brand/30"
                onChange={(event) =>
                  updateField("externalUrl", event.target.value)
                }
                pattern="https?://.*"
                required
                type="url"
                value={formState.externalUrl}
              />
              {urlError ? (
                <span
                  className="text-xs font-normal text-red-700"
                  id="document-url-error"
                >
                  {urlError}
                </span>
              ) : null}
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Storage Provider"
                onChange={(value) =>
                  updateField(
                    "storageProvider",
                    value as ApiDocumentStorageProvider,
                  )
                }
                value={formState.storageProvider}
              >
                {storageProviders.map((provider) => (
                  <option key={provider.value} value={provider.value}>
                    {provider.label}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Document Type"
                onChange={(value) => updateField("documentType", value)}
                value={formState.documentType}
              >
                {documentTypes.map((documentType) => (
                  <option key={documentType.id} value={documentType.name}>
                    {documentType.name}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Category"
                onChange={(value) => updateField("category", value)}
                value={formState.category}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Owner"
                onChange={(value) => updateField("ownerId", value)}
                value={formState.ownerId}
              >
                <option value="">Unassigned</option>
                {owners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {formatOwner(owner)}
                  </option>
                ))}
              </SelectField>
              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                Version
                <input
                  className="rounded-sm border border-slate-300 px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-brand/30"
                  onChange={(event) =>
                    updateField("version", event.target.value)
                  }
                  type="text"
                  value={formState.version}
                />
              </label>
              <SelectField
                label="Approval Status"
                onChange={(value) =>
                  updateField(
                    "approvalStatus",
                    value as ApiDocumentApprovalStatus,
                  )
                }
                value={formState.approvalStatus}
              >
                {approvalStatuses.map((status) => (
                  <option key={status} value={status}>
                    {formatLabel(status)}
                  </option>
                ))}
              </SelectField>
              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                Last Reviewed
                <input
                  className="rounded-sm border border-slate-300 px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-brand/30"
                  onChange={(event) =>
                    updateField("lastReviewedAt", event.target.value)
                  }
                  type="date"
                  value={formState.lastReviewedAt}
                />
              </label>
              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                Next Review
                <input
                  className="rounded-sm border border-slate-300 px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-brand/30"
                  onChange={(event) =>
                    updateField("nextReviewAt", event.target.value)
                  }
                  type="date"
                  value={formState.nextReviewAt}
                />
              </label>
            </div>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Description
              <textarea
                className="min-h-24 rounded-sm border border-slate-300 px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-brand/30"
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                value={formState.description}
              />
            </label>
            <button
              className="w-fit rounded-sm bg-brand px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isSaving}
              type="submit"
            >
              Add Document Link
            </button>
          </form>
        </SummaryCard>
      </WorkspaceSection>

      <WorkspaceSection aria-label="Document filters" padding="none">
        <SummaryCard headingLevel={2} title="Filters">
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Search Title
              <input
                className="rounded-sm border border-slate-300 px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-brand/30"
                onChange={(event) => updateFilter("title", event.target.value)}
                type="search"
                value={filters.title}
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Search Description
              <input
                className="rounded-sm border border-slate-300 px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-brand/30"
                onChange={(event) =>
                  updateFilter("description", event.target.value)
                }
                type="search"
                value={filters.description}
              />
            </label>
            <FilterSelect
              label="Storage Provider"
              onChange={(value) => updateFilter("storageProvider", value)}
              value={filters.storageProvider}
            >
              {storageProviders.map((provider) => (
                <option key={provider.value} value={provider.value}>
                  {provider.label}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              label="Approval Status"
              onChange={(value) => updateFilter("approvalStatus", value)}
              value={filters.approvalStatus}
            >
              {approvalStatuses.map((status) => (
                <option key={status} value={status}>
                  {formatLabel(status)}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              label="Document Type"
              onChange={(value) => updateFilter("documentType", value)}
              value={filters.documentType}
            >
              {documentTypes.map((documentType) => (
                <option key={documentType.id} value={documentType.name}>
                  {documentType.name}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              label="Category"
              onChange={(value) => updateFilter("category", value)}
              value={filters.category}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              label="Owner"
              onChange={(value) => updateFilter("ownerId", value)}
              value={filters.ownerId}
            >
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {formatOwner(owner)}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              label="Review Status"
              onChange={(value) => updateFilter("reviewStatus", value)}
              value={filters.reviewStatus}
            >
              {reviewStatuses.map((status) => (
                <option key={status} value={status}>
                  {formatLabel(status)}
                </option>
              ))}
            </FilterSelect>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Version
              <input
                className="rounded-sm border border-slate-300 px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-brand/30"
                onChange={(event) =>
                  updateFilter("version", event.target.value)
                }
                type="text"
                value={filters.version}
              />
            </label>
            <SelectField
              label="Sort By"
              onChange={(value) => updateFilter("sortBy", value)}
              value={filters.sortBy}
            >
              {sortOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Direction"
              onChange={(value) =>
                updateFilter("sortDirection", value as "ASC" | "DESC")
              }
              value={filters.sortDirection}
            >
              <option value="ASC">Ascending</option>
              <option value="DESC">Descending</option>
            </SelectField>
            <button
              className="self-end rounded-sm border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/30"
              onClick={() => onFiltersChange(createDefaultDocumentFilters())}
              type="button"
            >
              Clear Filters
            </button>
          </div>
        </SummaryCard>
      </WorkspaceSection>

      <WorkspaceSection aria-label="Project document grid" padding="none">
        {documents.length === 0 ? (
          <EmptyState
            description="No document links match the current project and filters."
            headingLevel={2}
            title="No documents found."
          />
        ) : (
          <DocumentGrid documents={documents} />
        )}
      </WorkspaceSection>
    </WorkspaceContent>
  );
}

function DocumentGrid({ documents }: { documents: ApiProjectDocument[] }) {
  return (
    <SummaryCard headingLevel={2} title="Document Grid">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <caption className="sr-only">External project document links</caption>
          <thead>
            <tr>
              {[
                "Title",
                "Category",
                "Type",
                "Owner",
                "Provider",
                "Version",
                "Approval",
                "Review",
                "Audit",
                "Open",
              ].map((heading) => (
                <th
                  className="px-3 py-2 font-semibold text-slate-600"
                  key={heading}
                  scope="col"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {documents.map((document) => (
              <tr key={document.id}>
                <td className="px-3 py-3">
                  <p className="font-semibold text-slate-950">
                    {document.title}
                  </p>
                  {document.description ? (
                    <p className="mt-1 max-w-md text-xs text-slate-500">
                      {document.description}
                    </p>
                  ) : null}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {document.category ?? "Uncategorized"}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {document.documentType}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {document.owner?.displayName ?? "Unassigned"}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {document.storageProviderLabel}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {document.version ?? "Unavailable"}
                </td>
                <td className="px-3 py-3">
                  <StatusBadge tone={approvalTone(document.approvalStatus)}>
                    {formatLabel(document.approvalStatus)}
                  </StatusBadge>
                </td>
                <td className="px-3 py-3">
                  <StatusBadge tone={reviewTone(document.reviewStatus)}>
                    {formatLabel(document.reviewStatus)}
                  </StatusBadge>
                  <p className="mt-1 text-xs text-slate-500">
                    Next: {formatDate(document.nextReviewAt)}
                  </p>
                </td>
                <td className="px-3 py-3 text-xs text-slate-500">
                  <p>Created By: {document.createdBy?.displayName ?? "System"}</p>
                  <p>
                    Last Updated By:{" "}
                    {document.updatedBy?.displayName ?? "System"}
                  </p>
                </td>
                <td className="px-3 py-3">
                  <a
                    aria-label={`Open ${document.title} in a new tab`}
                    className="rounded-sm font-semibold text-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                    href={document.externalUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Open
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SummaryCard>
  );
}

function DocumentBreakdown({
  heading,
  values,
}: {
  heading: string;
  values?: Record<string, number>;
}) {
  const entries = Object.entries(values ?? {});
  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="mt-5">
      <h3 className="text-xs font-semibold uppercase text-slate-500">
        {heading}
      </h3>
      <dl className="mt-2 grid gap-2">
        {entries.map(([label, value]) => (
          <div className="flex justify-between gap-4 text-sm" key={label}>
            <dt className="text-slate-600">{label}</dt>
            <dd className="font-semibold text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function FilterSelect({
  children,
  label,
  onChange,
  value,
}: {
  children: React.ReactNode;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <SelectField label={label} onChange={onChange} value={value}>
      <option value="">All</option>
      {children}
    </SelectField>
  );
}

function SelectField({
  children,
  label,
  onChange,
  value,
}: {
  children: React.ReactNode;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      {label}
      <select
        className="rounded-sm border border-slate-300 px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-brand/30"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {children}
      </select>
    </label>
  );
}

function MetadataItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-slate-900">
        {value}
      </dd>
    </div>
  );
}

function formatLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatOwner(owner: ApiAssignableUser) {
  return (
    owner.displayName ??
    `${owner.firstName} ${owner.lastName}`.trim() ??
    owner.email
  );
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Not scheduled";
  }
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function approvalTone(status: ApiDocumentApprovalStatus) {
  if (status === "APPROVED") {
    return "success";
  }
  if (status === "UNDER_REVIEW" || status === "DRAFT") {
    return "warning";
  }
  return "neutral";
}

function reviewTone(status: ApiDocumentReviewStatus) {
  if (status === "CURRENT") {
    return "success";
  }
  if (status === "REVIEW_DUE_SOON" || status === "NEVER_REVIEWED") {
    return "warning";
  }
  return "critical";
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
