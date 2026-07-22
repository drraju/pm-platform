"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addProjectMember,
  getProjectMembers,
  removeProjectMember,
  updateProjectMember,
  type ApiProjectMember,
} from "@/features/projects";

type ProjectMemberMutation = {
  role: string;
  userId: string;
};

const emptyProjectMembers: ApiProjectMember[] = [];

function createProjectMemberKey(members: ApiProjectMember[]) {
  return JSON.stringify(
    members.map((member) => ({
      displayName: member.user?.displayName ?? null,
      email: member.user?.email ?? null,
      firstName: member.user?.firstName ?? null,
      id: member.id,
      lastName: member.user?.lastName ?? null,
      role: member.role,
      status: member.user?.status ?? null,
      userId: member.userId,
    })),
  );
}

export function useProjectMembers(
  projectId: string,
  initialMembers: ApiProjectMember[] = emptyProjectMembers,
) {
  const [members, setMembers] = useState<ApiProjectMember[]>(initialMembers);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const initialMemberKey = createProjectMemberKey(initialMembers);
  const stableInitialMembersRef = useRef({
    key: initialMemberKey,
    members: initialMembers,
  });

  if (stableInitialMembersRef.current.key !== initialMemberKey) {
    stableInitialMembersRef.current = {
      key: initialMemberKey,
      members: initialMembers,
    };
  }

  const stableInitialMembers = stableInitialMembersRef.current.members;

  useEffect(() => {
    setMembers(stableInitialMembers);
  }, [stableInitialMembers]);

  const loadMembers = useCallback(async () => {
    if (!projectId) {
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      setMembers(await getProjectMembers(projectId));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load project members",
      );
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const addMember = useCallback(
    async (input: ProjectMemberMutation) => {
      setError(null);
      setIsSaving(true);
      try {
        const member = await addProjectMember(projectId, input);
        setMembers((currentMembers) => [...currentMembers, member]);
        return member;
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to add project member",
        );
        throw requestError;
      } finally {
        setIsSaving(false);
      }
    },
    [projectId],
  );

  const updateMember = useCallback(
    async (memberId: string, input: { role: string }) => {
      setError(null);
      setIsSaving(true);
      try {
        const member = await updateProjectMember(projectId, memberId, input);
        setMembers((currentMembers) =>
          currentMembers.map((currentMember) =>
            currentMember.id === member.id ? member : currentMember,
          ),
        );
        return member;
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to update project member",
        );
        throw requestError;
      } finally {
        setIsSaving(false);
      }
    },
    [projectId],
  );

  const removeMember = useCallback(
    async (memberId: string) => {
      setError(null);
      setIsSaving(true);
      try {
        await removeProjectMember(projectId, memberId);
        setMembers((currentMembers) =>
          currentMembers.filter((member) => member.id !== memberId),
        );
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to remove project member",
        );
        throw requestError;
      } finally {
        setIsSaving(false);
      }
    },
    [projectId],
  );

  const memberUsers = useMemo(
    () =>
      members
        .filter((member) => member.user)
        .map((member) => ({
          email: member.user?.email ?? "",
          firstName: member.user?.firstName ?? "",
          id: member.userId,
          lastName: member.user?.lastName ?? "",
          displayName:
            member.user?.displayName ??
            `${member.user?.firstName ?? ""} ${member.user?.lastName ?? ""}`.trim(),
          role: member.user?.role ?? null,
          status: member.user?.status,
        })),
    [members],
  );

  return {
    addMember,
    error,
    isLoading,
    isSaving,
    loadMembers,
    members,
    memberUsers,
    removeMember,
    setMembers,
    updateMember,
  };
}
