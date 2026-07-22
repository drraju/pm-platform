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

describe("ProjectWorkspaceDocuments", () => {
  it("renders the metadata-only empty state and enterprise summary controls", () => {
    render(
      <ProjectWorkspaceDocuments
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

    expect(
      screen.getByRole("heading", { name: "External Document Links" }),
    ).toBeVisible();
    expect(screen.getByText("Metadata only")).toBeVisible();
    expect(screen.getByText("Total Documents")).toBeVisible();
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
        categories={categories}
        documents={[
          {
            approvalStatus: "APPROVED",
            category: "Architecture",
            categoryId: "category-1",
            createdBy: { displayName: "Casey Creator", email: "casey@example.com", id: "user-2" },
            description: "Approved platform decision.",
            documentType: "Architecture Diagram",
            documentTypeId: "type-1",
            externalUrl: "https://example.com/adr-015",
            id: "document-1",
            linkStatus: "UNKNOWN",
            nextReviewAt: "2099-07-01T00:00:00.000Z",
            owner: { displayName: "Avery Owner", email: "avery@example.com", id: "user-1" },
            ownerId: "user-1",
            projectId: "project-1",
            reviewStatus: "CURRENT",
            storageProvider: "CONFLUENCE",
            storageProviderLabel: "Confluence",
            title: "ADR-015",
            updatedBy: null,
            version: "1.0",
          },
        ]}
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

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Delivery Plan" },
    });
    fireEvent.change(screen.getByLabelText("External URL"), {
      target: { value: "https://example.com/delivery-plan" },
    });
    fireEvent.change(screen.getAllByLabelText("Owner")[0], {
      target: { value: "user-1" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Add Document Link" }));

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

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Unsafe Link" },
    });
    fireEvent.change(screen.getByLabelText("External URL"), {
      target: { value: "javascript:alert(1)" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Add Document Link" }));

    expect(screen.getByText("Enter a valid http:// or https:// URL.")).toBeVisible();
    expect(onCreateDocument).not.toHaveBeenCalled();
  });
});
