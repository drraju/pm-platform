import Link from "next/link";
import type { ApiProject } from "@/features/projects";
import { countWork, todayDate } from "@/features/work/work-count";

function leadName(project: ApiProject) {
  const lead = project.members?.find(
    (member) => member.role === "owner" || member.role === "manager",
  );
  const person = lead?.user ?? project.owner;
  const name = [person?.firstName, person?.lastName].filter(Boolean).join(" ").trim();
  return name || "Unassigned";
}

function finishLabel(value?: string | null) {
  if (!value) return "No target finish";
  return value.slice(0, 10);
}

export function ExternalProjectList({ projects }: { projects: ApiProject[] }) {
  if (projects.length === 0) {
    return (
      <p className="rounded-md border border-slate-200 bg-white px-3 py-4 text-sm text-slate-600">
        No projects are shared with you yet.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2 font-semibold">Project</th>
            <th className="px-3 py-2 font-semibold">Target finish</th>
            <th className="px-3 py-2 font-semibold">Overdue</th>
            <th className="px-3 py-2 font-semibold">Lead</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr className="border-b border-slate-100 last:border-b-0" key={project.id}>
              <td className="px-3 py-2">
                <Link className="font-semibold text-slate-950 hover:text-teal-800" href={`/projects/${project.id}`}>
                  {project.name}
                </Link>
              </td>
              <td className="px-3 py-2 text-slate-700">{finishLabel(project.targetEndDate)}</td>
              <td className="px-3 py-2 text-slate-700">
                {countWork(project.tasks ?? [], todayDate()).line}
              </td>
              <td className="px-3 py-2 text-slate-700">{leadName(project)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
