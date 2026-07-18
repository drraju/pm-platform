import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/layout/app-shell";
import {
  CommandPalette,
  commandExperienceStorageKey,
  createApplicationCommandRegistry,
} from "@/features/commands";
import { EntityPresentationCatalog } from "@/features/entity-search";
import {
  CommandRegistry,
  type CommandDefinition,
} from "@/lib/commands";
import { EntityRegistry } from "@/lib/entities";

const navigationMocks = vi.hoisted(() => ({
  push: vi.fn(),
}));

const permissionKeys = [
  "dashboard.view",
  "executive.view",
  "portfolio.view",
  "project.read",
  "raid.read",
];

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: navigationMocks.push }),
}));

vi.mock("@/features/auth", () => ({
  clearSession: vi.fn(),
  getAuthMe: vi.fn(() => new Promise(() => undefined)),
  getStoredPermissionKeys: () => permissionKeys,
  hasAnyPermission: (
    availablePermissions: string[],
    requiredPermissions: string[],
  ) => requiredPermissions.some((permission) =>
    availablePermissions.includes(permission),
  ),
  storeAuthMe: vi.fn(),
}));

describe("CommandPalette", () => {
  beforeEach(() => {
    navigationMocks.push.mockReset();
    installLocalStorage();
  });

  it("opens from the header and exposes accessible dialog semantics", async () => {
    renderShell();

    fireEvent.click(openPaletteButton());

    const dialog = screen.getByRole("dialog", { name: "Command palette" });
    const search = within(dialog).getByRole("combobox", {
      name: "Search commands",
    });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(search).toHaveAttribute("aria-autocomplete", "list");
    expect(search).toHaveAttribute("aria-controls");
    expect(search).toHaveClass("focus-visible:ring-2");
    expect(within(dialog).getByRole("listbox")).toHaveAccessibleName(
      "Available commands and entities",
    );
    await waitFor(() => expect(search).toHaveFocus());
  });

  it("opens with Ctrl+K and Cmd+K and closes with Escape", async () => {
    renderShell();
    const trigger = openPaletteButton();
    trigger.focus();

    fireEvent.keyDown(document, { ctrlKey: true, key: "k" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());

    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("filters commands with the registry token filter and shows an empty state", () => {
    renderShell();
    fireEvent.click(openPaletteButton());
    const search = screen.getByRole("combobox", { name: "Search commands" });

    fireEvent.change(search, { target: { value: "leadership health" } });

    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(
      screen.getByRole("option", { name: /Executive Dashboard/i }),
    ).toBeInTheDocument();

    fireEvent.change(search, { target: { value: "no matching command" } });

    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "No matching commands" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/continue typing or clear the search/i),
    ).toBeInTheDocument();
  });

  it("uses arrow keys to select commands and Enter to navigate and close", async () => {
    renderShell();
    fireEvent.click(openPaletteButton());
    const search = screen.getByRole("combobox", { name: "Search commands" });

    expect(
      screen.getByRole("option", { name: /^Go to Dashboard\b/i }),
    ).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(search, { key: "ArrowUp" });
    expect(
      screen.getByRole("option", { name: /^Go to RAID\b/i }),
    ).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(search, { key: "ArrowDown" });
    fireEvent.keyDown(search, { key: "ArrowDown" });
    expect(
      screen.getByRole("option", { name: /Executive Dashboard/i }),
    ).toHaveAttribute("aria-selected", "true");
    expect(search).toHaveAttribute(
      "aria-activedescendant",
      screen
        .getByRole("option", { name: /Executive Dashboard/i })
        .getAttribute("id"),
    );

    fireEvent.keyDown(search, { key: "Enter" });

    await waitFor(() => {
      expect(navigationMocks.push).toHaveBeenCalledWith("/executive");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("supports mouse command execution", async () => {
    renderShell();
    fireEvent.click(openPaletteButton());

    fireEvent.click(screen.getByRole("option", { name: /Portfolio/i }));

    await waitFor(() => {
      expect(navigationMocks.push).toHaveBeenCalledWith("/portfolio");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("records successful commands newest first without duplicates", async () => {
    renderShell();
    fireEvent.click(openPaletteButton());
    fireEvent.click(screen.getByRole("option", { name: /Portfolio/i }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    fireEvent.click(openPaletteButton());

    const recent = screen.getByRole("group", { name: "Recent" });
    expect(within(recent).getAllByRole("option")[0]).toHaveAccessibleName(
      /Portfolio/i,
    );

    fireEvent.click(within(recent).getByRole("option", { name: /Portfolio/i }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    fireEvent.click(openPaletteButton());

    expect(
      within(screen.getByRole("group", { name: "Recent" })).getAllByRole(
        "option",
      ),
    ).toHaveLength(1);
  });

  it("persists favorites and sorts them alphabetically before recent commands", async () => {
    const firstRender = renderShell();
    fireEvent.click(openPaletteButton());
    fireEvent.click(
      screen.getByRole("button", { name: /add go to portfolio to favorites/i }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /add go to dashboard to favorites/i }),
    );

    const favorites = screen.getByRole("group", { name: "Favorites" });
    expect(
      within(favorites).getAllByRole("option").map((option) => option.textContent),
    ).toEqual([
      expect.stringContaining("Go to Dashboard"),
      expect.stringContaining("Go to Portfolio"),
    ]);
    expect(screen.getByText("Favorites")).toBeInTheDocument();

    firstRender.unmount();
    renderShell();
    fireEvent.click(openPaletteButton());

    expect(
      screen.getByRole("button", {
        name: /remove go to dashboard from favorites/i,
      }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(window.localStorage.getItem(commandExperienceStorageKey)).toContain(
      "dashboard.open",
    );
  });

  it("toggles the active favorite from the keyboard", () => {
    renderShell();
    fireEvent.click(openPaletteButton());
    const search = screen.getByRole("combobox", { name: "Search commands" });

    fireEvent.keyDown(search, { altKey: true, key: "f" });

    expect(
      screen.getByRole("button", {
        name: /remove go to dashboard from favorites/i,
      }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("group", { name: "Favorites" })).toBeInTheDocument();
  });

  it("renders category groups only when multiple categories are present", () => {
    renderShell();
    fireEvent.click(openPaletteButton());

    expect(screen.getByRole("group", { name: "Navigation" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Projects" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Planning" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "RAID" })).toBeInTheDocument();
  });

  it("displays an optional command shortcut without registering it globally", () => {
    const registry = new CommandRegistry();
    const shortcutCommand: CommandDefinition & { shortcut: string } = {
      category: "Navigation",
      id: "test.shortcut",
      shortcut: "G D",
      title: "Shortcut command",
    };
    registry.registerProvider({
      getCommands: () => [shortcutCommand],
      id: "test-shortcut",
    });

    render(
      <CommandPalette
        isOpen
        onClose={vi.fn()}
        onNavigate={vi.fn()}
        registry={registry}
      />,
    );

    expect(screen.getByText("G D", { selector: "kbd" })).toBeInTheDocument();
  });

  it("filters deterministically across command presentation metadata", () => {
    const registry = new CommandRegistry();
    registry.registerProvider({
      getCommands: () => [
        {
          category: "Governance",
          id: "test.governance",
          keywords: ["assurance"],
          subtitle: "Review delivery controls",
          title: "Open oversight",
        },
        {
          category: "Navigation",
          id: "test.navigation",
          title: "Open home",
        },
      ],
      id: "test-filter",
    });

    render(
      <CommandPalette
        isOpen
        onClose={vi.fn()}
        onNavigate={vi.fn()}
        registry={registry}
      />,
    );
    const search = screen.getByRole("combobox", { name: "Search commands" });

    fireEvent.change(search, {
      target: { value: "governance delivery assurance" },
    });

    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByRole("option", { name: /Open oversight/i })).toBeInTheDocument();
  });

  it("presents commands before entities and navigates entity results", async () => {
    const registry = new CommandRegistry();
    registry.registerProvider({
      getCommands: () => [
        {
          category: "Projects",
          id: "test.alpha-command",
          title: "Alpha command",
        },
      ],
      id: "test-command",
    });
    const entityRegistry = new EntityRegistry({
      pathname: "/projects",
      permissionKeys: [],
    });
    entityRegistry.registerProvider({
      getEntities: () => [
        {
          category: "Projects",
          id: "project:alpha",
          navigationTarget: "/projects/alpha",
          title: "Alpha project",
        },
      ],
      id: "test-entity",
    });
    const navigate = vi.fn();

    render(
      <CommandPalette
        entityRegistry={entityRegistry}
        isOpen
        onClose={vi.fn()}
        onNavigate={navigate}
        registry={registry}
      />,
    );
    const search = screen.getByRole("combobox", { name: "Search commands" });
    const commandsHeading = screen.getByRole("heading", { name: "Commands" });
    const entitiesHeading = screen.getByRole("heading", { name: "Entities" });

    expect(
      commandsHeading.compareDocumentPosition(entitiesHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    fireEvent.change(search, { target: { value: "alpha" } });
    expect(screen.getAllByRole("option")).toHaveLength(2);
    fireEvent.keyDown(search, { key: "ArrowDown" });
    expect(
      screen.getByRole("option", { name: /Alpha project/i }),
    ).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(search, { key: "Enter" });

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/projects/alpha"),
    );
  });

  it("renders provider metadata and applies configurable entity limits", () => {
    const registry = new CommandRegistry();
    const entityRegistry = new EntityRegistry({
      pathname: "/projects",
      permissionKeys: [],
    });
    const presentationCatalog = new EntityPresentationCatalog();
    const entityProvider = {
      getEntities: () =>
        Array.from({ length: 8 }, (_, index) => ({
          category: "Projects",
          id: `project:${index}`,
          navigationTarget: `/projects/${index}`,
          title: `Project ${index}`,
        })),
      id: "large-projects",
      presentation: {
        category: "Projects",
        maximumResults: 5,
        sectionDescription: "Loaded delivery projects.",
        sectionTitle: "Loaded Projects",
      },
    };
    entityRegistry.registerProvider(entityProvider);
    presentationCatalog.registerProvider(entityProvider);

    render(
      <CommandPalette
        entityPresentationCatalog={presentationCatalog}
        entityRegistry={entityRegistry}
        entityResultLimit={3}
        isOpen
        onClose={vi.fn()}
        onNavigate={vi.fn()}
        registry={registry}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Loaded Projects" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Loaded delivery projects.")).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("does not refilter a large entity snapshot during keyboard selection", () => {
    const registry = new CommandRegistry();
    const entityRegistry = new EntityRegistry({
      pathname: "/tasks",
      permissionKeys: [],
    });
    entityRegistry.registerProvider({
      getEntities: () =>
        Array.from({ length: 5_000 }, (_, index) => ({
          category: "Tasks",
          id: `task:${index}`,
          navigationTarget: `/projects/project-1/tasks`,
          title: `Task ${index}`,
        })),
      id: "large-tasks",
    });
    const filterEntities = vi.spyOn(entityRegistry, "filterEntities");

    render(
      <CommandPalette
        entityRegistry={entityRegistry}
        entityResultLimit={25}
        isOpen
        onClose={vi.fn()}
        onNavigate={vi.fn()}
        registry={registry}
      />,
    );
    expect(screen.getAllByRole("option")).toHaveLength(25);
    const initialFilterCalls = filterEntities.mock.calls.length;

    fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" });
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" });

    expect(filterEntities).toHaveBeenCalledTimes(initialFilterCalls);
  });

  it("traps forward and backward Tab focus within the dialog", async () => {
    renderShell();
    fireEvent.click(openPaletteButton());
    const search = screen.getByRole("combobox", { name: "Search commands" });
    const closeButton = screen.getByRole("button", {
      name: "Close command palette",
    });
    await waitFor(() => expect(search).toHaveFocus());

    fireEvent.keyDown(search, { key: "Tab" });
    expect(closeButton).toHaveFocus();

    fireEvent.keyDown(closeButton, { key: "Tab", shiftKey: true });
    expect(search).toHaveFocus();
  });

  it("registers only commands enabled by the current permissions", () => {
    const registry = createApplicationCommandRegistry({
      pathname: "/dashboard",
      permissionKeys: ["dashboard.view"],
    });

    expect(registry.getCommands()).toHaveLength(8);
    expect(registry.getEnabledCommands().map(({ id }) => id)).toEqual([
      "dashboard.open",
    ]);
  });
});

function renderShell() {
  return render(
    <AppShell>
      <h1>Command workspace</h1>
    </AppShell>,
  );
}

function openPaletteButton() {
  return screen.getByRole("button", { name: /open command palette/i });
}

function installLocalStorage() {
  const values = new Map<string, string>();

  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
}
