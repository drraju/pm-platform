"use client";

import React from "react";
import { useParams } from "next/navigation";
import { OpenRoom } from "@/components/layout/open-room";

export default function ProjectGovernPage() {
  const params = useParams<{ id: string }>();
  return <OpenRoom href={`/projects/${params.id}/raid`} label="Opening RAID..." />;
}
