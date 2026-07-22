import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProjectWorkspaceDocuments } from "@/components/projects/project-workspace-documents";

const project = {
  id: "project-1",
  name: "ERP Modernization",
  status: "active",
};

describe("ProjectWorkspaceDocuments", () => {
  it("shows the Google Workspace empty state when not connected", () => {
    const onConnect = vi.fn();

    render(
      <ProjectWorkspaceDocuments
        documents={[]}
        onConnect={onConnect}
        onCreateWorkspace={vi.fn()}
        onRefresh={vi.fn()}
        onSelectFolder={vi.fn()}
        project={project}
        workspace={{
          connection: null,
          folders: [],
          projectFolder: null,
          provider: "Google Drive",
          status: "not_connected",
        }}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Connect Google Workspace" }),
    );

    expect(
      screen.getByRole("heading", {
        name: "Google Workspace is not connected.",
      }),
    ).toBeVisible();
    expect(onConnect).toHaveBeenCalledTimes(1);
  });

  it("renders connection status, folder tree, and accessible document grid", () => {
    const onSelectFolder = vi.fn();

    render(
      <ProjectWorkspaceDocuments
        documents={[
          {
            folderId: "folder-1",
            id: "metadata-1",
            mimeType: "application/pdf",
            modifiedTime: "2026-07-22T09:00:00.000Z",
            name: "Architecture Decision Record.pdf",
            ownerEmail: "owner@example.com",
            providerDocumentId: "doc-1",
            version: "12",
            webUrl: "https://drive.google.com/file/d/doc-1/view",
          },
        ]}
        onConnect={vi.fn()}
        onCreateWorkspace={vi.fn()}
        onRefresh={vi.fn()}
        onSelectFolder={onSelectFolder}
        project={project}
        selectedFolderId="folder-1"
        workspace={{
          connection: {
            connectedAccountEmail: "workspace@example.com",
            driveType: "shared_drive",
            id: "connection-1",
            rootFolderId: "root-folder",
            rootFolderUrl: "https://drive.google.com/drive/folders/root-folder",
            status: "connected",
          },
          folders: [
            {
              id: "folder-1",
              name: "01 Business",
              webUrl: "https://drive.google.com/business",
            },
            {
              id: "folder-2",
              name: "02 Architecture",
              webUrl: "https://drive.google.com/architecture",
            },
          ],
          projectFolder: {
            connectionId: "connection-1",
            folderId: "project-folder",
            folderUrl: "https://drive.google.com/project",
            projectId: "project-1",
            projectName: "ERP Modernization",
            rootFolderId: "root-folder",
          },
          provider: "Google Drive",
          status: "connected",
        }}
      />,
    );

    expect(screen.getByText("workspace@example.com")).toBeInTheDocument();
    expect(screen.getByText("Shared Drive")).toBeInTheDocument();
    expect(
      screen.getByRole("tree", { name: "Project document folders" }),
    ).toBeInTheDocument();

    const table = screen.getByRole("table", {
      name: "Google Drive document metadata",
    });
    expect(within(table).getByRole("columnheader", { name: "Name" })).toBeVisible();
    expect(within(table).getByRole("columnheader", { name: "Open" })).toBeVisible();
    expect(
      screen.getByRole("link", {
        name: "Open Architecture Decision Record.pdf in Google Drive",
      }),
    ).toHaveAttribute("href", "https://drive.google.com/file/d/doc-1/view");

    fireEvent.click(screen.getByRole("treeitem", { name: "Open 02 Architecture folder" }));
    expect(onSelectFolder).toHaveBeenCalledWith(
      expect.objectContaining({ id: "folder-2" }),
    );
  });
});
