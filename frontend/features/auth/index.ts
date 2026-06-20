export {
  clearSession,
  getAuthMe,
  getStoredAccessToken,
  getStoredPermissionKeys,
  getStoredSessionUser,
  login,
  register,
  storeAuthMe,
  storeSession,
} from "@/lib/api/client";
export type { ApiAuthMe } from "@/lib/api/client";
export { hasAnyPermission, hasPermission } from "./permissions";
export { getDefaultDashboardPath } from "./default-dashboard";
