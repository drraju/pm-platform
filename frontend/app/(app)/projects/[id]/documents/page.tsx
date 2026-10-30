"use client";

import React from "react";
import { useParams } from "next/navigation";
import { OpenRoom } from "@/components/layout/open-room";

export default function ProjectDocumentsPage() {
  const params = useParams<{ id: string }>();
  return <OpenRoom href={`/projects/${params.id}`} label="Opening the project..." />;
}
