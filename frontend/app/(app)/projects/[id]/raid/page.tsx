"use client";

import React, { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { LoadingState, WorkspaceLayout } from "@/components/foundation";

/** Legacy RAID route — renamed to Govern (same RAID register). */
export default function ProjectRaidRedirectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/projects/${params.id}/govern`);
  }, [params.id, router]);

  return (
    <WorkspaceLayout spacing="compact">
      <LoadingState label="Opening Govern workspace" rows={3} />
    </WorkspaceLayout>
  );
}
