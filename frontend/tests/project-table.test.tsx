import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectTable } from "@/components/projects/project-table";

const navigationMocks = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: navigationMocks.push,
  }),
}));

beforeEach(() => {
  navigationMocks.push.mockClear();
});

const projects = [
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
    health: {
      reasons: ["1 high risk open"],
      status: "AMBER" as const,
    },
    status: "at_risk",
  },
];

describe("ProjectTable", () => {
  it("renders name, customer, lead, status, and finish", () => {
    render(
      <ProjectTable
        emptyMessage="No projects"
        isLoading={false}
        onArchiveProject={vi.fn()}
        onEditProject={vi.fn()}
        projects={projects}
        canArchiveProjects
        canEditProjects
      />,
    );

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Customer")).toBeInTheDocument();
    expect(screen.getByText("Lead")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Finish")).toBeInTheDocument();
    expect(screen.queryByText("Health")).not.toBeInTheDocument();
    expect(screen.queryByText("Amber")).not.toBeInTheDocument();
    expect(screen.getByText("Ava Patel")).toBeInTheDocument();
    expect(screen.getByText("at risk")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAccessibleName(
      "Open Customer Experience Platform Upgrade",
    );
    expect(screen.getByRole("button", { name: /open/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /archive/i }),
    ).toBeInTheDocument();
  });

  it("opens a project when Enter is pressed on a row", () => {
    render(
      <ProjectTable
        emptyMessage="No projects"
        isLoading={false}
        projects={projects}
      />,
    );

    fireEvent.keyDown(screen.getByRole("link"), { key: "Enter" });

    expect(navigationMocks.push).toHaveBeenCalledWith("/projects/project-1");
  });

  it("triggers edit and archive callbacks without opening the project row", () => {
    const onEditProject = vi.fn();
    const onArchiveProject = vi.fn();

    render(
      <ProjectTable
        canArchiveProjects
        canEditProjects
        emptyMessage="No projects"
        isLoading={false}
        onArchiveProject={onArchiveProject}
        onEditProject={onEditProject}
        projects={projects}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    expect(onEditProject).toHaveBeenCalledWith(projects[0]);
    expect(navigationMocks.push).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /archive/i }));
    expect(onArchiveProject).toHaveBeenCalledWith(projects[0]);
    expect(navigationMocks.push).not.toHaveBeenCalled();
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
