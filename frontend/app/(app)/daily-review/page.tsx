"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DailyReviewPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/today");
  }, [router]);

  return <p className="text-sm text-slate-500">Opening Today...</p>;
}
