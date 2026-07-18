import { describe, expect, it } from "vitest";
import {
  createProjectEntityProvider,
  createRaidEntityProvider,
  createTaskEntityProvider,
} from "@/features/entity-search";
import type { EntityProviderContext } from "@/lib/entities";

describe("application entity providers", () => {
  it("maps loaded projects into searchable navigation entities", () => {
    const provider = createProjectEntityProvider([
      {
        description: "Customer transformation",
        health: { reasons: ["Watch delivery"], status: "AMBER" },
        id: "project-1",
        name: "Experience Upgrade",
        status: "active",
      },
    ]);

    expect(provider.getEntities(context(["project.read"]))).toEqual([
      expect.objectContaining({
        category: "Projects",
        id: "project:project-1",
        navigationTarget: "/projects/project-1",
        title: "Experience Upgrade",
      }),
    ]);
    expect(provider.getEntities(context([]))).toEqual([]);
  });

  it("maps assigned tasks without adding an API dependency", () => {
    const provider = createTaskEntityProvider([
      {
        id: "task-1",
        priority: "high",
        project: { id: "project-1", name: "Experience Upgrade", status: "active" },
        projectId: "project-1",
        status: "in_progress",
        title: "Complete readiness review",
      },
    ]);
    const [entity] = provider.getEntities(context(["task.update"]));

    expect(entity).toEqual(
      expect.objectContaining({
        category: "Tasks",
        id: "task:task-1",
        navigationTarget: "/projects/project-1/tasks",
        title: "Complete readiness review",
      }),
    );
    expect(entity?.subtitle).toContain("Experience Upgrade");
  });

  it("maps loaded RAID items and respects RAID visibility", () => {
    const provider = createRaidEntityProvider([
      {
        id: "raid-1",
        priority: "critical",
        projectId: "project-1",
        status: "open",
        title: "Supplier readiness",
        type: "issue",
      },
    ]);

    expect(provider.getEntities(context(["raid.read"]))[0]).toEqual(
      expect.objectContaining({
        category: "RAID",
        id: "raid:raid-1",
        navigationTarget: "/projects/project-1/raid",
        title: "Supplier readiness",
      }),
    );
    expect(provider.getEntities(context([]))).toEqual([]);
  });
});

function context(permissionKeys: string[]): EntityProviderContext {
  return { pathname: "/dashboard", permissionKeys };
}
