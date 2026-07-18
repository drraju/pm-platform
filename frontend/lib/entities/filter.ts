import type { SearchableEntity } from "./types";

export type EntityFilter = (
  entities: readonly SearchableEntity[],
  query: string,
) => SearchableEntity[];

export const defaultEntityFilter: EntityFilter = (entities, query) => {
  const terms = normalize(query).split(" ").filter(Boolean);

  if (terms.length === 0) {
    return [...entities];
  }

  return entities.filter((entity) => {
    const searchableText = normalize(
      [
        entity.title,
        entity.subtitle,
        entity.category,
        ...(entity.keywords ?? []),
      ]
        .filter(Boolean)
        .join(" "),
    );

    return terms.every((term) => searchableText.includes(term));
  });
};

function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}
