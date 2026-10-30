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

  it("keeps Overview and Team and hides later project rooms", () => {
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

    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute(
      "href",
      "/projects/project-123",
    );
    expect(screen.getByRole("link", { name: "Team" })).toHaveAttribute(
      "href",
      "/projects/project-123/team",
    );
    expect(screen.getByRole("link", { name: "Plan" })).toHaveAttribute(
      "href",
      "/projects/project-123/plan",
    );
    expect(screen.getByRole("link", { name: "Board" })).toHaveAttribute(
      "href",
      "/projects/project-123/board",
    );
    expect(screen.queryByRole("link", { name: "Planning" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Delivery" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Govern" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Documents" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^today$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Execution" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Tasks" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "RAID" })).toHaveAttribute(
      "href",
      "/projects/project-123/raid",
    );
  });

  it("shows Delivery for Team Members but hides Planning and Govern", () => {
    storage.set(
      "pm_platform_permissions",
      JSON.stringify(["project.read", "task.update", "raid.read"]),
    );
    storage.set("pm_platform_role_names", JSON.stringify(["TEAM_MEMBER"]));

    render(<ProjectTabs activeTab="overview" projectId="project-123" />);

    expect(screen.getByRole("link", { name: "Overview" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Delivery" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Documents" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Team" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Plan" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Planning" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Govern" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "RAID" })).toHaveAttribute(
      "href",
      "/projects/project-123/raid",
    );
  });

  it("hides RAID from accounts that cannot read it", () => {
    storage.set(
      "pm_platform_permissions",
      JSON.stringify(["project.read", "customer.read"]),
    );
    storage.set(
      "pm_platform_role_names",
      JSON.stringify(["CUSTOMER_SUCCESS_MANAGER"]),
    );

    render(<ProjectTabs activeTab="overview" projectId="project-123" />);

    expect(screen.queryByRole("link", { name: "RAID" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Overview" })).toBeInTheDocument();
  });
});
