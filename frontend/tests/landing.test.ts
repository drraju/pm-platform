import { describe, expect, it } from "vitest";
import {
  getDefaultDashboardPath,
  holdingExplanation,
} from "@/features/auth/default-dashboard";
import type { ApiAuthMe } from "@/lib/api/client";

function session(keys: string[], roleName = "TEAM_MEMBER"): ApiAuthMe {
  return {
    permissions: keys.map((key) => ({ id: key, key })),
    roles: [{ id: roleName, name: roleName, permissions: [] }],
    user: {
      email: "person@example.com",
      firstName: "Asha",
      id: "user-1",
      lastName: "Rao",
      role: { id: roleName, name: roleName, permissions: [] },
      status: "active",
    },
  } as ApiAuthMe;
}

describe("landing", () => {
  it("opens Today when the person can update work", () => {
    expect(getDefaultDashboardPath(session(["work.update"], "PLATFORM_ADMIN"))).toBe(
      "/today",
    );
    expect(getDefaultDashboardPath(session(["project.read", "task.update"]))).toBe(
      "/today",
    );
  });

  it("opens Customers for customer success when there is no delivery work", () => {
    expect(
      getDefaultDashboardPath(
        session(["customer.read", "customer_success.view", "customer.manage"], "CUSTOMER_SUCCESS_MANAGER"),
      ),
    ).toBe("/customers");
    expect(
      getDefaultDashboardPath(session(["customer.read", "customer.manage"], "SALES")),
    ).toBe("/customers");
  });

  it("opens Programs for an executive", () => {
    const executive = session(
      ["program.view", "executive.view", "customer.read", "project.read"],
      "EXECUTIVE",
    );

    expect(getDefaultDashboardPath(executive)).toBe("/programs");
    expect(
      holdingExplanation(executive.permissions.map((permission) => permission.key)),
    ).toBe("Nothing is assigned to this account yet.");
  });

  it("opens the project list for a customer contact", () => {
    expect(getDefaultDashboardPath(session(["project.read"], "CUSTOMER"))).toBe(
      "/projects",
    );
  });
});
