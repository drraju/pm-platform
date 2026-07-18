# Global Command Framework

## Purpose

The Global Command Framework is the UI-independent extension point used by the
Command Palette and unified search experience. It defines commands, provider
registration, filtering, and execution without rendering UI or depending on
Next.js routing.

## Registry Responsibilities

`CommandRegistry` owns the provider lifecycle and the collected command set. It:

- Registers and unregisters providers by stable provider ID.
- Takes a snapshot of each provider's commands during registration.
- Rejects duplicate provider IDs and duplicate command IDs atomically.
- Returns all commands or only commands whose `enabled` value is not `false`.
- Filters enabled commands through an injectable `CommandFilter`.
- Executes command callbacks and delegates optional navigation through an
  injected execution context.

The registry does not own UI state, keyboard shortcuts, routing, permissions,
data fetching, or workspace business logic.

## Provider Responsibilities

A `CommandProvider` has a stable `id` and a `getCommands()` method. Providers
translate module capabilities into UI-agnostic `CommandDefinition` objects.
They should use namespaced command IDs such as `projects.open` and should not
depend on a command-palette component.

Each command may provide a title, subtitle, category, keywords, icon identifier,
enabled state, action callback, and navigation target. Commands are enabled by
default. Categories and icon identifiers are strings so modules can extend them
without modifying the registry.

## Extension Pattern

Future modules create a provider locally and register it with the shared
registry during their application-level integration lifecycle:

```ts
const projectsProvider: CommandProvider = {
  id: "projects",
  getCommands: () => [
    {
      id: "projects.open",
      title: "Open projects",
      category: "navigation",
      keywords: ["delivery", "workspace"],
      icon: "folder",
      navigationTarget: "/projects",
    },
  ],
};

registry.registerProvider(projectsProvider);
```

Application integration and the palette/search presentation are described
below and remain consumers of this unchanged registry contract.

## Application Integration

Stage 5.2 adds a local-state command palette at the application shell. The shell
creates a registry from permission-aware Dashboard, Executive, Portfolio,
Projects, Planning, and RAID navigation providers. The palette consumes the
existing registry filtering and execution APIs and delegates navigation to the
existing Next.js router.

The palette owns only open, query, active-item, and execution-error state. It
does not introduce a global store, provider business logic, deep-link
generation, backend search, or changes to the command framework contracts.

## Contextual Commands

Stage 5.3 supplies pathname, current project ID, and permission keys to
application-level provider factories without changing the `CommandProvider`
interface. Providers use that context to enable existing navigation and quick
actions only where the corresponding workspace and permission are available.

Quick actions dispatch typed UI intents to existing page components. The
Projects page and RAID management component respond by opening the same local
dialogs used by their existing buttons. The command layer does not submit
forms, call APIs, or reproduce project or RAID business logic.

## Command Experience

Stage 5.4 keeps usability state in the palette consumer. Recently executed and
favorite command IDs are stored in browser local storage; the registry remains
the source of command definitions and availability. Missing or disabled command
IDs are ignored when the palette resolves persisted preferences.

With an empty query, favorites are shown alphabetically, followed by recent
commands in newest-first order, then the remaining commands grouped by their
provider-supplied category. During search, the palette continues to call the
registry's deterministic token filter across title, subtitle, keywords, and
category. Optional shortcut metadata is rendered as a label only and does not
register application keyboard handlers.
