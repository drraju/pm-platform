"use client";

import React, { useMemo, useState } from "react";
import { EmptyState, StatusBadge, WorkspaceContent } from "@/components/foundation";
import { AppModal } from "@/components/ui/app-modal";
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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isMoreFiltersOpen, setIsMoreFiltersOpen] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const kpis = useMemo(
    () => [
      ["Total", summary?.totalDocuments ?? documents.length, "neutral"],
      ["Approved", summary?.approved ?? 0, "success"],
      ["Under Review", summary?.underReview ?? 0, "warning"],
      ["Draft", summary?.draft ?? 0, "neutral"],
      ["Overdue", summary?.overdueReviews ?? 0, "critical"],
    ] as const,
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
    setIsAddModalOpen(false);
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

  function closeAddModal() {
    setUrlError(null);
    setIsAddModalOpen(false);
  }

  return (
    <WorkspaceContent aria-label="Project documents">
      <section
        aria-label="Document summary"
        className="grid grid-cols-2 gap-3 md:grid-cols-5"
      >
        {kpis.map(([label, value, tone]) => (
          <div
            className="min-h-[74px] rounded-sm border border-slate-200 bg-white px-3 py-3 shadow-ui-subtle"
            key={label}
          >
            <p className="text-xs font-semibold uppercase text-slate-500">
              {label}
            </p>
            <p
              className={`mt-1 text-2xl font-semibold ${getKpiToneClass(tone)}`}
            >
              {value}
            </p>
          </div>
        ))}
      </section>

      <section
        aria-label="Document workspace toolbar"
        className="rounded-sm border border-slate-200 bg-white shadow-ui-subtle"
      >
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Documents</h2>
            <p className="text-sm text-slate-500">
              {project.name} document links and review metadata.
            </p>
          </div>
          <button
            className="w-fit rounded-sm bg-brand px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-brand/30"
            onClick={() => setIsAddModalOpen(true)}
            type="button"
          >
            Add Document
          </button>
        </div>

        <div className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(220px,1fr)_180px_220px_200px_auto] lg:items-end">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Search
            <input
              className="rounded-sm border border-slate-300 px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-brand/30"
              onChange={(event) => updateFilter("title", event.target.value)}
              placeholder="Title"
              type="search"
              value={filters.title}
            />
          </label>
          <FilterSelect
            label="Status"
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
            label="Type"
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
          <button
            aria-expanded={isMoreFiltersOpen}
            className="rounded-sm border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/30"
            onClick={() => setIsMoreFiltersOpen((current) => !current)}
            type="button"
          >
            More Filters {isMoreFiltersOpen ? "▲" : "▼"}
          </button>
        </div>

        {isMoreFiltersOpen ? (
          <div className="grid gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 md:grid-cols-3 xl:grid-cols-4">
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
              className="self-end rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/30"
              onClick={() => onFiltersChange(createDefaultDocumentFilters())}
              type="button"
            >
              Clear Filters
            </button>
          </div>
        ) : null}

        <div className="border-t border-slate-200">
          {documents.length === 0 ? (
            <div className="min-h-[420px] px-4 py-10">
              <EmptyState
                description="No document links match the current project and filters."
                headingLevel={2}
                title="No documents found."
              />
            </div>
          ) : (
            <DocumentGrid documents={documents} />
          )}
        </div>
      </section>

      <section className="rounded-sm border border-slate-200 bg-white px-4 py-2 shadow-ui-subtle">
        <button
          aria-expanded={isInfoOpen}
          className="flex w-full items-center justify-between gap-3 text-left text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/30"
          onClick={() => setIsInfoOpen((current) => !current)}
          type="button"
        >
          <span>Document Workspace Details</span>
          <span aria-hidden="true">{isInfoOpen ? "▲" : "▼"}</span>
        </button>
        {isInfoOpen ? (
          <div className="mt-3 grid gap-3 border-t border-slate-200 pt-3 text-sm text-slate-600 md:grid-cols-3">
            <MetadataItem label="Authentication" value="Not used" />
            <MetadataItem label="Architecture" value="Metadata only" />
            <MetadataItem label="Linked Documents" value={documents.length} />
            <DocumentBreakdown
              heading="By Storage Provider"
              values={summary?.byStorageProvider}
            />
            <DocumentBreakdown heading="By Category" values={summary?.byCategory} />
          </div>
        ) : null}
      </section>

      {isAddModalOpen ? (
        <AppModal
          description="Add metadata for a provider-independent external document link."
          footer={
            <>
              <button
                className="rounded-sm border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/30"
                onClick={closeAddModal}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-sm bg-brand px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={isSaving}
                form="document-link-form"
                type="submit"
              >
                Add Document Link
              </button>
            </>
          }
          labelledById="document-link-dialog-title"
          onClose={closeAddModal}
          title="Add Document"
          widthClassName="max-w-4xl"
        >
          <DocumentForm
            categories={categories}
            formState={formState}
            handleSubmit={handleSubmit}
            owners={owners}
            storageProviders={storageProviders}
            documentTypes={documentTypes}
            updateField={updateField}
            urlError={urlError}
          />
        </AppModal>
      ) : null}
    </WorkspaceContent>
  );
}

function DocumentForm({
  categories,
  documentTypes,
  formState,
  handleSubmit,
  owners,
  storageProviders,
  updateField,
  urlError,
}: {
  categories: ApiDocumentReference[];
  documentTypes: ApiDocumentReference[];
  formState: DocumentFormState;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  owners: ApiAssignableUser[];
  storageProviders: ApiStorageProviderReference[];
  updateField: <K extends keyof DocumentFormState>(
    field: K,
    value: DocumentFormState[K],
  ) => void;
  urlError: string | null;
}) {
  return (
    <form className="grid gap-4" id="document-link-form" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
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
            onChange={(event) => updateField("externalUrl", event.target.value)}
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
        <SelectField
          label="Storage Provider"
          onChange={(value) =>
            updateField("storageProvider", value as ApiDocumentStorageProvider)
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
            onChange={(event) => updateField("version", event.target.value)}
            type="text"
            value={formState.version}
          />
        </label>
        <SelectField
          label="Approval Status"
          onChange={(value) =>
            updateField("approvalStatus", value as ApiDocumentApprovalStatus)
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
            onChange={(event) => updateField("nextReviewAt", event.target.value)}
            type="date"
            value={formState.nextReviewAt}
          />
        </label>
      </div>
      <label className="grid gap-1 text-sm font-semibold text-slate-700">
        Description
        <textarea
          className="min-h-24 rounded-sm border border-slate-300 px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-brand/30"
          onChange={(event) => updateField("description", event.target.value)}
          value={formState.description}
        />
      </label>
    </form>
  );
}

function DocumentGrid({ documents }: { documents: ApiProjectDocument[] }) {
  return (
    <div className="max-h-[min(64vh,720px)] min-h-[520px] overflow-auto">
      <table className="min-w-[1180px] divide-y divide-slate-200 text-left text-sm">
        <caption className="sr-only">External project document links</caption>
        <thead className="sticky top-0 z-10 bg-slate-50">
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
            <tr className="align-top hover:bg-slate-50/70" key={document.id}>
              <td className="max-w-[280px] px-3 py-3">
                <a
                  aria-label={`Open ${document.title} in a new tab`}
                  className="cursor-pointer rounded-sm font-semibold text-brand underline-offset-2 hover:text-brand-dark hover:underline focus:outline-none focus:ring-2 focus:ring-brand/30"
                  href={document.externalUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                  title="Open document"
                >
                  {document.title}
                </a>
                {document.description ? (
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">
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
                  {formatDate(document.nextReviewAt)}
                </p>
              </td>
              <td className="px-3 py-3 text-xs text-slate-500">
                <p>Created: {document.createdBy?.displayName ?? "System"}</p>
                <p>Updated: {document.updatedBy?.displayName ?? "System"}</p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
    <div>
      <h3 className="text-xs font-semibold uppercase text-slate-500">
        {heading}
      </h3>
      <dl className="mt-2 grid gap-1">
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
  return owner.displayName ?? `${owner.firstName} ${owner.lastName}`.trim() ?? owner.email;
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

function getKpiToneClass(tone: "critical" | "neutral" | "success" | "warning") {
  if (tone === "success") {
    return "text-status-success-strong";
  }
  if (tone === "warning") {
    return "text-status-warning-strong";
  }
  if (tone === "critical") {
    return "text-status-danger";
  }
  return "text-slate-950";
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
