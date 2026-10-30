"use client";

import React, { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/** Legacy planning route lands on the project plan. */
export default function ProjectPlanningPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/projects/${params.id}/plan`);
  }, [params.id, router]);

  return <p className="text-sm text-slate-500">Opening Plan...</p>;
}
