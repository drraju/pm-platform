import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  createDefaultDocumentFilters,
  ProjectWorkspaceDocuments,
} from "@/components/projects/project-workspace-documents";

const project = {
  id: "project-1",
  name: "ERP Modernization",
  status: "active",
};

const storageProviders = [
  { label: "Confluence", value: "CONFLUENCE" as const },
  { label: "Other", value: "OTHER" as const },
];

const documentTypes = [
  { id: "type-1", name: "Architecture Diagram" },
  { id: "type-2", name: "Other" },
];

const categories = [
  { id: "category-1", name: "Architecture" },
  { id: "category-2", name: "Other" },
];

const owners = [
  {
    displayName: "Avery Owner",
    email: "avery@example.com",
    firstName: "Avery",
    id: "user-1",
    lastName: "Owner",
  },
];

const summary = {
  approved: 1,
  byCategory: { Architecture: 1 },
  byStorageProvider: { Confluence: 1 },
  draft: 0,
  overdueReviews: 0,
  totalDocuments: 1,
  underReview: 0,
};

const sampleDocument = {
  approvalStatus: "APPROVED" as const,
  category: "Architecture",
  categoryId: "category-1",
  createdBy: {
    displayName: "Casey Creator",
    email: "casey@example.com",
    id: "user-2",
  },
  createdById: "user-2",
  description: "Approved platform decision.",
  documentType: "Architecture Diagram",
  documentTypeId: "type-1",
  externalUrl: "https://example.com/adr-015",
  id: "document-1",
  linkStatus: "UNKNOWN" as const,
  nextReviewAt: "2099-07-01T00:00:00.000Z",
  owner: {
    displayName: "Avery Owner",
    email: "avery@example.com",
    id: "user-1",
  },
  ownerId: "user-1",
  projectId: "project-1",
  reviewStatus: "CURRENT" as const,
  storageProvider: "CONFLUENCE" as const,
  storageProviderLabel: "Confluence",
  title: "ADR-015",
  updatedBy: null,
  version: "1.0",
};

describe("ProjectWorkspaceDocuments", () => {
  it("renders the compact working view with collapsed details and add modal entry", () => {
    render(
      <ProjectWorkspaceDocuments
        canUploadDocuments
        categories={categories}
        documents={[]}
        documentTypes={documentTypes}
        filters={createDefaultDocumentFilters()}
        onCreateDocument={vi.fn()}
        onFiltersChange={vi.fn()}
        owners={owners}
        project={project}
        storageProviders={storageProviders}
        summary={{ ...summary, totalDocuments: 0 }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Documents" })).toBeVisible();
    const summaryRegion = screen.getByLabelText("Document summary");
    expect(within(summaryRegion).getByText("Total")).toBeVisible();
    expect(within(summaryRegion).getByText("Under Review")).toBeVisible();
    expect(screen.queryByText("Metadata only")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "More Filters ▼" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.getByRole("heading", { name: "No documents found." }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /connect/i }),
    ).not.toBeInTheDocument();
  });

  it("creates document links and opens external URLs securely", async () => {
    const onCreateDocument = vi.fn();

    render(
      <ProjectWorkspaceDocuments
        canUploadDocuments
        categories={categories}
        documents={[sampleDocument]}
        documentTypes={documentTypes}
        filters={createDefaultDocumentFilters()}
        onCreateDocument={onCreateDocument}
        onFiltersChange={vi.fn()}
        owners={owners}
        project={project}
        storageProviders={storageProviders}
        summary={summary}
      />,
    );

    const table = screen.getByRole("table", {
      name: "External project document links",
    });
    expect(
      within(table).getByRole("columnheader", { name: "Owner" }),
    ).toBeVisible();
    const link = screen.getByRole("link", {
      name: "Open ADR-015 in a new tab",
    });
    expect(link).toHaveAttribute("href", "https://example.com/adr-015");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");

    fireEvent.click(screen.getByRole("button", { name: "Add Document" }));
    const dialog = screen.getByRole("dialog", { name: "Add Document" });
    fireEvent.change(within(dialog).getByLabelText("Title"), {
      target: { value: "Delivery Plan" },
    });
    fireEvent.change(within(dialog).getByLabelText("External URL"), {
      target: { value: "https://example.com/delivery-plan" },
    });
    fireEvent.change(within(dialog).getByLabelText("Owner"), {
      target: { value: "user-1" },
    });
    const form = dialog.querySelector("#document-link-form");
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);

    await waitFor(() => {
      expect(onCreateDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          documentType: "Architecture Diagram",
          externalUrl: "https://example.com/delivery-plan",
          ownerId: "user-1",
          storageProvider: "CONFLUENCE",
          title: "Delivery Plan",
        }),
      );
    });
  });

  it("rejects non-http URLs before submission", () => {
    const onCreateDocument = vi.fn();

    render(
      <ProjectWorkspaceDocuments
        canUploadDocuments
        categories={categories}
        documents={[]}
        documentTypes={documentTypes}
        filters={createDefaultDocumentFilters()}
        onCreateDocument={onCreateDocument}
        onFiltersChange={vi.fn()}
        owners={owners}
        project={project}
        storageProviders={storageProviders}
        summary={summary}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add Document" }));
    const dialog = screen.getByRole("dialog", { name: "Add Document" });
    fireEvent.change(within(dialog).getByLabelText("Title"), {
      target: { value: "Unsafe Link" },
    });
    fireEvent.change(within(dialog).getByLabelText("External URL"), {
      target: { value: "javascript:alert(1)" },
    });
    const form = dialog.querySelector("#document-link-form");
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);

    expect(
      within(dialog).getByText("Enter a valid http:// or https:// URL."),
    ).toBeVisible();
    expect(onCreateDocument).not.toHaveBeenCalled();
  });

  it("edits document metadata through the shared metadata editor", async () => {
    const onUpdateDocument = vi.fn();

    render(
      <ProjectWorkspaceDocuments
        canApproveDocuments
        canEditDocument={() => true}
        canUploadDocuments
        categories={[...categories, { id: "category-3", name: "Business" }]}
        documents={[
          {
            ...sampleDocument,
            approvalStatus: "UNDER_REVIEW",
            documentType: "Other",
          },
        ]}
        documentTypes={[...documentTypes, { id: "type-3", name: "HLD" }]}
        filters={createDefaultDocumentFilters()}
        onCreateDocument={vi.fn()}
        onFiltersChange={vi.fn()}
        onUpdateDocument={onUpdateDocument}
        owners={owners}
        project={project}
        storageProviders={storageProviders}
        summary={summary}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    const dialog = screen.getByRole("dialog", {
      name: "Edit Document Metadata",
    });
    fireEvent.change(within(dialog).getByLabelText("Category"), {
      target: { value: "Business" },
    });
    fireEvent.change(within(dialog).getByLabelText("Document Type"), {
      target: { value: "HLD" },
    });
    fireEvent.change(within(dialog).getByLabelText("Approval Status"), {
      target: { value: "APPROVED" },
    });
    const form = dialog.querySelector("#document-link-form");
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);

    await waitFor(() => {
      expect(onUpdateDocument).toHaveBeenCalledWith(
        "document-1",
        expect.objectContaining({
          approvalStatus: "APPROVED",
          category: "Business",
          documentType: "HLD",
          title: "ADR-015",
        }),
      );
    });
  });

  it("hides metadata edit actions when the user cannot edit documents", () => {
    render(
      <ProjectWorkspaceDocuments
        canEditDocument={() => false}
        canUploadDocuments={false}
        categories={categories}
        documents={[sampleDocument]}
        documentTypes={documentTypes}
        filters={createDefaultDocumentFilters()}
        onCreateDocument={vi.fn()}
        onFiltersChange={vi.fn()}
        owners={owners}
        project={project}
        storageProviders={storageProviders}
        summary={summary}
      />,
    );

    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Document" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Actions" }),
    ).not.toBeInTheDocument();
  });
});
