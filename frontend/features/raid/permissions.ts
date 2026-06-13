import { hasPermission } from "@/features/auth";

export function getRaidPermissions(
  permissionKeys: string[],
  currentUserId?: string,
) {
  return {
    canCreate: hasPermission(permissionKeys, "raid.create"),
    canDelete: hasPermission(permissionKeys, "raid.delete"),
    canUpdate: hasPermission(permissionKeys, "raid.update"),
    currentUserId,
  };
}
