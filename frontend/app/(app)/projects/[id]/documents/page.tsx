"use client";

import React from "react";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ErrorState } from "@/components/foundation";
import {
  ProjectLayout,
  ProjectLayoutLoadingState,
} from "@/components/project";
import { ProjectWorkspaceDocuments } from "@/components/projects/project-workspace-documents";
import { getProject, type ApiProjectDetails } from "@/features/projects";
import {
  connectGoogleWorkspace,
  createGoogleProjectFolder,
  getGoogleDocuments,
  getProjectDocumentWorkspace,
  getStoredSessionUser,
  type ApiGoogleDocumentFolder,
  type ApiGoogleDocumentMetadata,
  type ApiProjectDocumentWorkspace,
} from "@/lib/api/client";

export default function ProjectDocumentsPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [documents, setDocuments] = useState<ApiGoogleDocumentMetadata[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<ApiProjectDetails | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<ApiProjectDocumentWorkspace | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadWorkspace = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const [projectDetails, documentWorkspace] = await Promise.all([
        getProject(projectId),
        getProjectDocumentWorkspace(projectId),
      ]);
      setProject(projectDetails);
      setWorkspace(documentWorkspace);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load project documents",
      );
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  async function handleConnect() {
    setError(null);
    try {
      const result = await connectGoogleWorkspace();
      if (result.authorizationUrl) {
        window.location.assign(result.authorizationUrl);
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to start Google Workspace connection",
      );
    }
  }

  async function handleCreateWorkspace() {
    if (!project) {
      return;
    }

    setError(null);
    setIsRefreshing(true);
    try {
      await createGoogleProjectFolder({
        connectionId: workspace?.connection?.id,
        createdByUserId: getStoredSessionUser()?.userId,
        projectId,
        projectName: project.name,
      });
      await loadWorkspace();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create Google Drive project workspace",
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  async function loadDocuments(folder: ApiGoogleDocumentFolder, force = false) {
    if (!workspace?.connection || (!force && folder.id === selectedFolderId)) {
      return;
    }

    setError(null);
    setIsRefreshing(true);
    setSelectedFolderId(folder.id);
    try {
      setDocuments(
        await getGoogleDocuments({
          connectionId: workspace.connection.id,
          folderId: folder.id,
          projectId,
        }),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load Google Drive documents",
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleSelectFolder(folder: ApiGoogleDocumentFolder) {
    await loadDocuments(folder);
  }

  async function handleRefresh() {
    if (workspace?.folders.length) {
      const selectedFolder =
        workspace.folders.find((folder) => folder.id === selectedFolderId) ??
        workspace.folders[0];
      await loadDocuments(selectedFolder, true);
      return;
    }

    await loadWorkspace();
  }

  if (isLoading) {
    return <ProjectLayoutLoadingState />;
  }

  const workspaceProject = project ?? {
    id: projectId,
    name: "Project Documents",
    status: "active",
  };
  const documentWorkspace =
    workspace ??
    ({
      connection: null,
      folders: [],
      projectFolder: null,
      provider: "Google Drive",
      status: "not_connected",
    } satisfies ApiProjectDocumentWorkspace);

  return (
    <ProjectLayout activeTab="documents" project={workspaceProject}>
      {error ? <ErrorState message={error} /> : null}
      <ProjectWorkspaceDocuments
        documents={documents}
        isRefreshing={isRefreshing}
        onConnect={handleConnect}
        onCreateWorkspace={handleCreateWorkspace}
        onRefresh={handleRefresh}
        onSelectFolder={handleSelectFolder}
        project={workspaceProject}
        selectedFolderId={selectedFolderId}
        workspace={documentWorkspace}
      />
    </ProjectLayout>
  );
}
