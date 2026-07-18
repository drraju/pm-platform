import { describe, expect, it, vi } from "vitest";
import {
  buildCommandSections,
  commandExperienceStorageKey,
  emptyCommandExperiencePreferences,
  limitCommandSections,
  readCommandExperiencePreferences,
  recordRecentCommand,
  toggleFavoriteCommand,
  writeCommandExperiencePreferences,
} from "@/features/commands";
import type { CommandDefinition } from "@/lib/commands";

describe("command experience preferences", () => {
  it("keeps recent commands newest first, unique, and within a configurable limit", () => {
    let preferences = emptyCommandExperiencePreferences();

    preferences = recordRecentCommand(preferences, "projects.open", 2);
    preferences = recordRecentCommand(preferences, "raid.open", 2);
    preferences = recordRecentCommand(preferences, "projects.open", 2);
    preferences = recordRecentCommand(preferences, "dashboard.open", 2);

    expect(preferences.recentIds).toEqual([
      "dashboard.open",
      "projects.open",
    ]);
  });

  it("toggles favorites without changing recent command history", () => {
    const initial = { favoriteIds: [], recentIds: ["dashboard.open"] };
    const added = toggleFavoriteCommand(initial, "projects.open");
    const removed = toggleFavoriteCommand(added, "projects.open");

    expect(added).toEqual({
      favoriteIds: ["projects.open"],
      recentIds: ["dashboard.open"],
    });
    expect(removed).toEqual(initial);
  });

  it("persists locally and safely normalizes stored values", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    };
    const preferences = {
      favoriteIds: ["projects.open"],
      recentIds: ["raid.open", "projects.open"],
    };

    writeCommandExperiencePreferences(storage, preferences);

    expect(storage.setItem).toHaveBeenCalledWith(
      commandExperienceStorageKey,
      JSON.stringify(preferences),
    );
    expect(readCommandExperiencePreferences(storage)).toEqual(preferences);

    values.set(
      commandExperienceStorageKey,
      JSON.stringify({
        favoriteIds: ["projects.open", "projects.open", 42],
        recentIds: ["raid.open", "raid.open", "dashboard.open"],
      }),
    );
    expect(readCommandExperiencePreferences(storage, 1)).toEqual({
      favoriteIds: ["projects.open"],
      recentIds: ["raid.open"],
    });
  });

  it("orders favorites alphabetically, then recents, then category groups", () => {
    const sections = buildCommandSections({
      commands: [
        command("portfolio.open", "Portfolio", "Navigation"),
        command("dashboard.open", "Dashboard", "Navigation"),
        command("projects.open", "Projects", "Projects"),
        command("raid.open", "RAID", "RAID"),
      ],
      favoriteIds: ["portfolio.open", "dashboard.open"],
      query: "",
      recentIds: ["projects.open", "portfolio.open"],
    });

    expect(sections.map(({ label }) => label)).toEqual([
      "Favorites",
      "Recent",
      "RAID",
    ]);
    expect(sections[0]?.commands.map(({ id }) => id)).toEqual([
      "dashboard.open",
      "portfolio.open",
    ]);
    expect(sections[1]?.commands.map(({ id }) => id)).toEqual([
      "projects.open",
    ]);
  });

  it("shows category labels only when multiple categories are present", () => {
    const oneCategory = buildCommandSections({
      commands: [
        command("dashboard.open", "Dashboard", "Navigation"),
        command("portfolio.open", "Portfolio", "Navigation"),
      ],
      favoriteIds: [],
      query: "",
      recentIds: [],
    });
    const multipleCategories = buildCommandSections({
      commands: [
        command("dashboard.open", "Dashboard", "Navigation"),
        command("projects.open", "Projects", "Projects"),
      ],
      favoriteIds: [],
      query: "",
      recentIds: [],
    });

    expect(oneCategory[0]?.label).toBeUndefined();
    expect(multipleCategories.map(({ label }) => label)).toEqual([
      "Navigation",
      "Projects",
    ]);
  });

  it("limits commands without changing favorite, recent, and category order", () => {
    const sections = buildCommandSections({
      commands: [
        command("dashboard.open", "Dashboard", "Navigation"),
        command("projects.open", "Projects", "Projects"),
        command("raid.open", "RAID", "RAID"),
      ],
      favoriteIds: ["projects.open"],
      query: "",
      recentIds: ["dashboard.open"],
    });

    expect(
      limitCommandSections(sections, 2).map(({ label, commands }) => ({
        ids: commands.map(({ id }) => id),
        label,
      })),
    ).toEqual([
      { ids: ["projects.open"], label: "Favorites" },
      { ids: ["dashboard.open"], label: "Recent" },
    ]);
  });
});

function command(
  id: string,
  title: string,
  category: string,
): CommandDefinition {
  return { category, id, title };
}
