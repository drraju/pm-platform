import type { CommandDefinition } from "./types";

export type CommandFilter = (
  commands: readonly CommandDefinition[],
  query: string,
) => CommandDefinition[];

export const defaultCommandFilter: CommandFilter = (commands, query) => {
  const terms = normalize(query).split(" ").filter(Boolean);

  if (terms.length === 0) {
    return [...commands];
  }

  return commands.filter((command) => {
    const searchableText = normalize(
      [
        command.id,
        command.title,
        command.subtitle,
        command.category,
        ...(command.keywords ?? []),
      ]
        .filter(Boolean)
        .join(" "),
    );

    return terms.every((term) => searchableText.includes(term));
  });
};

function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}
