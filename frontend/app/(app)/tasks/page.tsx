"use client";

import React, { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function TasksPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Opening Today...</p>}>
      <TasksRedirect />
    </Suspense>
  );
}

function TasksRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const projectId = searchParams.get("projectId");
    router.replace(projectId ? `/today?projectId=${projectId}` : "/today");
  }, [router, searchParams]);

  return <p className="text-sm text-slate-500">Opening Today...</p>;
}
