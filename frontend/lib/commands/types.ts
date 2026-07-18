export type CommandCategory = string;

export type CommandIconId = string;

export type CommandNavigationHandler = (
  target: string,
) => void | Promise<void>;

export type CommandExecutionContext = {
  navigate?: CommandNavigationHandler;
};

export type CommandAction = (
  context: CommandExecutionContext,
) => void | Promise<void>;

export type CommandDefinition = {
  action?: CommandAction;
  category: CommandCategory;
  enabled?: boolean;
  icon?: CommandIconId;
  id: string;
  keywords?: readonly string[];
  navigationTarget?: string;
  subtitle?: string;
  title: string;
};

export interface CommandProvider {
  readonly id: string;
  getCommands(): readonly CommandDefinition[];
}
