"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

export function OpenRoom({ href, label }: { href: string; label: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(href);
  }, [href, router]);

  return <p className="text-sm text-slate-500">{label}</p>;
}
