"use client";

import React, { useEffect, useMemo } from "react";
import {
  EmptyState,
  StatusBadge,
  SummaryCard,
  WorkspaceContent,
  WorkspaceSection,
} from "@/components/foundation";
import type {
  ApiGoogleDocumentFolder,
  ApiGoogleDocumentMetadata,
  ApiProject,
  ApiProjectDocumentWorkspace,
} from "@/lib/api/client";

const fallbackFolders: ApiGoogleDocumentFolder[] = [
  { id: "01 Business", name: "01 Business", webUrl: "" },
  { id: "02 Architecture", name: "02 Architecture", webUrl: "" },
  { id: "03 Delivery", name: "03 Delivery", webUrl: "" },
  { id: "04 Release", name: "04 Release", webUrl: "" },
  { id: "05 Operations", name: "05 Operations", webUrl: "" },
];

type ProjectWorkspaceDocumentsProps = {
  documents: ApiGoogleDocumentMetadata[];
  isRefreshing?: boolean;
  onConnect: () => void;
  onCreateWorkspace: () => void;
  onRefresh: () => void;
  onSelectFolder: (folder: ApiGoogleDocumentFolder) => void;
  project: ApiProject;
  selectedFolderId?: string | null;
  workspace: ApiProjectDocumentWorkspace;
};

export function ProjectWorkspaceDocuments({
  documents,
  isRefreshing = false,
  onConnect,
  onCreateWorkspace,
  onRefresh,
  onSelectFolder,
  project,
  selectedFolderId,
  workspace,
}: ProjectWorkspaceDocumentsProps) {
  const isConnected = Boolean(workspace.connection);
  const folders = workspace.folders.length > 0 ? workspace.folders : fallbackFolders;
  const selectedFolder = useMemo(
    () =>
      folders.find((folder) => folder.id === selectedFolderId) ??
      folders[0] ??
      null,
    [folders, selectedFolderId],
  );
  const hasProjectFolder = Boolean(workspace.projectFolder);

  useEffect(() => {
    if (isConnected && selectedFolder && workspace.folders.length > 0) {
      onSelectFolder(selectedFolder);
    }
  }, [isConnected, onSelectFolder, selectedFolder, workspace.folders.length]);

  if (!isConnected) {
    return (
      <WorkspaceContent aria-label="Project documents">
        <EmptyState
          action={
            <button
              className="rounded-sm bg-brand px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-brand/30"
              onClick={onConnect}
              type="button"
            >
              Connect Google Workspace
            </button>
          }
          description="Connect the project to Google Workspace to view Drive folders and document metadata."
          headingLevel={2}
          title="Google Workspace is not connected."
        />
      </WorkspaceContent>
    );
  }

  return (
    <WorkspaceContent aria-label="Project documents">
      <WorkspaceSection
        aria-label="Google Workspace connection"
        className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]"
        padding="none"
      >
        <ConnectionStatusCard
          onCreateWorkspace={onCreateWorkspace}
          onRefresh={onRefresh}
          project={project}
          workspace={workspace}
        />
        <FolderTree
          disabled={!hasProjectFolder || workspace.folders.length === 0}
          folders={folders}
          onSelectFolder={onSelectFolder}
          selectedFolderId={selectedFolder?.id}
        />
      </WorkspaceSection>

      <WorkspaceSection aria-label="Project document grid" padding="none">
        {!hasProjectFolder ? (
          <EmptyState
            action={
              <button
                className="rounded-sm bg-brand px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-brand/30"
                onClick={onCreateWorkspace}
                type="button"
              >
                Create Project Workspace
              </button>
            }
            description={`${project.name} does not have a Google Drive project folder yet.`}
            headingLevel={2}
            title="Project folder not created"
          />
        ) : documents.length === 0 ? (
          <EmptyState
            action={
              <div className="flex flex-wrap justify-center gap-3">
                {workspace.projectFolder?.folderUrl ? (
                  <a
                    className="rounded-sm border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/30"
                    href={workspace.projectFolder.folderUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open Google Drive
                  </a>
                ) : null}
                <button
                  className="rounded-sm bg-brand px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:cursor-not-allowed disabled:bg-slate-300"
                  disabled={isRefreshing}
                  onClick={onRefresh}
                  type="button"
                >
                  Refresh Metadata
                </button>
              </div>
            }
            description="No documents found."
            headingLevel={2}
            title="No documents found."
          />
        ) : (
          <DocumentGrid documents={documents} isRefreshing={isRefreshing} />
        )}
      </WorkspaceSection>
    </WorkspaceContent>
  );
}

function ConnectionStatusCard({
  onCreateWorkspace,
  onRefresh,
  project,
  workspace,
}: Pick<
  ProjectWorkspaceDocumentsProps,
  "onCreateWorkspace" | "onRefresh" | "project" | "workspace"
>) {
  const connection = workspace.connection;

  return (
    <SummaryCard
      action={
        <button
          aria-label="Refresh Google Drive metadata"
          className="rounded-sm border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/30"
          onClick={onRefresh}
          type="button"
        >
          Refresh Metadata
        </button>
      }
      headingLevel={2}
      title="Connection Status"
    >
      <dl className="grid gap-4 sm:grid-cols-2">
        <StatusItem label="Provider" value={workspace.provider} />
        <StatusItem
          label="Google Workspace Account"
          value={connection?.connectedAccountEmail ?? "Not connected"}
        />
        <StatusItem label="Drive Type" value={formatDriveType(connection?.driveType)} />
        <div>
          <dt className="text-xs font-semibold uppercase text-slate-500">
            Connection Status
          </dt>
          <dd className="mt-1">
            <StatusBadge
              dot
              tone={connection?.status === "connected" ? "success" : "warning"}
            >
              {formatLabel(connection?.status ?? workspace.status)}
            </StatusBadge>
          </dd>
        </div>
        <StatusItem
          label="Root Folder"
          value={connection?.rootFolderId ? "PM Platform" : "Not created"}
        />
        <StatusItem
          label="Project Folder"
          value={workspace.projectFolder?.projectName ?? project.name}
        />
      </dl>
      <div className="mt-4 flex flex-wrap gap-3">
        {connection?.rootFolderUrl ? (
          <a
            className="rounded-sm border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/30"
            href={connection.rootFolderUrl}
            rel="noreferrer"
            target="_blank"
          >
            Open in Google Drive
          </a>
        ) : null}
        {!workspace.projectFolder ? (
          <button
            className="rounded-sm bg-brand px-3 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-brand/30"
            onClick={onCreateWorkspace}
            type="button"
          >
            Create Project Workspace
          </button>
        ) : null}
      </div>
    </SummaryCard>
  );
}

function FolderTree({
  disabled,
  folders,
  onSelectFolder,
  selectedFolderId,
}: {
  disabled: boolean;
  folders: ApiGoogleDocumentFolder[];
  onSelectFolder: (folder: ApiGoogleDocumentFolder) => void;
  selectedFolderId?: string;
}) {
  return (
    <SummaryCard headingLevel={2} title="Folder Tree">
      <div aria-label="Project document folders" role="tree">
        {folders.map((folder) => {
          const isSelected = folder.id === selectedFolderId;
          return (
            <button
              aria-current={isSelected ? "true" : undefined}
              aria-label={`Open ${folder.name} folder`}
              aria-selected={isSelected}
              className={`mb-2 flex w-full items-center justify-between rounded-sm border px-3 py-2 text-left text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:cursor-not-allowed disabled:text-slate-400 ${
                isSelected
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
              disabled={disabled}
              key={folder.id}
              onClick={() => onSelectFolder(folder)}
              role="treeitem"
              type="button"
            >
              <span>{folder.name}</span>
            </button>
          );
        })}
      </div>
    </SummaryCard>
  );
}

function DocumentGrid({
  documents,
  isRefreshing,
}: {
  documents: ApiGoogleDocumentMetadata[];
  isRefreshing: boolean;
}) {
  return (
    <SummaryCard
      description={isRefreshing ? "Refreshing Google Drive metadata." : undefined}
      headingLevel={2}
      title="Document Grid"
    >
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <caption className="sr-only">Google Drive document metadata</caption>
          <thead>
            <tr>
              <th className="px-3 py-2 font-semibold text-slate-600" scope="col">
                Name
              </th>
              <th className="px-3 py-2 font-semibold text-slate-600" scope="col">
                Type
              </th>
              <th className="px-3 py-2 font-semibold text-slate-600" scope="col">
                Modified
              </th>
              <th className="px-3 py-2 font-semibold text-slate-600" scope="col">
                Owner
              </th>
              <th className="px-3 py-2 font-semibold text-slate-600" scope="col">
                Version
              </th>
              <th className="px-3 py-2 font-semibold text-slate-600" scope="col">
                Open
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {documents.map((document) => (
              <tr key={document.id}>
                <td className="px-3 py-3 font-semibold text-slate-950">
                  {document.name}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {formatDocumentType(document.mimeType)}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {formatDate(document.modifiedTime)}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {document.ownerEmail ?? "Unknown"}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {document.version ?? "Unavailable"}
                </td>
                <td className="px-3 py-3">
                  {document.webUrl ? (
                    <a
                      aria-label={`Open ${document.name} in Google Drive`}
                      className="rounded-sm font-semibold text-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                      href={document.webUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Open
                    </a>
                  ) : (
                    <span className="text-slate-400">Unavailable</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SummaryCard>
  );
}

function StatusItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-slate-900">
        {value}
      </dd>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Unavailable";
  }

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDocumentType(value?: string | null) {
  if (!value) {
    return "Unknown";
  }

  if (value.includes("spreadsheet")) {
    return "Spreadsheet";
  }
  if (value.includes("presentation")) {
    return "Presentation";
  }
  if (value.includes("document")) {
    return "Document";
  }
  if (value.includes("pdf")) {
    return "PDF";
  }

  return value;
}

function formatDriveType(value?: string | null) {
  return value === "shared_drive" ? "Shared Drive" : "My Drive";
}

function formatLabel(value?: string | null) {
  return value ? value.replaceAll("_", " ") : "Unknown";
}
