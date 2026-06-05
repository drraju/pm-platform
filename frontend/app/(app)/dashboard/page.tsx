"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { getProjects, type ApiProject } from "@/features/projects";
import { getRaidItems, type ApiRaidItem } from "@/features/raid";
import { getTasks, type ApiTask } from "@/features/tasks";

export default function DashboardPage() {
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [raidItems, setRaidItems] = useState<ApiRaidItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [projectData, taskData, raidData] = await Promise.all([
          getProjects(),
          getTasks(),
          getRaidItems(),
        ]);
        setProjects(projectData);
        setTasks(taskData);
        setRaidItems(raidData);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load dashboard",
        );
      }
    }

    void loadDashboard();
  }, []);

  const stats = useMemo(() => {
    const openRisks = raidItems.filter(
      (item) => item.type === "risk" && item.status !== "closed",
    ).length;
    const blockedTasks = tasks.filter((task) => task.status === "blocked").length;
    const doneTasks = tasks.filter((task) => task.status === "done").length;
    const deliveryHealth =
      tasks.length === 0 ? 0 : Math.round((doneTasks / tasks.length) * 100);

    return [
      {
        label: "Active projects",
        value: String(projects.filter((project) => project.status !== "complete").length),
        trend: `${projects.length} total projects`,
      },
      {
        label: "Open risks",
        value: String(openRisks),
        trend: `${raidItems.length} RAID items tracked`,
      },
      {
        label: "Blocked tasks",
        value: String(blockedTasks),
        trend: `${tasks.length} total tasks`,
      },
      {
        label: "Delivery health",
        value: `${deliveryHealth}%`,
        trend: `${doneTasks} tasks complete`,
      },
    ];
  }, [projects, raidItems, tasks]);

  const statusCounts = ["active", "at_risk", "blocked", "complete"].map((status) => ({
    status,
    count: projects.filter((project) => project.status === status).length,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        description="A cross-project view of delivery health, executive risks, upcoming milestones, and team workload."
        eyebrow="Executive dashboard"
        title="Portfolio command overview"
      />

      {error ? (
        <section className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="text-lg font-semibold text-slate-950">Project health</h2>
          <div className="mt-5 space-y-4">
            {statusCounts.map(({ status, count }) => {
              const percent = projects.length === 0 ? 0 : Math.round((count / projects.length) * 100);
              return (
                <div key={status}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium capitalize text-slate-700">
                      {status.replaceAll("_", " ")}
                    </span>
                    <span className="text-slate-500">{percent}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-brand" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="text-lg font-semibold text-slate-950">Recent RAID</h2>
          <ul className="mt-4 space-y-3">
            {raidItems.slice(0, 5).map((item) => (
              <li className="rounded-md border border-slate-100 bg-slate-50 px-3 py-3 text-sm text-slate-700" key={`${item.type}-${item.id}`}>
                <span className="font-semibold capitalize text-slate-950">{item.type}: </span>
                {item.title}
              </li>
            ))}
            {raidItems.length === 0 ? (
              <li className="rounded-md border border-slate-100 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                No RAID items yet.
              </li>
            ) : null}
          </ul>
        </div>
      </section>
    </div>
  );
}
