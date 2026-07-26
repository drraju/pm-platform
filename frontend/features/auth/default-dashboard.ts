import type { ApiAuthMe } from "@/lib/api/client";
import { hasPermission } from "./permissions";

const EXECUTIVE_ROUTE = "/executive";
const PORTFOLIO_ROUTE = "/portfolio";
const USER_DASHBOARD_ROUTE = "/dashboard";

export function getDefaultDashboardPath(authMe: ApiAuthMe) {
  const permissionKeys = authMe.permissions.map((permission) => permission.key);

  if (hasPermission(permissionKeys, "executive.view")) {
    return EXECUTIVE_ROUTE;
  }

  if (hasPermission(permissionKeys, "portfolio.view")) {
    return PORTFOLIO_ROUTE;
  }

  return USER_DASHBOARD_ROUTE;
}
