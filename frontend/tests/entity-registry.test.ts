import { describe, expect, it, vi } from "vitest";
import {
  DuplicateEntityIdError,
  DuplicateEntityProviderError,
  EntityRegistry,
  type EntityProvider,
  type EntityProviderContext,
  type SearchableEntity,
} from "@/lib/entities";

const context: EntityProviderContext = {
  pathname: "/projects/project-1/tasks",
  permissionKeys: ["project.read"],
  projectId: "project-1",
};

describe("EntityRegistry", () => {
  it("registers providers, supplies context, and collects entities", () => {
    const registry = new EntityRegistry(context);
    const getEntities = vi.fn(() => [entity()]);

    registry.registerProvider({ getEntities, id: "projects" });

    expect(getEntities).toHaveBeenCalledWith(context);
    expect(registry.getEntities()).toEqual([entity()]);
  });

  it("rejects duplicate provider IDs without changing the registry", () => {
    const registry = new EntityRegistry(context);
    registry.registerProvider(provider("projects", [entity()]));

    expect(() =>
      registry.registerProvider(
        provider("projects", [entity({ id: "project:2" })]),
      ),
    ).toThrow(DuplicateEntityProviderError);
    expect(registry.getEntities()).toHaveLength(1);
  });

  it("rejects duplicate entity IDs across and within providers", () => {
    const registry = new EntityRegistry(context);
    registry.registerProvider(provider("projects", [entity()]));

    expect(() =>
      registry.registerProvider(provider("tasks", [entity()])),
    ).toThrow(DuplicateEntityIdError);
    expect(() =>
      new EntityRegistry(context).registerProvider(
        provider("invalid", [entity(), entity({ title: "Duplicate" })]),
      ),
    ).toThrow(DuplicateEntityIdError);
    expect(registry.getEntities()).toHaveLength(1);
  });

  it("filters deterministically across title, subtitle, keywords, and category", () => {
    const registry = new EntityRegistry(context);
    registry.registerProvider(
      provider("projects", [
        entity({
          category: "Projects",
          keywords: ["delivery", "amber"],
          subtitle: "Customer transformation",
          title: "Experience Upgrade",
        }),
        entity({
          id: "project:2",
          keywords: ["finance"],
          title: "Ledger Renewal",
        }),
      ]),
    );

    expect(registry.filterEntities("experience transformation")).toHaveLength(1);
    expect(registry.filterEntities("projects amber")[0]?.id).toBe("project:1");
    expect(registry.filterEntities("delivery typo")).toEqual([]);
    expect(registry.filterEntities("  ")).toEqual(registry.getEntities());
  });

  it("unregisters providers, releases IDs, and notifies subscribers", () => {
    const registry = new EntityRegistry(context);
    const listener = vi.fn();
    const unsubscribe = registry.subscribe(listener);

    registry.registerProvider(provider("projects", [entity()]));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(registry.unregisterProvider("projects")).toBe(true);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(registry.unregisterProvider("projects")).toBe(false);

    unsubscribe();
    registry.registerProvider(provider("portfolio", [entity()]));
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("supports an injected deterministic filtering strategy", () => {
    const filter = vi.fn((entities: readonly SearchableEntity[]) =>
      [...entities].reverse(),
    );
    const registry = new EntityRegistry(context, filter);
    registry.registerProvider(
      provider("projects", [entity(), entity({ id: "project:2" })]),
    );

    expect(registry.filterEntities("ignored").map(({ id }) => id)).toEqual([
      "project:2",
      "project:1",
    ]);
    expect(filter).toHaveBeenCalledWith(registry.getEntities(), "ignored");
  });
});

function entity(
  overrides: Partial<SearchableEntity> = {},
): SearchableEntity {
  return {
    category: "Projects",
    id: "project:1",
    navigationTarget: "/projects/1",
    title: "Project One",
    ...overrides,
  };
}

function provider(
  id: string,
  entities: readonly SearchableEntity[],
): EntityProvider {
  return { getEntities: () => entities, id };
}
