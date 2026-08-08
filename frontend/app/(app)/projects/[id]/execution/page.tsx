"use client";

import React, { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { LoadingState, WorkspaceLayout } from "@/components/foundation";
import { getDeliveryHref } from "@/components/delivery/delivery-views";

/** Legacy Execution route — consolidated into Delivery. */
export default function ProjectExecutionRedirectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(getDeliveryHref(params.id, "list"));
  }, [params.id, router]);

  return (
    <WorkspaceLayout spacing="compact">
      <LoadingState label="Opening Delivery workspace" rows={3} />
    </WorkspaceLayout>
  );
}
