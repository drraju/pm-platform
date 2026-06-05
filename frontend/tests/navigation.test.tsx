import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/layout/app-shell";

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

describe("AppShell", () => {
  it("renders primary navigation and page content", () => {
    render(
      <AppShell>
        <h1>Workspace content</h1>
      </AppShell>,
    );

    expect(screen.getAllByRole("link", { name: /dashboard/i })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: /projects/i })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: /dashboard/i })[0]).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getAllByRole("link", { name: /projects/i })[0]).toHaveAttribute(
      "href",
      "/projects",
    );
    expect(screen.getByText("Workspace content")).toBeInTheDocument();
  });
});
