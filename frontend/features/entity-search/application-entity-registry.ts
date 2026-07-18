import { EntityRegistry } from "@/lib/entities";

export function createApplicationEntityRegistry({
  pathname,
  permissionKeys,
}: {
  pathname: string;
  permissionKeys: readonly string[];
}) {
  return new EntityRegistry({
    pathname,
    permissionKeys,
    projectId: pathname.match(/^\/projects\/([^/]+)(?:\/|$)/)?.[1],
  });
}
