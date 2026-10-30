"use client";

import React, { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
/** Legacy project Tasks route lands on Today for that project. */
export default function ProjectTasksRedirectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/today?projectId=${params.id}`);
  }, [params.id, router]);

  return <p className="text-sm text-slate-500">Opening Today...</p>;
}
