import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeamPage from "@/app/(app)/projects/[id]/team/page";
import { ProjectWorkspaceTeam } from "@/components/projects/project-workspace-team";

const mocks = vi.hoisted(() => ({
  candidates: vi.fn(),
  add: vi.fn(),
  auth: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useParams: () => ({ id: "project-1" }) }));
vi.mock("@/components/project", () => ({
  ProjectLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ProjectLayoutLoadingState: () => <div>Loading</div>,
}));
vi.mock("@/features/projects", () => ({
  getProject: async () => ({
    id: "project-1",
    name: "Project",
    status: "active",
    ownerId: "manager",
  }),
  getProjectMemberCandidates: mocks.candidates,
}));
vi.mock("@/features/auth", async () => ({
  ...(await vi.importActual("@/features/auth")),
  getAuthMe: mocks.auth,
  storeAuthMe: vi.fn(),
}));
vi.mock("@/hooks/use-project-members", () => ({
  useProjectMembers: () => ({
    members: [],
    addMember: mocks.add,
    removeMember: vi.fn(),
    updateMember: vi.fn(),
    isLoading: false,
    isSaving: false,
  }),
}));
const customer = {
  id: "customer",
  displayName: "Customer One",
  email: "customer@example.com",
  globalRoleName: "CUSTOMER",
  allowedProjectRoles: ["viewer"],
};

describe("Project membership candidates", () => {
  beforeEach(() => {
    mocks.candidates.mockReset().mockResolvedValue([customer]);
    mocks.add.mockReset();
    mocks.auth
      .mockReset()
      .mockResolvedValue({
        user: { id: "manager" },
        roles: [{ name: "PROJECT_MANAGER" }],
        permissions: [
          { key: "project.update" },
          { key: "project.team.manage" },
        ],
      });
  });
  it("searches CUSTOMER candidates and sends viewer membership through the existing add flow", async () => {
    render(<TeamPage />);
    fireEvent.change(await screen.findByLabelText("Search members"), {
      target: { value: "Customer" },
    });
    await screen.findByRole("option", { name: /Customer One/ });
    expect(mocks.candidates).toHaveBeenLastCalledWith("project-1", "Customer");
    fireEvent.change(screen.getByLabelText("Add member"), {
      target: { value: "customer" },
    });
    expect(
      within(screen.getByLabelText("Role in project"))
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Viewer"]);
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(mocks.add).toHaveBeenCalledWith({
      userId: "customer",
      role: "viewer",
    });
  });
  it("does not request the directory for a CUSTOMER viewer", async () => {
    mocks.auth.mockResolvedValue({
      user: { id: "customer" },
      roles: [{ name: "CUSTOMER" }],
      permissions: [{ key: "project.read" }],
    });
    render(<TeamPage />);
    await screen.findByText("Team Members");
    expect(mocks.candidates).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Add member")).not.toBeInTheDocument();
  });
  it("retains all internal project roles", () => {
    render(
      <ProjectWorkspaceTeam
        members={[]}
        onAddMember={mocks.add}
        availableUsers={[
          {
            ...customer,
            id: "internal",
            globalRoleName: "TEAM_MEMBER",
            allowedProjectRoles: ["owner", "manager", "contributor", "viewer"],
          },
        ]}
      />,
    );
    fireEvent.change(screen.getByLabelText("Add member"), {
      target: { value: "internal" },
    });
    expect(
      within(screen.getByLabelText("Role in project")).getAllByRole("option"),
    ).toHaveLength(4);
  });
  it("reports candidate search failures without enabling an invalid selection", async () => {
    mocks.candidates.mockRejectedValue(new Error("Search failed"));
    render(<TeamPage />);
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Search failed"),
    );
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
  });
});
