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
import { getProject, type ApiProjectDetails } from "@/features/projects";
import {
  createProjectDocument,
  getAssignableUsers,
  getDocumentCategories,
  getDocumentStorageProviders,
  getDocumentTypes,
  getProjectDocuments,
  getProjectDocumentSummary,
  type ApiAssignableUser,
  type ApiDocumentReference,
  type ApiDocumentStorageProvider,
  type ApiProjectDocument,
  type ApiProjectDocumentSummary,
  type ApiStorageProviderReference,
} from "@/lib/api/client";

export default function ProjectDocumentsPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [categories, setCategories] = useState<ApiDocumentReference[]>([]);
  const [documents, setDocuments] = useState<ApiProjectDocument[]>([]);
  const [documentTypes, setDocumentTypes] = useState<ApiDocumentReference[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DocumentFilters>(() =>
    createDefaultDocumentFilters(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [owners, setOwners] = useState<ApiAssignableUser[]>([]);
  const [project, setProject] = useState<ApiProjectDetails | null>(null);
  const [storageProviders, setStorageProviders] = useState<
    ApiStorageProviderReference[]
  >([]);
  const [summary, setSummary] = useState<ApiProjectDocumentSummary | null>(null);

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
      ] = await Promise.all([
        getProject(projectId),
        getProjectDocuments(projectId, compactFilters(filters)),
        getDocumentStorageProviders(),
        getDocumentTypes(),
        getDocumentCategories(),
        getAssignableUsers(),
        getProjectDocumentSummary(projectId),
      ]);
      setProject(projectDetails);
      setDocuments(projectDocuments);
      setStorageProviders(providers);
      setDocumentTypes(types);
      setCategories(categoryValues);
      setOwners(assignableUsers);
      setSummary(documentSummary);
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
    void loadWorkspace();
  }, [loadWorkspace]);

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

  if (isLoading) {
    return <ProjectLayoutLoadingState />;
  }

  const workspaceProject = project ?? {
    id: projectId,
    name: "Project Documents",
    status: "active",
  };

  return (
    <ProjectLayout activeTab="documents" project={workspaceProject}>
      {error ? <ErrorState message={error} /> : null}
      <ProjectWorkspaceDocuments
        categories={categories}
        documents={documents}
        documentTypes={documentTypes}
        filters={filters}
        isSaving={isSaving}
        onCreateDocument={handleCreateDocument}
        onFiltersChange={setFilters}
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
