"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ErrorState } from "@/components/foundation";
import {
  ProjectLayout,
  ProjectLayoutLoadingState,
} from "@/components/project";
import {
  createDefaultDocumentFilters,
  ProjectWorkspaceDocuments,
  type DocumentFilters,
} from "@/components/projects/project-workspace-documents";
import {
  getAuthMe,
  resolveProjectUiCapabilities,
  storeAuthMe,
} from "@/features/auth";
import { getProject, type ApiProjectDetails } from "@/features/projects";
import { useProjectMembers } from "@/hooks/use-project-members";
import {
  createProjectDocument,
  getAssignableUsers,
  getDocumentCategories,
  getDocumentStorageProviders,
  getDocumentTypes,
  getProjectDocuments,
  getProjectDocumentSummary,
  updateProjectDocument,
  type ApiAssignableUser,
  type ApiDocumentReference,
  type ApiDocumentStorageProvider,
  type ApiProjectDocument,
  type ApiProjectDocumentSummary,
  type ApiStorageProviderReference,
} from "@/lib/api/client";
import {
  readPersistedWorkspaceState,
  writePersistedWorkspaceState,
} from "@/lib/workspace/persisted-workspace-state";

function getDocumentsPrefsKey(projectId: string) {
  return `documents:${projectId}`;
}

export default function ProjectDocumentsPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [categories, setCategories] = useState<ApiDocumentReference[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<ApiProjectDocument[]>([]);
  const [documentTypes, setDocumentTypes] = useState<ApiDocumentReference[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DocumentFilters>(() =>
    createDefaultDocumentFilters(),
  );
  const [prefsProjectId, setPrefsProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [owners, setOwners] = useState<ApiAssignableUser[]>([]);
  const [permissionKeys, setPermissionKeys] = useState<string[]>([]);
  const [project, setProject] = useState<ApiProjectDetails | null>(null);
  const [roleNames, setRoleNames] = useState<string[]>([]);
  const [storageProviders, setStorageProviders] = useState<
    ApiStorageProviderReference[]
  >([]);
  const [summary, setSummary] = useState<ApiProjectDocumentSummary | null>(null);
  const {
    error: memberError,
    members,
  } = useProjectMembers(projectId, project?.members ?? []);

  useEffect(() => {
    const prefs = readPersistedWorkspaceState<DocumentFilters>(
      getDocumentsPrefsKey(projectId),
      createDefaultDocumentFilters(),
    );
    setFilters({ ...createDefaultDocumentFilters(), ...prefs });
    setPrefsProjectId(projectId);
  }, [projectId]);

  useEffect(() => {
    if (prefsProjectId !== projectId) {
      return;
    }
    writePersistedWorkspaceState(getDocumentsPrefsKey(projectId), filters);
  }, [filters, prefsProjectId, projectId]);

  const loadWorkspace = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const [
        projectDetails,
        projectDocuments,
        providers,
        types,
        categoryValues,
        assignableUsers,
        documentSummary,
        authMe,
      ] = await Promise.all([
        getProject(projectId),
        getProjectDocuments(projectId, compactFilters(filters)),
        getDocumentStorageProviders(),
        getDocumentTypes(),
        getDocumentCategories(),
        getAssignableUsers(),
        getProjectDocumentSummary(projectId),
        getAuthMe(),
      ]);
      storeAuthMe(authMe);
      setProject(projectDetails);
      setDocuments(projectDocuments);
      setStorageProviders(providers);
      setDocumentTypes(types);
      setCategories(categoryValues);
      setOwners(assignableUsers);
      setSummary(documentSummary);
      setCurrentUserId(authMe.user.id);
      setPermissionKeys(authMe.permissions.map((permission) => permission.key));
      setRoleNames(authMe.roles.map((role) => role.name));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load project documents",
      );
    } finally {
      setIsLoading(false);
    }
  }, [filters, projectId]);

  useEffect(() => {
    if (prefsProjectId !== projectId) {
      return;
    }
    void loadWorkspace();
  }, [loadWorkspace, prefsProjectId, projectId]);

  async function handleCreateDocument(input: {
    approvalStatus: ApiProjectDocument["approvalStatus"];
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
  }) {
    setError(null);
    setIsSaving(true);
    try {
      await createProjectDocument({
        approvalStatus: input.approvalStatus,
        category: input.category || null,
        description: input.description || null,
        documentType: input.documentType,
        externalUrl: input.externalUrl,
        lastReviewedAt: input.lastReviewedAt || null,
        nextReviewAt: input.nextReviewAt || null,
        ownerId: input.ownerId || null,
        projectId,
        storageProvider: input.storageProvider,
        title: input.title,
        version: input.version || null,
      });
      await loadWorkspace();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create document link",
      );
      throw requestError;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateDocument(
    documentId: string,
    input: {
      approvalStatus: ApiProjectDocument["approvalStatus"];
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
    },
  ) {
    setError(null);
    setIsSaving(true);
    try {
      await updateProjectDocument(documentId, {
        approvalStatus: input.approvalStatus,
        category: input.category || null,
        description: input.description || null,
        documentType: input.documentType,
        externalUrl: input.externalUrl,
        lastReviewedAt: input.lastReviewedAt || null,
        nextReviewAt: input.nextReviewAt || null,
        ownerId: input.ownerId || null,
        projectId,
        storageProvider: input.storageProvider,
        title: input.title,
        version: input.version || null,
      });
      await loadWorkspace();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update document metadata",
      );
      throw requestError;
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <ProjectLayoutLoadingState />;
  }

  const workspaceProject = project ?? {
    id: projectId,
    name: "Project Documents",
    status: "active",
  };
  const capabilities = resolveProjectUiCapabilities({
    currentUserId,
    members,
    permissionKeys,
    project,
    roleNames,
  });

  return (
    <ProjectLayout activeTab="documents" project={workspaceProject}>
      {error ? <ErrorState message={error} /> : null}
      {memberError ? <ErrorState message={memberError} /> : null}
      <ProjectWorkspaceDocuments
        canApproveDocuments={capabilities.canApproveDocuments}
        canEditDocument={(document) =>
          resolveProjectUiCapabilities({
            currentUserId,
            document,
            members,
            permissionKeys,
            project,
            roleNames,
          }).canEditDocument
        }
        canUploadDocuments={capabilities.canUploadDocuments}
        categories={categories}
        documents={documents}
        documentTypes={documentTypes}
        filters={filters}
        isSaving={isSaving}
        onCreateDocument={handleCreateDocument}
        onFiltersChange={setFilters}
        onUpdateDocument={handleUpdateDocument}
        owners={owners}
        project={workspaceProject}
        storageProviders={storageProviders}
        summary={summary}
      />
    </ProjectLayout>
  );
}

function compactFilters(filters: DocumentFilters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== ""),
  );
}
