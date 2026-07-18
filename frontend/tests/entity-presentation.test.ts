import { describe, expect, it } from "vitest";
import {
  buildEntityResultSections,
  createProjectEntityProvider,
  createRaidEntityProvider,
  createTaskEntityProvider,
  EntityPresentationCatalog,
} from "@/features/entity-search";
import { EntityRegistry } from "@/lib/entities";

const context = {
  pathname: "/tasks",
  permissionKeys: ["project.read", "task.update", "raid.read"],
};

describe("entity search presentation", () => {
  it("uses provider section metadata and provider-specific result limits", () => {
    const catalog = new EntityPresentationCatalog();
    const projectProvider = createProjectEntityProvider(
      Array.from({ length: 25 }, (_, index) => project(index)),
    );
    const taskProvider = createTaskEntityProvider(
      Array.from({ length: 35 }, (_, index) => task(index)),
    );
    const registry = new EntityRegistry(context);
    registry.registerProvider(projectProvider);
    registry.registerProvider(taskProvider);
    catalog.registerProvider(projectProvider);
    catalog.registerProvider(taskProvider);

    const sections = buildEntityResultSections({
      catalog,
      entities: registry.getEntities(),
      resultLimit: 100,
    });

    expect(sections.map(({ title }) => title)).toEqual(["Projects", "Tasks"]);
    expect(sections.map(({ entities }) => entities.length)).toEqual([20, 30]);
    expect(sections[0]?.description).toMatch(/current workspace/i);
  });

  it("applies the overall result limit in deterministic provider order", () => {
    const catalog = new EntityPresentationCatalog();
    const providers = [
      createProjectEntityProvider(
        Array.from({ length: 20 }, (_, index) => project(index)),
      ),
      createTaskEntityProvider(
        Array.from({ length: 30 }, (_, index) => task(index)),
      ),
      createRaidEntityProvider(
        Array.from({ length: 20 }, (_, index) => raid(index)),
      ),
    ];
    const registry = new EntityRegistry(context);

    for (const provider of providers) {
      registry.registerProvider(provider);
      catalog.registerProvider(provider);
    }

    const sections = buildEntityResultSections({
      catalog,
      entities: registry.getEntities(),
      resultLimit: 55,
    });

    expect(sections.map(({ title }) => title)).toEqual([
      "Projects",
      "Tasks",
      "RAID",
    ]);
    expect(sections.map(({ entities }) => entities.length)).toEqual([20, 30, 5]);
    expect(sections.flatMap(({ entities }) => entities)).toHaveLength(55);
  });

  it("validates deterministic filtering with 500+ projects, 5,000+ tasks, and hundreds of RAID items", () => {
    const registry = new EntityRegistry(context);
    registry.registerProvider(
      createProjectEntityProvider(
        Array.from({ length: 550 }, (_, index) => project(index)),
      ),
    );
    registry.registerProvider(
      createTaskEntityProvider(
        Array.from({ length: 5_000 }, (_, index) => task(index)),
      ),
    );
    registry.registerProvider(
      createRaidEntityProvider(
        Array.from({ length: 350 }, (_, index) => raid(index)),
      ),
    );

    expect(registry.getEntities()).toHaveLength(5_900);
    expect(registry.filterEntities("task 4999").map(({ id }) => id)).toEqual([
      "task:task-4999",
    ]);
    expect(registry.filterEntities("raid critical 349").map(({ id }) => id)).toEqual([
      "raid:raid-349",
    ]);
    expect(registry.filterEntities("project amber 549").map(({ id }) => id)).toEqual([
      "project:project-549",
    ]);
  });
});

function project(index: number) {
  return {
    health: {
      reasons: index % 2 ? ["Watch delivery"] : [],
      status: index % 2 ? ("AMBER" as const) : ("GREEN" as const),
    },
    id: `project-${index}`,
    name: `Project ${index}`,
    status: "active",
  };
}

function task(index: number) {
  return {
    id: `task-${index}`,
    priority: index % 2 ? "high" : "medium",
    projectId: `project-${index % 550}`,
    status: "todo" as const,
    title: `Task ${index}`,
  };
}

function raid(index: number) {
  return {
    id: `raid-${index}`,
    priority: "critical",
    projectId: `project-${index % 550}`,
    status: "open",
    title: `RAID ${index}`,
    type: "issue" as const,
  };
}
