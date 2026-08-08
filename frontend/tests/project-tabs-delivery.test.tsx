import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectTabs } from "@/components/project/project-tabs";

const storage = new Map<string, string>();

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("ProjectTabs Delivery consolidation", () => {
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      removeItem: (key: string) => {
        storage.delete(key);
      },
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
    });
  });

  it("exposes Delivery and Govern instead of Execution/Tasks/Today/RAID", () => {
    storage.set(
      "pm_platform_permissions",
      JSON.stringify([
        "project.read",
        "project.update",
        "task.update",
        "raid.read",
        "raid.update",
      ]),
    );
    storage.set(
      "pm_platform_role_names",
      JSON.stringify(["PROJECT_MANAGER"]),
    );

    render(<ProjectTabs activeTab="delivery" projectId="project-123" />);

    expect(screen.getByRole("link", { name: "Delivery" })).toHaveAttribute(
      "href",
      "/projects/project-123/delivery",
    );
    expect(screen.getByRole("link", { name: "Govern" })).toHaveAttribute(
      "href",
      "/projects/project-123/govern",
    );
    expect(screen.getByRole("link", { name: "Planning" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^today$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Execution" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Tasks" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "RAID" })).not.toBeInTheDocument();
  });

  it("shows Delivery for Team Members but hides Planning and Govern", () => {
    storage.set(
      "pm_platform_permissions",
      JSON.stringify(["project.read", "task.update", "raid.read"]),
    );
    storage.set("pm_platform_role_names", JSON.stringify(["TEAM_MEMBER"]));

    render(<ProjectTabs activeTab="overview" projectId="project-123" />);

    expect(screen.getByRole("link", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Delivery" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Documents" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Team" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Planning" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Govern" })).not.toBeInTheDocument();
  });
});
