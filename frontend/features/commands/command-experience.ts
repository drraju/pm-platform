import type { CommandDefinition } from "@/lib/commands";

export const defaultRecentCommandLimit = 10;
export const defaultCommandResultLimit = 50;
export const commandExperienceStorageKey =
  "pm-platform.command-experience.v1";

export type CommandExperiencePreferences = {
  favoriteIds: string[];
  recentIds: string[];
};

export type CommandSection = {
  commands: CommandDefinition[];
  id: string;
  label?: string;
};

type PresentableCommand = CommandDefinition & {
  shortcut?: string;
};

export function emptyCommandExperiencePreferences(): CommandExperiencePreferences {
  return { favoriteIds: [], recentIds: [] };
}

export function readCommandExperiencePreferences(
  storage: Pick<Storage, "getItem">,
  recentLimit = defaultRecentCommandLimit,
): CommandExperiencePreferences {
  try {
    const value = storage.getItem(commandExperienceStorageKey);

    if (!value) {
      return emptyCommandExperiencePreferences();
    }

    const parsed = JSON.parse(value) as Partial<CommandExperiencePreferences>;

    return {
      favoriteIds: uniqueStrings(parsed.favoriteIds),
      recentIds: uniqueStrings(parsed.recentIds).slice(0, normalizeLimit(recentLimit)),
    };
  } catch {
    return emptyCommandExperiencePreferences();
  }
}

export function writeCommandExperiencePreferences(
  storage: Pick<Storage, "setItem">,
  preferences: CommandExperiencePreferences,
) {
  try {
    storage.setItem(commandExperienceStorageKey, JSON.stringify(preferences));
  } catch {
    // Browser storage can be unavailable or full. The in-memory experience remains usable.
  }
}

export function recordRecentCommand(
  preferences: CommandExperiencePreferences,
  commandId: string,
  recentLimit = defaultRecentCommandLimit,
): CommandExperiencePreferences {
  return {
    ...preferences,
    recentIds: [commandId, ...preferences.recentIds.filter((id) => id !== commandId)].slice(
      0,
      normalizeLimit(recentLimit),
    ),
  };
}

export function toggleFavoriteCommand(
  preferences: CommandExperiencePreferences,
  commandId: string,
): CommandExperiencePreferences {
  const isFavorite = preferences.favoriteIds.includes(commandId);

  return {
    ...preferences,
    favoriteIds: isFavorite
      ? preferences.favoriteIds.filter((id) => id !== commandId)
      : [...preferences.favoriteIds, commandId],
  };
}

export function buildCommandSections({
  commands,
  favoriteIds,
  query,
  recentIds,
}: {
  commands: readonly CommandDefinition[];
  favoriteIds: readonly string[];
  query: string;
  recentIds: readonly string[];
}): CommandSection[] {
  const categoryCount = new Set(commands.map(({ category }) => category)).size;

  if (query.trim()) {
    return categorySections(commands, categoryCount > 1);
  }

  const commandsById = new Map(commands.map((command) => [command.id, command]));
  const favorites = favoriteIds
    .map((id) => commandsById.get(id))
    .filter(isCommand)
    .sort((left, right) => left.title.localeCompare(right.title));
  const favoriteIdSet = new Set(favorites.map(({ id }) => id));
  const recent = recentIds
    .filter((id) => !favoriteIdSet.has(id))
    .map((id) => commandsById.get(id))
    .filter(isCommand);
  const surfacedIds = new Set(
    [...favorites, ...recent].map(({ id }) => id),
  );
  const remaining = commands.filter(({ id }) => !surfacedIds.has(id));

  return [
    ...(favorites.length
      ? [{ commands: favorites, id: "favorites", label: "Favorites" }]
      : []),
    ...(recent.length
      ? [{ commands: recent, id: "recent", label: "Recent" }]
      : []),
    ...categorySections(remaining, categoryCount > 1),
  ];
}

export function limitCommandSections(
  sections: readonly CommandSection[],
  resultLimit = defaultCommandResultLimit,
) {
  let remainingResults = normalizeLimit(resultLimit);

  return sections.flatMap((section) => {
    if (remainingResults === 0) {
      return [];
    }

    const commands = section.commands.slice(0, remainingResults);
    remainingResults -= commands.length;
    return commands.length ? [{ ...section, commands }] : [];
  });
}

export function getCommandShortcut(command: CommandDefinition) {
  const shortcut = (command as PresentableCommand).shortcut;
  return typeof shortcut === "string" && shortcut.trim() ? shortcut : undefined;
}

function categorySections(
  commands: readonly CommandDefinition[],
  showLabels: boolean,
) {
  const sections = new Map<string, CommandDefinition[]>();

  for (const command of commands) {
    const categoryCommands = sections.get(command.category) ?? [];
    categoryCommands.push(command);
    sections.set(command.category, categoryCommands);
  }

  return [...sections.entries()].map(([category, categoryCommands]) => ({
    commands: categoryCommands,
    id: `category-${category.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    label: showLabels ? formatCategory(category) : undefined,
  }));
}

function formatCategory(category: string) {
  return category
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toLocaleUpperCase() + word.slice(1))
    .join(" ");
}

function uniqueStrings(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.filter((item): item is string => typeof item === "string"))];
}

function normalizeLimit(limit: number) {
  return Math.max(0, Math.floor(limit));
}

function isCommand(
  command: CommandDefinition | undefined,
): command is CommandDefinition {
  return Boolean(command);
}
