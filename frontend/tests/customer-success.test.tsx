import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CustomerSuccess } from "@/components/customers/customer-success";
import type { ApiCustomer, ApiCustomerProject } from "@/features/customers";
import { countWork, todayDate } from "@/features/work/work-count";

const customer = {
  commercialNote: "Deal terms stay with sales",
  domain: "northwind.example",
  id: "customer-1",
  lastTouch: null,
  name: "Northwind",
  owner: { email: "asha@example.com", firstName: "Asha", id: "asha", lastName: "Rao" },
  projectCount: 1,
  renewalDate: "2026-12-01",
  status: "active",
  successNote: "Renewal conversation",
} as ApiCustomer;

const projects: ApiCustomerProject[] = [
  {
    id: "project-1",
    leadName: "Asha Rao",
    name: "CapGemini",
    status: "active",
    targetFinish: null,
    work: [
      { dueDate: "2026-10-11", id: "late", parentTaskId: null, status: "todo" },
      { dueDate: "2026-11-01", id: "soon", parentTaskId: null, status: "done" },
    ],
  },
];

describe("Customer Success", () => {
  it("shows the project health line and keeps the sales note off this tab", () => {
    render(
      <CustomerSuccess
        commitments={[]}
        customer={customer}
        isSaving={false}
        onCreate={vi.fn()}
        onDismiss={vi.fn()}
        onSave={vi.fn()}
        projects={projects}
      />,
    );

    expect(screen.getByRole("link", { name: "CapGemini" })).toHaveAttribute("href", "/projects/project-1");
    expect(screen.getByText(countWork(projects[0].work ?? [], todayDate()).line)).toBeInTheDocument();
    expect(screen.getByLabelText("Success note")).toHaveValue("Renewal conversation");
    expect(screen.queryByText("Deal terms stay with sales")).not.toBeInTheDocument();
    expect(screen.queryByText("Commercial note")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Plan" })).not.toBeInTheDocument();
  });

  it("adds a commitment without putting it on the plan from this tab", () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(
      <CustomerSuccess
        commitments={[{ customerId: "customer-1", dueDate: "2026-11-02", id: "c1", projectId: "project-1", projectName: "CapGemini", status: "open", taskId: null, title: "Send the renewal brief" }]}
        customer={customer}
        isSaving={false}
        onCreate={onCreate}
        onDismiss={vi.fn()}
        onSave={vi.fn()}
        projects={projects}
      />,
    );

    expect(screen.getByText(/Open/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Accept/ })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Commitment title"), { target: { value: "Book the QBR" } });
    fireEvent.click(screen.getByRole("button", { name: "Add commitment" }));
    expect(onCreate).toHaveBeenCalledWith({ dueDate: null, projectId: "project-1", title: "Book the QBR" });
  });
});
