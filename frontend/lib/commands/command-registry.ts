import {
  defaultCommandFilter,
  type CommandFilter,
} from "./filter";
import type {
  CommandDefinition,
  CommandExecutionContext,
  CommandProvider,
} from "./types";

type RegisteredProvider = {
  commands: readonly CommandDefinition[];
};

export class DuplicateCommandIdError extends Error {
  constructor(commandId: string) {
    super(`Command ID "${commandId}" is already registered.`);
    this.name = "DuplicateCommandIdError";
  }
}

export class DuplicateCommandProviderError extends Error {
  constructor(providerId: string) {
    super(`Command provider "${providerId}" is already registered.`);
    this.name = "DuplicateCommandProviderError";
  }
}

export class CommandNotFoundError extends Error {
  constructor(commandId: string) {
    super(`Command "${commandId}" is not registered.`);
    this.name = "CommandNotFoundError";
  }
}

export class DisabledCommandError extends Error {
  constructor(commandId: string) {
    super(`Command "${commandId}" is disabled.`);
    this.name = "DisabledCommandError";
  }
}

export class CommandRegistry {
  private readonly providers = new Map<string, RegisteredProvider>();

  constructor(
    private readonly commandFilter: CommandFilter = defaultCommandFilter,
  ) {}

  registerProvider(provider: CommandProvider) {
    if (this.providers.has(provider.id)) {
      throw new DuplicateCommandProviderError(provider.id);
    }

    const commands = [...provider.getCommands()];
    const commandIds = new Set(this.getCommands().map((command) => command.id));

    for (const command of commands) {
      if (commandIds.has(command.id)) {
        throw new DuplicateCommandIdError(command.id);
      }

      commandIds.add(command.id);
    }

    this.providers.set(provider.id, { commands });
  }

  unregisterProvider(providerId: string) {
    return this.providers.delete(providerId);
  }

  getCommands() {
    return [...this.providers.values()].flatMap(({ commands }) => commands);
  }

  getEnabledCommands() {
    return this.getCommands().filter((command) => command.enabled !== false);
  }

  filterCommands(query: string) {
    return this.commandFilter(this.getEnabledCommands(), query);
  }

  async executeCommand(
    commandId: string,
    context: CommandExecutionContext = {},
  ) {
    const command = this.getCommands().find(({ id }) => id === commandId);

    if (!command) {
      throw new CommandNotFoundError(commandId);
    }

    if (command.enabled === false) {
      throw new DisabledCommandError(commandId);
    }

    await command.action?.(context);

    if (command.navigationTarget && context.navigate) {
      await context.navigate(command.navigationTarget);
    }
  }
}
