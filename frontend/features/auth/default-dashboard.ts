import type { ApiAuthMe } from "@/lib/api/client";

const EXECUTIVE_ROUTE = "/executive";
const PORTFOLIO_ROUTE = "/portfolio";
const USER_DASHBOARD_ROUTE = "/dashboard";

export function getDefaultDashboardPath(authMe: ApiAuthMe) {
  const primaryRoleName = getPrimaryRoleName(authMe);

  if (primaryRoleName === "executive") {
    return EXECUTIVE_ROUTE;
  }

  if (primaryRoleName === "portfolio manager") {
    return PORTFOLIO_ROUTE;
  }

  return USER_DASHBOARD_ROUTE;
}

function getPrimaryRoleName(authMe: ApiAuthMe) {
  return (
    authMe.user.role?.name?.trim().toLowerCase() ??
    authMe.roles[0]?.name?.trim().toLowerCase() ??
    ""
  );
}
