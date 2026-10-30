import { apiRequest } from "@/lib/api/client";

export type SearchHit = {
  href: string;
  id: string;
  name: string;
  parent: string | null;
};

export type SearchResults = {
  customers: SearchHit[];
  projects: SearchHit[];
  work: SearchHit[];
};

export function searchWorkspace(query: string) {
  return apiRequest<SearchResults>(`/search?q=${encodeURIComponent(query)}`);
}

export function flattenSearchResults(results: SearchResults) {
  return [
    ...results.customers.map((hit) => ({ ...hit, group: "Customers" as const })),
    ...results.projects.map((hit) => ({ ...hit, group: "Projects" as const })),
    ...results.work.map((hit) => ({ ...hit, group: "Work" as const })),
  ];
}
