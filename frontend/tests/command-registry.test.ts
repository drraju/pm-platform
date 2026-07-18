import { describe, expect, it, vi } from "vitest";
import {
  CommandRegistry,
  DisabledCommandError,
  DuplicateCommandIdError,
  DuplicateCommandProviderError,
  type CommandDefinition,
  type CommandProvider,
} from "@/lib/commands";

describe("CommandRegistry", () => {
  it("registers providers and collects their commands in registration order", () => {
    const registry = new CommandRegistry();

    registry.registerProvider(
      provider("dashboard", [command({ id: "dashboard.open", title: "Open dashboard" })]),
    );
    registry.registerProvider(
      provider("projects", [command({ id: "projects.open", title: "Open projects" })]),
    );

    expect(registry.getCommands().map(({ id }) => id)).toEqual([
      "dashboard.open",
      "projects.open",
    ]);
  });

  it("rejects duplicate provider IDs without changing the registry", () => {
    const registry = new CommandRegistry();
    registry.registerProvider(provider("projects", [command()]));

    expect(() =>
      registry.registerProvider(
        provider("projects", [command({ id: "projects.create" })]),
      ),
    ).toThrow(DuplicateCommandProviderError);
    expect(registry.getCommands()).toHaveLength(1);
  });

  it("rejects duplicate command IDs across and within providers", () => {
    const registry = new CommandRegistry();
    registry.registerProvider(provider("dashboard", [command()]));

    expect(() =>
      registry.registerProvider(
        provider("projects", [command({ title: "Duplicate command" })]),
      ),
    ).toThrow(DuplicateCommandIdError);
    expect(() =>
      new CommandRegistry().registerProvider(
        provider("invalid", [command(), command({ title: "Duplicate command" })]),
      ),
    ).toThrow(DuplicateCommandIdError);
    expect(registry.getCommands()).toHaveLength(1);
  });

  it("returns enabled commands and treats omitted enabled metadata as enabled", () => {
    const registry = new CommandRegistry();
    registry.registerProvider(
      provider("projects", [
        command({ id: "projects.default", enabled: undefined }),
        command({ id: "projects.enabled", enabled: true }),
        command({ id: "projects.disabled", enabled: false }),
      ]),
    );

    expect(registry.getEnabledCommands().map(({ id }) => id)).toEqual([
      "projects.default",
      "projects.enabled",
    ]);
  });

  it("filters enabled commands across titles, subtitles, categories, and keywords", () => {
    const registry = new CommandRegistry();
    registry.registerProvider(
      provider("projects", [
        command({
          category: "navigation",
          id: "projects.open",
          keywords: ["delivery", "workspace"],
          subtitle: "Review project health",
          title: "Open projects",
        }),
        command({
          category: "administration",
          enabled: false,
          id: "projects.archive",
          keywords: ["delivery"],
          title: "Archive project",
        }),
      ]),
    );

    expect(registry.filterCommands("PROJECT health")).toHaveLength(1);
    expect(registry.filterCommands("delivery navigation")[0]?.id).toBe(
      "projects.open",
    );
    expect(registry.filterCommands("archive")).toEqual([]);
    expect(registry.filterCommands("  ")).toEqual(registry.getEnabledCommands());
  });

  it("supports an injected command filtering strategy", () => {
    const filter = vi.fn((commands: readonly CommandDefinition[]) => [
      ...commands,
    ].reverse());
    const registry = new CommandRegistry(filter);
    registry.registerProvider(
      provider("projects", [
        command({ id: "projects.first" }),
        command({ id: "projects.second" }),
      ]),
    );

    expect(registry.filterCommands("ignored").map(({ id }) => id)).toEqual([
      "projects.second",
      "projects.first",
    ]);
    expect(filter).toHaveBeenCalledWith(registry.getEnabledCommands(), "ignored");
  });

  it("unregisters a provider and releases its command IDs", () => {
    const registry = new CommandRegistry();
    registry.registerProvider(provider("projects", [command()]));

    expect(registry.unregisterProvider("projects")).toBe(true);
    expect(registry.unregisterProvider("projects")).toBe(false);
    expect(registry.getCommands()).toEqual([]);

    expect(() =>
      registry.registerProvider(provider("portfolio", [command()])),
    ).not.toThrow();
  });

  it("executes callbacks and delegates optional navigation through the context", async () => {
    const action = vi.fn();
    const navigate = vi.fn();
    const registry = new CommandRegistry();
    registry.registerProvider(
      provider("projects", [
        command({ action, navigationTarget: "/projects/project-1" }),
        command({ id: "projects.disabled", enabled: false }),
      ]),
    );

    await registry.executeCommand("projects.open", { navigate });

    expect(action).toHaveBeenCalledWith({ navigate });
    expect(navigate).toHaveBeenCalledWith("/projects/project-1");
    await expect(
      registry.executeCommand("projects.disabled"),
    ).rejects.toBeInstanceOf(DisabledCommandError);
  });
});

function command(
  overrides: Partial<CommandDefinition> = {},
): CommandDefinition {
  return {
    category: "navigation",
    id: "projects.open",
    title: "Open projects",
    ...overrides,
  };
}

function provider(
  id: string,
  commands: readonly CommandDefinition[],
): CommandProvider {
  return {
    id,
    getCommands: () => commands,
  };
}
