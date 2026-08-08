export const DELIVERY_VIEWS = [
  "list",
  "today",
  "board",
  "timeline",
  "history",
] as const;

export type DeliveryView = (typeof DELIVERY_VIEWS)[number];

export function isDeliveryView(value: string | null | undefined): value is DeliveryView {
  return Boolean(value && (DELIVERY_VIEWS as readonly string[]).includes(value));
}

export function parseDeliveryView(
  value: string | null | undefined,
  fallback: DeliveryView = "list",
): DeliveryView {
  return isDeliveryView(value) ? value : fallback;
}

export function getDeliveryHref(projectId: string, view: DeliveryView = "list") {
  if (view === "list") {
    return `/projects/${projectId}/delivery`;
  }
  return `/projects/${projectId}/delivery?view=${view}`;
}
