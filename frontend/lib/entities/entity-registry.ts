import { defaultEntityFilter, type EntityFilter } from "./filter";
import type {
  EntityProvider,
  EntityProviderContext,
  SearchableEntity,
} from "./types";

type RegisteredProvider = {
  entities: readonly SearchableEntity[];
};

export class DuplicateEntityIdError extends Error {
  constructor(entityId: string) {
    super(`Entity ID "${entityId}" is already registered.`);
    this.name = "DuplicateEntityIdError";
  }
}

export class DuplicateEntityProviderError extends Error {
  constructor(providerId: string) {
    super(`Entity provider "${providerId}" is already registered.`);
    this.name = "DuplicateEntityProviderError";
  }
}

export class EntityRegistry {
  private readonly listeners = new Set<() => void>();
  private readonly providers = new Map<string, RegisteredProvider>();

  constructor(
    private readonly context: EntityProviderContext,
    private readonly entityFilter: EntityFilter = defaultEntityFilter,
  ) {}

  registerProvider(provider: EntityProvider) {
    if (this.providers.has(provider.id)) {
      throw new DuplicateEntityProviderError(provider.id);
    }

    const entities = [...provider.getEntities(this.context)];
    const entityIds = new Set(this.getEntities().map((entity) => entity.id));

    for (const entity of entities) {
      if (entityIds.has(entity.id)) {
        throw new DuplicateEntityIdError(entity.id);
      }

      entityIds.add(entity.id);
    }

    this.providers.set(provider.id, { entities });
    this.notify();
  }

  unregisterProvider(providerId: string) {
    const removed = this.providers.delete(providerId);

    if (removed) {
      this.notify();
    }

    return removed;
  }

  getEntities() {
    return [...this.providers.values()].flatMap(({ entities }) => entities);
  }

  filterEntities(query: string) {
    return this.entityFilter(this.getEntities(), query);
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
