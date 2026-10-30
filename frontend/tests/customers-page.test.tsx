import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CustomersPage from "@/app/(app)/customers/page";

const customerMocks = vi.hoisted(() => ({
  getAuthMe: vi.fn(),
  getCustomers: vi.fn(),
}));

vi.mock("@/features/auth", async () => {
  const actual = await vi.importActual<typeof import("@/features/auth")>("@/features/auth");
  return {
    ...actual,
    getAuthMe: customerMocks.getAuthMe,
  };
});

vi.mock("@/features/customers", async () => {
  const actual = await vi.importActual<typeof import("@/features/customers")>(
    "@/features/customers",
  );
  return {
    ...actual,
    getCustomers: customerMocks.getCustomers,
  };
});

const northwind = {
  domain: "northwind.example",
  id: "customer-1",
  name: "Northwind",
  owner: {
    email: "asha@example.com",
    firstName: "Asha",
    id: "user-1",
    lastName: "Rao",
  },
  projectCount: 0,
  renewalDate: "2026-12-01",
  status: "active" as const,
};

describe("Customers", () => {
  beforeEach(() => {
    customerMocks.getAuthMe.mockReset();
    customerMocks.getCustomers.mockReset();
    customerMocks.getAuthMe.mockResolvedValue({
      permissions: [{ id: "customer-manage", key: "customer.manage" }],
      roles: [{ name: "CUSTOMER_SUCCESS_MANAGER" }],
      user: { id: "user-1" },
    });
    customerMocks.getCustomers.mockResolvedValue([northwind]);
  });

  it("lists name, status, owner, renewal, and project count", async () => {
    render(<CustomersPage />);

    expect(await screen.findByRole("link", { name: "Northwind" })).toHaveAttribute(
      "href",
      "/customers/customer-1",
    );
    expect(screen.getByRole("columnheader", { name: "Status" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Owner" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Renewal" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Projects" })).toBeVisible();
    expect(screen.getByText("Asha Rao")).toBeVisible();
    expect(screen.getByText("0")).toBeVisible();
    expect(customerMocks.getCustomers).toHaveBeenCalledWith("active");
  });

  it("offers Add a customer when the active book is empty", async () => {
    customerMocks.getCustomers.mockResolvedValue([]);
    render(<CustomersPage />);

    const addLinks = await screen.findAllByRole("link", { name: "Add a customer" });
    expect(addLinks.length).toBeGreaterThan(0);
    expect(addLinks[0]).toHaveAttribute("href", "/customers/new");
  });

  it("keeps a closed customer out of the active filter until All is selected", async () => {
    customerMocks.getCustomers.mockImplementation(async (status: string) =>
      status === "all" || status === "closed"
        ? [{ ...northwind, name: "Closed Book", status: "closed" }]
        : [northwind],
    );
    render(<CustomersPage />);

    expect(await screen.findByRole("link", { name: "Northwind" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Closed Book" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "all" } });

    expect(await screen.findByRole("link", { name: "Closed Book" })).toBeVisible();
    expect(customerMocks.getCustomers).toHaveBeenCalledWith("all");
  });
});
