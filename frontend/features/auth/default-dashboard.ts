import type { ApiAuthMe } from "@/lib/api/client";
import { hasAnyPermission, hasPermission } from "./permissions";

const TODAY_ROUTE = "/today";
const CUSTOMERS_ROUTE = "/customers";
const PROGRAMS_ROUTE = "/programs";
const PROJECTS_ROUTE = "/projects";
const HOLDING_ROUTE = "/start";

export function isExternalContact(roles: { name: string }[] | undefined) {
  return (
    Boolean(roles?.length) &&
    roles!.every((role) => role.name === "CUSTOMER" || role.name === "PARTNER")
  );
}

export function getLandingPath(permissionKeys: string[]) {
  if (hasAnyPermission(permissionKeys, ["work.update", "task.update"])) {
    return TODAY_ROUTE;
  }

  if (
    hasPermission(permissionKeys, "customer_success.view") ||
    (hasPermission(permissionKeys, "customer.read") &&
      !hasPermission(permissionKeys, "program.view"))
  ) {
    return CUSTOMERS_ROUTE;
  }

  if (hasPermission(permissionKeys, "program.view")) {
    return PROGRAMS_ROUTE;
  }

  if (hasPermission(permissionKeys, "project.read")) {
    return PROJECTS_ROUTE;
  }

  return HOLDING_ROUTE;
}

export function getDefaultDashboardPath(authMe: ApiAuthMe) {
  return getLandingPath(
    authMe.permissions.map((permission) => permission.key),
  );
}

export function holdingExplanation(permissionKeys: string[]) {
  if (hasPermission(permissionKeys, "program.view")) {
    return "Nothing is assigned to this account yet.";
  }

  return "Nothing is assigned to this account yet.";
}
