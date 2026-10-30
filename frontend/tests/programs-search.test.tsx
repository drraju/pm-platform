import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HeaderSearch } from "@/components/layout/header-search";
import { customerProjectPath } from "@/features/customers";
import { programProjectLine } from "@/features/programs";

const push = vi.hoisted(() => vi.fn());
const searchWorkspace = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/features/search", () => ({
  flattenSearchResults: (results: {
    customers: Array<{ href: string; id: string; name: string; parent: string | null }>;
    projects: Array<{ href: string; id: string; name: string; parent: string | null }>;
    work: Array<{ href: string; id: string; name: string; parent: string | null }>;
  }) => [
    ...results.customers.map((hit) => ({ ...hit, group: "Customers" as const })),
    ...results.projects.map((hit) => ({ ...hit, group: "Projects" as const })),
    ...results.work.map((hit) => ({ ...hit, group: "Work" as const })),
  ],
  searchWorkspace,
}));

describe("header search", () => {
  it("focuses from the keyboard and opens the selected customer", async () => {
    searchWorkspace.mockResolvedValue({
      customers: [{ href: "/customers/northwind", id: "northwind", name: "Northwind", parent: null }],
      projects: [],
      work: [],
    });
    render(<HeaderSearch />);
    const field = screen.getByRole("combobox", { name: /search customers, projects, and work/i });

    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(field).toHaveFocus();

    fireEvent.change(field, { target: { value: "North" } });
    expect(await screen.findByRole("option", { name: /Northwind/i })).toBeInTheDocument();
    fireEvent.keyDown(field, { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/customers/northwind");
  });

  it("shows an empty result instead of a forbidden title", async () => {
    searchWorkspace.mockResolvedValue({ customers: [], projects: [], work: [] });
    render(<HeaderSearch />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Secret plan" } });
    expect(await screen.findByText("No matches.")).toBeInTheDocument();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });
});

describe("program and sales surfaces", () => {
  it("uses the same overdue line as a project overview", () => {
    expect(
      programProjectLine(
        [
          { dueDate: "2026-10-01", id: "leaf", parentTaskId: null, status: "todo", taskKind: "task" },
          { dueDate: "2026-10-01", id: "done", parentTaskId: null, status: "done", taskKind: "task" },
          { dueDate: "2026-10-01", id: "box", parentTaskId: null, status: "todo", taskKind: "summary" },
        ],
        "2026-10-29",
      ),
    ).toBe("1 of 2 overdue");
  });

  it("keeps a sales project as text until the person can open it", () => {
    expect(customerProjectPath({ id: "project-1", openable: false })).toBeNull();
    expect(customerProjectPath({ id: "project-1", openable: true })).toBe("/projects/project-1");
  });
});
