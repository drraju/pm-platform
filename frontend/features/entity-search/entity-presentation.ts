import type { EntityProvider, SearchableEntity } from "@/lib/entities";

export const defaultEntityResultLimit = 60;

export type EntityProviderPresentationMetadata = {
  category: string;
  maximumResults?: number;
  sectionDescription?: string;
  sectionTitle?: string;
};

export type PresentableEntityProvider = EntityProvider & {
  presentation?: EntityProviderPresentationMetadata;
};

export type EntityResultSection = {
  description?: string;
  entities: SearchableEntity[];
  id: string;
  title: string;
};

export class EntityPresentationCatalog {
  private readonly listeners = new Set<() => void>();
  private readonly metadataByProviderId = new Map<
    string,
    EntityProviderPresentationMetadata
  >();

  registerProvider(provider: PresentableEntityProvider) {
    if (!provider.presentation) {
      return;
    }

    this.metadataByProviderId.set(provider.id, provider.presentation);
    this.notify();
  }

  unregisterProvider(providerId: string) {
    if (this.metadataByProviderId.delete(providerId)) {
      this.notify();
    }
  }

  getMetadataForCategory(category: string) {
    return [...this.metadataByProviderId.values()].find(
      (metadata) => metadata.category === category,
    );
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

export function buildEntityResultSections({
  catalog,
  entities,
  resultLimit = defaultEntityResultLimit,
}: {
  catalog?: EntityPresentationCatalog;
  entities: readonly SearchableEntity[];
  resultLimit?: number;
}): EntityResultSection[] {
  const entitiesByCategory = new Map<string, SearchableEntity[]>();

  for (const entity of entities) {
    const categoryEntities = entitiesByCategory.get(entity.category) ?? [];
    categoryEntities.push(entity);
    entitiesByCategory.set(entity.category, categoryEntities);
  }

  let remainingResults = normalizeLimit(resultLimit);
  const sections: EntityResultSection[] = [];

  for (const [category, categoryEntities] of entitiesByCategory) {
    if (remainingResults === 0) {
      break;
    }

    const metadata = catalog?.getMetadataForCategory(category);
    const providerLimit = normalizeLimit(
      metadata?.maximumResults ?? Number.MAX_SAFE_INTEGER,
    );
    const displayedEntities = categoryEntities.slice(
      0,
      Math.min(providerLimit, remainingResults),
    );

    if (displayedEntities.length === 0) {
      continue;
    }

    sections.push({
      description: metadata?.sectionDescription,
      entities: displayedEntities,
      id: `entities-${category.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      title: metadata?.sectionTitle ?? category,
    });
    remainingResults -= displayedEntities.length;
  }

  return sections;
}

function normalizeLimit(limit: number) {
  return Math.max(0, Math.floor(limit));
}
