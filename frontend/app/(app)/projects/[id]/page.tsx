"use client";

import React from "react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ErrorState,
  LoadingState,
  WorkspaceHeader,
  WorkspaceLayout,
} from "@/components/foundation";
import {
  CompactProjectWorkspaceLayout,
  ProjectLayout,
} from "@/components/project";
import { ProjectRecord } from "@/components/projects/project-record";
import { ProjectCommitments } from "@/components/projects/project-commitments";
import { ProjectSlack } from "@/components/projects/project-slack";
import { getAuthMe, isExternalContact, storeAuthMe } from "@/features/auth";
import { acceptProjectCommitment, getProjectCommitments, type ApiCommitment } from "@/features/customers";
import {
  disconnectProjectSlack,
  getProjectSlack,
  saveProjectSlack,
  type SlackSetting,
} from "@/features/integrations/slack";
import { getProject, type ApiProjectDetails } from "@/features/projects";

export default function ProjectWorkspacePage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [project, setProject] = useState<ApiProjectDetails | null>(null);
  const [commitments, setCommitments] = useState<ApiCommitment[]>([]);
  const [canAccept, setCanAccept] = useState(false);
  const [slack, setSlack] = useState<SlackSetting | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [externalContact, setExternalContact] = useState(false);

  useEffect(() => {
    async function loadProject() {
      setError(null);
      setIsLoading(true);
      try {
        const [details, authMe] = await Promise.all([
          getProject(projectId),
          getAuthMe().catch(() => null),
        ]);
        setProject(details);
        const contact = Boolean(authMe && isExternalContact(authMe.roles));
        setExternalContact(contact);
        if (authMe) {
          storeAuthMe(authMe);
          const platformAdmin = authMe.roles.some((role) => role.name === "PLATFORM_ADMIN");
          setCanAccept(
            !contact &&
              (platformAdmin ||
                (details.members ?? []).some(
                  (member) =>
                    member.userId === authMe.user.id &&
                    (member.role === "owner" || member.role === "manager"),
                )),
          );
        }
        if (contact) {
          setCommitments([]);
          setSlack(null);
        } else {
          setCommitments(await getProjectCommitments(projectId).catch(() => []));
          setSlack(await getProjectSlack(projectId).catch(() => null));
        }
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load project overview",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadProject();
  }, [projectId]);

  if (isLoading) {
    return (
      <WorkspaceLayout spacing="compact">
        <LoadingState label="Loading project workspace" rows={4} />
      </WorkspaceLayout>
    );
  }

  const workspaceProject = project ?? {
    id: projectId,
    name: "Project Overview",
    status: "active",
  };

  return (
    <ProjectLayout
      activeTab="overview"
      layout={CompactProjectWorkspaceLayout}
      project={workspaceProject}
      renderHeader={(content) => (
        <WorkspaceHeader density="compact" {...content} />
      )}
    >
      {error ? <ErrorState message={error} /> : null}
      {project ? (
        <ProjectRecord
          commitments={
            externalContact ? undefined : (
            <ProjectCommitments
              canAccept={canAccept}
              commitments={commitments}
              isSaving={isSaving}
              onAccept={async (commitment) => {
                setIsSaving(true);
                setError(null);
                try {
                  await acceptProjectCommitment(projectId, commitment.id);
                  const [details, next] = await Promise.all([
                    getProject(projectId),
                    getProjectCommitments(projectId),
                  ]);
                  setProject(details);
                  setCommitments(next);
                } catch (requestError) {
                  setError(requestError instanceof Error ? requestError.message : "Unable to accept the commitment");
                } finally {
                  setIsSaving(false);
                }
              }}
            />
            )
          }
          project={project}
          slack={
            externalContact || !slack ? undefined : (
              <ProjectSlack
                canEdit={canAccept}
                isSaving={isSaving}
                onDisconnect={async () => {
                  setIsSaving(true);
                  setError(null);
                  try {
                    setSlack(await disconnectProjectSlack(projectId));
                  } catch (requestError) {
                    setError(requestError instanceof Error ? requestError.message : "Unable to disconnect Slack");
                  } finally {
                    setIsSaving(false);
                  }
                }}
                onSave={async (input) => {
                  setIsSaving(true);
                  setError(null);
                  try {
                    setSlack(await saveProjectSlack(projectId, input));
                  } catch (requestError) {
                    setError(requestError instanceof Error ? requestError.message : "Unable to save Slack");
                  } finally {
                    setIsSaving(false);
                  }
                }}
                setting={slack}
              />
            )
          }
        />
      ) : null}
    </ProjectLayout>
  );
}
