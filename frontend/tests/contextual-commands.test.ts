import { describe, expect, it, vi } from "vitest";
import {
  createApplicationCommandRegistry,
  subscribeToApplicationCommandActions,
} from "@/features/commands";

describe("contextual application commands", () => {
  it("registers workspace quick actions without replacing navigation commands", () => {
    const registry = createRegistry("/projects", [
      "dashboard.view",
      "project.create",
      "project.read",
      "task.update",
    ]);
    const enabledIds = registry.getEnabledCommands().map(({ id }) => id);

    expect(enabledIds).toEqual(
      expect.arrayContaining([
        "dashboard.open",
        "projects.open",
        "projects.new",
        "tasks.mine",
      ]),
    );
  });

  it("filters unavailable commands by workspace and permission", () => {
    const wrongWorkspace = createRegistry("/dashboard", [
      "project.create",
      "project.read",
    ]);
    const missingPermission = createRegistry("/projects", ["project.read"]);

    expect(
      wrongWorkspace.getCommands().find(({ id }) => id === "projects.new")
        ?.enabled,
    ).toBe(false);
    expect(wrongWorkspace.filterCommands("new project")).toEqual([]);
    expect(missingPermission.filterCommands("new project")).toEqual([]);
  });

  it("targets Planning, RAID, and overview routes for the current project", () => {
    const registry = createRegistry("/projects/project-42/planning", [
      "project.read",
      "raid.read",
    ]);
    const commands = registry.getEnabledCommands();

    expect(findCommand(commands, "planning.open").navigationTarget).toBe(
      "/projects/project-42/planning",
    );
    expect(findCommand(commands, "raid.open").navigationTarget).toBe(
      "/projects/project-42/raid",
    );
    expect(findCommand(commands, "project.current.open").navigationTarget).toBe(
      "/projects/project-42",
    );
  });

  it("exposes only supported RAID creation actions in the current workspace", () => {
    const raidCommands = createRegistry("/raid", ["raid.create"])
      .getEnabledCommands()
      .map(({ id }) => id);
    const riskCommands = createRegistry("/risks", ["raid.create"])
      .getEnabledCommands()
      .map(({ id }) => id);
    const issueCommands = createRegistry("/issues", ["raid.create"])
      .getEnabledCommands()
      .map(({ id }) => id);

    expect(raidCommands).toEqual(
      expect.arrayContaining(["raid.new-risk", "raid.new-issue"]),
    );
    expect(riskCommands).toContain("raid.new-risk");
    expect(riskCommands).not.toContain("raid.new-issue");
    expect(issueCommands).toContain("raid.new-issue");
    expect(issueCommands).not.toContain("raid.new-risk");
  });

  it("dispatches existing UI actions without invoking business services", async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToApplicationCommandActions(listener);
    const projectsRegistry = createRegistry("/projects", ["project.create"]);
    const raidRegistry = createRegistry("/projects/project-42/raid", [
      "raid.create",
    ]);

    await projectsRegistry.executeCommand("projects.new");
    await raidRegistry.executeCommand("raid.new-risk");

    expect(listener).toHaveBeenNthCalledWith(1, { type: "project.create" });
    expect(listener).toHaveBeenNthCalledWith(2, {
      projectId: "project-42",
      raidType: "risk",
      type: "raid.create",
    });
    unsubscribe();
  });

  it("executes My Tasks through the existing navigation abstraction", async () => {
    const navigate = vi.fn();
    const registry = createRegistry("/dashboard", ["task.comment"]);

    await registry.executeCommand("tasks.mine", { navigate });

    expect(navigate).toHaveBeenCalledWith("/tasks");
  });
});

function createRegistry(pathname: string, permissionKeys: string[]) {
  return createApplicationCommandRegistry({ pathname, permissionKeys });
}

function findCommand(
  commands: ReturnType<ReturnType<typeof createRegistry>["getCommands"]>,
  commandId: string,
) {
  const command = commands.find(({ id }) => id === commandId);

  expect(command).toBeDefined();
  return command!;
}
