import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProjectTable } from "@/components/projects/project-table";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a className={className} href={href}>
      {children}
    </a>
  ),
}));

describe("ProjectTable", () => {
  it("renders project rows with team count and created date", () => {
    render(
      <ProjectTable
        emptyMessage="No projects"
        isLoading={false}
        projects={[
          {
            createdAt: "2026-06-01T10:00:00.000Z",
            id: "project-1",
            members: [
              { id: "member-1", role: "manager", userId: "user-1" },
              { id: "member-2", role: "contributor", userId: "user-2" },
            ],
            name: "Customer Experience Platform Upgrade",
            owner: {
              email: "owner@example.com",
              firstName: "Ava",
              id: "user-owner",
              lastName: "Patel",
              status: "active",
            },
            status: "at_risk",
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("link", {
        name: /Customer Experience Platform Upgrade/i,
      }),
    ).toHaveAttribute("href", "/projects/project-1");
    expect(screen.getByText("at risk")).toBeInTheDocument();
    expect(screen.getByText("Ava Patel")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Jun 01, 2026")).toBeInTheDocument();
  });

  it("renders an empty state", () => {
    render(
      <ProjectTable
        emptyMessage="No projects match the current filters."
        isLoading={false}
        projects={[]}
      />,
    );

    expect(
      screen.getByText("No projects match the current filters."),
    ).toBeInTheDocument();
  });
});
