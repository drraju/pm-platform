import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UsersPage from "@/app/(app)/users/page";

const userMocks = vi.hoisted(() => ({
  createUser: vi.fn(),
  getAuthMe: vi.fn(),
  getRoles: vi.fn(),
  getUsers: vi.fn(),
}));

vi.mock("@/features/auth", () => ({
  getAuthMe: userMocks.getAuthMe,
}));

vi.mock("@/features/users", async () => {
  const actual = await vi.importActual<typeof import("@/features/users")>(
    "@/features/users",
  );
  return {
    ...actual,
    createUser: userMocks.createUser,
    disableUser: vi.fn(),
    enableUser: vi.fn(),
    getRoles: userMocks.getRoles,
    getUsers: userMocks.getUsers,
    updateUser: vi.fn(),
  };
});

const roles = [
  { id: "service", name: "SERVICE_USER" },
  { id: "cs", name: "CUSTOMER_SUCCESS_MANAGER" },
  { id: "pm", name: "PROJECT_MANAGER" },
  { id: "admin", name: "PLATFORM_ADMIN" },
];

const member = {
  id: "user-1",
  email: "member@example.com",
  firstName: "Mina",
  lastName: "Member",
  status: "active",
  createdAt: "2026-10-02T00:00:00.000Z",
  lastLoginAt: "2026-10-03T00:00:00.000Z",
  roles: [{ id: "team", name: "TEAM_MEMBER" }],
};

describe("User administration", () => {
  beforeEach(() => {
    userMocks.createUser.mockReset();
    userMocks.getAuthMe.mockReset();
    userMocks.getRoles.mockReset();
    userMocks.getUsers.mockReset();
    userMocks.getAuthMe.mockResolvedValue({
      roles: [{ name: "PLATFORM_ADMIN" }],
    });
    userMocks.getRoles.mockResolvedValue(roles);
    userMocks.getUsers.mockResolvedValue([member]);
    userMocks.createUser.mockResolvedValue(member);
  });

  it("lays out people roles with readable names and leaves service accounts off the form", async () => {
    render(<UsersPage />);

    expect(
      await screen.findByRole("checkbox", { name: /Customer Success Manager/ }),
    ).toBeVisible();
    expect(
      screen.getByRole("checkbox", { name: /Project Manager/ }),
    ).toBeVisible();
    expect(screen.getByRole("checkbox", { name: /Super Admin/ })).toBeVisible();
    expect(
      screen.queryByRole("checkbox", { name: /Service account/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Leave the password blank to invite someone who signs in with Google/),
    ).toBeVisible();
    expect(screen.getAllByText("Team Member").length).toBeGreaterThan(0);
    expect(screen.queryByText("TEAM_MEMBER")).not.toBeInTheDocument();
    expect(screen.queryByText("CUSTOMER_SUCCESS_MANAGER")).not.toBeInTheDocument();
  });

  it("creates an invited user with every selected role", async () => {
    render(<UsersPage />);

    fireEvent.change(await screen.findByLabelText("First Name"), {
      target: { value: "Asha" },
    });
    fireEvent.change(screen.getByLabelText("Last Name"), {
      target: { value: "Rao" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "asha@example.com" },
    });
    fireEvent.click(
      screen.getByRole("checkbox", { name: /Customer Success Manager/ }),
    );
    fireEvent.click(screen.getByRole("checkbox", { name: /Project Manager/ }));
    fireEvent.click(screen.getByRole("button", { name: "Create User" }));

    await waitFor(() => {
      expect(userMocks.createUser).toHaveBeenCalledWith({
        email: "asha@example.com",
        firstName: "Asha",
        lastName: "Rao",
        roleId: "pm",
        roleIds: ["pm", "cs"],
      });
    });
  });
});
