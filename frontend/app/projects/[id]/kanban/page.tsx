import { redirect } from "next/navigation";

/** Legacy kanban URL opens the project board. */
export default async function KanbanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/projects/${id}/board`);
}
