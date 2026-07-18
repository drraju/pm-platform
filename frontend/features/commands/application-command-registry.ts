import { CommandRegistry } from "@/lib/commands";
import { createApplicationCommandContext } from "./application-command-context";
import { createContextualCommandProviders } from "./providers/contextual-command-providers";
import { createNavigationCommandProviders } from "./providers/navigation-command-providers";

export function createApplicationCommandRegistry(
  input: {
    pathname: string;
    permissionKeys: readonly string[];
  },
) {
  const registry = new CommandRegistry();
  const context = createApplicationCommandContext(input);
  const providers = [
    ...createNavigationCommandProviders(context),
    ...createContextualCommandProviders(context),
  ];

  for (const provider of providers) {
    registry.registerProvider(provider);
  }

  return registry;
}
