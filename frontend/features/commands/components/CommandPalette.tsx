"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { EmptyState, ErrorState } from "@/components/foundation";
import type { CommandDefinition, CommandRegistry } from "@/lib/commands";
import type { EntityRegistry, SearchableEntity } from "@/lib/entities";
import {
  buildEntityResultSections,
  defaultEntityResultLimit,
  type EntityPresentationCatalog,
} from "@/features/entity-search";
import {
  buildCommandSections,
  defaultCommandResultLimit,
  defaultRecentCommandLimit,
  emptyCommandExperiencePreferences,
  getCommandShortcut,
  limitCommandSections,
  readCommandExperiencePreferences,
  recordRecentCommand,
  toggleFavoriteCommand,
  writeCommandExperiencePreferences,
  type CommandExperiencePreferences,
} from "../command-experience";

type CommandPaletteProps = {
  commandResultLimit?: number;
  entityPresentationCatalog?: EntityPresentationCatalog;
  entityRegistry?: EntityRegistry;
  entityResultLimit?: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (target: string) => void | Promise<void>;
  recentCommandLimit?: number;
  registry: CommandRegistry;
};

const focusableSelector = [
  "button:not([disabled]):not([tabindex='-1'])",
  "input:not([disabled]):not([tabindex='-1'])",
  "[href]",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function CommandPalette({
  commandResultLimit = defaultCommandResultLimit,
  entityPresentationCatalog,
  entityRegistry,
  entityResultLimit = defaultEntityResultLimit,
  isOpen,
  onClose,
  onNavigate,
  recentCommandLimit = defaultRecentCommandLimit,
  registry,
}: CommandPaletteProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [entityRevision, setEntityRevision] = useState(0);
  const [presentationRevision, setPresentationRevision] = useState(0);
  const [preferences, setPreferences] = useState<CommandExperiencePreferences>(
    emptyCommandExperiencePreferences,
  );
  const [query, setQuery] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const listboxId = useId();
  const commands = useMemo(
    () => registry.filterCommands(query),
    [query, registry],
  );
  const commandSections = useMemo(
    () =>
      limitCommandSections(
        buildCommandSections({
          commands,
          favoriteIds: preferences.favoriteIds,
          query,
          recentIds: preferences.recentIds,
        }),
        commandResultLimit,
      ),
    [
      commandResultLimit,
      commands,
      preferences.favoriteIds,
      preferences.recentIds,
      query,
    ],
  );
  const indexedSections = useMemo(() => {
    let index = 0;

    return commandSections.map((section) => ({
      ...section,
      commands: section.commands.map((command) => ({
        command,
        index: index++,
      })),
    }));
  }, [commandSections]);
  const displayedCommands = indexedSections.flatMap((section) =>
    section.commands.map(({ command }) => command),
  );
  const filteredEntities = useMemo(() => {
    void entityRevision;
    return entityRegistry?.filterEntities(query) ?? [];
  }, [entityRegistry, entityRevision, query]);
  const entitySections = useMemo(() => {
    void presentationRevision;
    return buildEntityResultSections({
      catalog: entityPresentationCatalog,
      entities: filteredEntities,
      resultLimit: entityResultLimit,
    });
  }, [
    entityPresentationCatalog,
    entityResultLimit,
    filteredEntities,
    presentationRevision,
  ]);
  const indexedEntitySections = useMemo(() => {
    let index = 0;

    return entitySections.map((section) => ({
      ...section,
      entities: section.entities.map((entity) => ({
        entity,
        index: index++,
      })),
    }));
  }, [entitySections]);
  const entities = indexedEntitySections.flatMap((section) =>
    section.entities.map(({ entity }) => entity),
  );
  const activeCommand =
    activeIndex < displayedCommands.length
      ? displayedCommands[activeIndex]
      : undefined;
  const activeEntity = entities[activeIndex - displayedCommands.length];
  const resultCount = displayedCommands.length + entities.length;
  const activeOptionId = activeCommand
    ? `${listboxId}-command-${activeIndex}`
    : activeEntity
      ? `${listboxId}-entity-${activeIndex - displayedCommands.length}`
      : undefined;

  useEffect(() => {
    setPreferences(
      readCommandExperiencePreferences(
        window.localStorage,
        recentCommandLimit,
      ),
    );
  }, [recentCommandLimit]);

  useEffect(() => {
    if (!entityRegistry) {
      return;
    }

    const unsubscribe = entityRegistry.subscribe(() =>
      setEntityRevision((revision) => revision + 1),
    );
    setEntityRevision((revision) => revision + 1);
    return unsubscribe;
  }, [entityRegistry]);

  useEffect(() => {
    if (!entityPresentationCatalog) {
      return;
    }

    const unsubscribe = entityPresentationCatalog.subscribe(() =>
      setPresentationRevision((revision) => revision + 1),
    );
    setPresentationRevision((revision) => revision + 1);
    return unsubscribe;
  }, [entityPresentationCatalog]);

  useEffect(() => {
    setActiveIndex((currentIndex) =>
      resultCount === 0 ? 0 : Math.min(currentIndex, resultCount - 1),
    );
  }, [resultCount]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setActiveIndex(0);
    setExecutionError(null);
    setQuery("");
    searchInputRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  function closePalette() {
    setExecutionError(null);
    onClose();
  }

  function moveActiveItem(direction: 1 | -1) {
    if (resultCount === 0) {
      return;
    }

    setActiveIndex((currentIndex) => {
      const nextIndex = currentIndex + direction;

      if (nextIndex < 0) {
        return resultCount - 1;
      }

      return nextIndex % resultCount;
    });
  }

  function updatePreferences(
    update: (
      current: CommandExperiencePreferences,
    ) => CommandExperiencePreferences,
  ) {
    setPreferences((current) => {
      const next = update(current);
      writeCommandExperiencePreferences(window.localStorage, next);
      return next;
    });
  }

  function toggleFavorite(commandId: string) {
    updatePreferences((current) =>
      toggleFavoriteCommand(current, commandId),
    );
    setActiveIndex(0);
  }

  async function execute(command: CommandDefinition) {
    setExecutionError(null);

    try {
      await registry.executeCommand(command.id, { navigate: onNavigate });
      updatePreferences((current) =>
        recordRecentCommand(current, command.id, recentCommandLimit),
      );
      closePalette();
    } catch {
      setExecutionError("The selected command could not be completed.");
    }
  }

  async function navigateToEntity(entity: SearchableEntity) {
    setExecutionError(null);

    try {
      await onNavigate(entity.navigationTarget);
      closePalette();
    } catch {
      setExecutionError("The selected entity could not be opened.");
    }
  }

  function trapFocus(event: React.KeyboardEvent<HTMLDivElement>) {
    const focusableElements = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
    );

    if (focusableElements.length === 0) {
      event.preventDefault();
      return;
    }

    const currentIndex = focusableElements.findIndex(
      (element) => element === document.activeElement,
    );
    const direction = event.shiftKey ? -1 : 1;
    const nextIndex =
      currentIndex === -1
        ? 0
        : (currentIndex + direction + focusableElements.length) %
          focusableElements.length;

    event.preventDefault();
    focusableElements[nextIndex]?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closePalette();
      return;
    }

    if (event.key === "Tab") {
      trapFocus(event);
      return;
    }

    if (
      event.altKey &&
      event.key.toLocaleLowerCase() === "f" &&
      activeCommand
    ) {
      event.preventDefault();
      toggleFavorite(activeCommand.id);
      return;
    }

    if (event.target !== searchInputRef.current) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActiveItem(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActiveItem(-1);
    } else if (event.key === "Enter") {
      if (activeCommand) {
        event.preventDefault();
        void execute(activeCommand);
      } else if (activeEntity) {
        event.preventDefault();
        void navigateToEntity(activeEntity);
      }
    }
  }

  return (
    <div
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-start bg-slate-950/50 px-3 py-[10vh] sm:px-6"
      onKeyDown={handleKeyDown}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closePalette();
        }
      }}
      ref={dialogRef}
      role="dialog"
    >
      <section className="mx-auto flex max-h-[76vh] w-full max-w-2xl flex-col overflow-hidden rounded-ui border border-ui-border bg-ui-surface shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-ui-border px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-ui-section text-slate-950" id={titleId}>
              Command palette
            </h2>
            <p className="mt-1 text-sm text-slate-600" id={descriptionId}>
              Search available commands and loaded application entities.
            </p>
          </div>
          <button
            aria-label="Close command palette"
            className="rounded-ui border border-ui-border px-3 py-1.5 text-sm font-semibold text-slate-700 outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            onClick={closePalette}
            type="button"
          >
            Esc
          </button>
        </header>

        <div className="border-b border-ui-border p-4 sm:px-5">
          <label className="sr-only" htmlFor={`${listboxId}-search`}>
            Search commands
          </label>
          <input
            aria-activedescendant={activeOptionId}
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded="true"
            aria-label="Search commands"
            autoComplete="off"
            className="h-11 w-full rounded-ui border border-slate-300 bg-white px-3 text-base text-slate-950 outline-none placeholder:text-slate-500 focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30"
            id={`${listboxId}-search`}
            onChange={(event) => {
              setActiveIndex(0);
              setExecutionError(null);
              setQuery(event.target.value);
            }}
            placeholder="Type a command, workspace, or entity name"
            ref={searchInputRef}
            role="combobox"
            type="search"
            value={query}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          {executionError ? (
            <ErrorState className="mb-3" message={executionError} />
          ) : null}

          {resultCount > 0 ? (
            <div
              aria-label="Available commands and entities"
              aria-keyshortcuts="Alt+F"
              className="space-y-4"
              id={listboxId}
              role="listbox"
            >
              {displayedCommands.length > 0 ? (
                <section aria-labelledby={`${listboxId}-commands-heading`}>
                  <h3
                    className="mb-2 px-3 text-sm font-semibold text-slate-950"
                    id={`${listboxId}-commands-heading`}
                  >
                    Commands
                  </h3>
                  <div className="space-y-4">
                    {indexedSections.map((section) => {
                      const headingId = `${listboxId}-${section.id}-heading`;

                      return (
                        <div
                          aria-labelledby={
                            section.label ? headingId : undefined
                          }
                          className="space-y-1"
                          key={section.id}
                          role={section.label ? "group" : "presentation"}
                        >
                          {section.label ? (
                            <h4
                              className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-500"
                              id={headingId}
                            >
                              {section.label}
                            </h4>
                          ) : null}
                          {section.commands.map(({ command, index }) => {
                      const isActive = index === activeIndex;
                      const isFavorite = preferences.favoriteIds.includes(
                        command.id,
                      );
                      const shortcut = getCommandShortcut(command);

                      return (
                        <div
                          className={`flex items-stretch rounded-ui transition ${
                            isActive
                              ? "bg-brand/10 text-brand ring-1 ring-inset ring-brand/20"
                              : "text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                          }`}
                          key={command.id}
                          onMouseEnter={() => setActiveIndex(index)}
                        >
                          <button
                            aria-selected={isActive}
                            className="flex min-w-0 flex-1 items-start justify-between gap-4 rounded-l-ui px-3 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1"
                            id={`${listboxId}-command-${index}`}
                            onClick={() => void execute(command)}
                            role="option"
                            tabIndex={-1}
                            type="button"
                          >
                            <span className="min-w-0">
                              <span className="block font-semibold">
                                {command.title}
                              </span>
                              {command.subtitle ? (
                                <span className="mt-0.5 block text-sm text-slate-600">
                                  {command.subtitle}
                                </span>
                              ) : null}
                            </span>
                            <span className="flex shrink-0 items-center gap-2">
                              {shortcut ? (
                                <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-sans text-xs font-medium text-slate-600 shadow-sm">
                                  {shortcut}
                                </kbd>
                              ) : null}
                              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium capitalize text-slate-600">
                                {command.category}
                              </span>
                            </span>
                          </button>
                          <button
                            aria-label={`${isFavorite ? "Remove" : "Add"} ${command.title} ${isFavorite ? "from" : "to"} favorites`}
                            aria-pressed={isFavorite}
                            className="w-10 shrink-0 rounded-r-ui text-lg text-slate-500 outline-none hover:text-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1"
                            onClick={() => toggleFavorite(command.id)}
                            tabIndex={-1}
                            title={`${isFavorite ? "Remove from" : "Add to"} favorites (Alt+F)`}
                            type="button"
                          >
                            <span aria-hidden="true">{isFavorite ? "★" : "☆"}</span>
                          </button>
                        </div>
                      );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              {entities.length > 0 ? (
                <section aria-labelledby={`${listboxId}-entities-heading`}>
                  <h3
                    className="mb-2 px-3 text-sm font-semibold text-slate-950"
                    id={`${listboxId}-entities-heading`}
                  >
                    Entities
                  </h3>
                  <div className="space-y-4">
                    {indexedEntitySections.map((section) => {
                      const headingId = `${listboxId}-${section.id}-heading`;

                      return (
                        <div
                          aria-labelledby={headingId}
                          className="space-y-1"
                          key={section.id}
                          role="group"
                        >
                          <div className="px-3">
                            <h4
                              className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                              id={headingId}
                            >
                              {section.title}
                            </h4>
                            {section.description ? (
                              <p className="mt-0.5 text-xs text-slate-500">
                                {section.description}
                              </p>
                            ) : null}
                          </div>
                          {section.entities.map(({ entity, index: entityIndex }) => {
                            const index = displayedCommands.length + entityIndex;
                            const isActive = index === activeIndex;

                            return (
                              <button
                                aria-selected={isActive}
                                className={`flex w-full items-start justify-between gap-4 rounded-ui px-3 py-3 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 ${
                                  isActive
                                    ? "bg-brand/10 text-brand ring-1 ring-inset ring-brand/20"
                                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                                }`}
                                id={`${listboxId}-entity-${entityIndex}`}
                                key={entity.id}
                                onClick={() => void navigateToEntity(entity)}
                                onMouseEnter={() => setActiveIndex(index)}
                                role="option"
                                tabIndex={-1}
                                type="button"
                              >
                                <span className="min-w-0">
                                  <span className="block font-semibold">
                                    {entity.title}
                                  </span>
                                  {entity.subtitle ? (
                                    <span className="mt-0.5 block text-sm text-slate-600">
                                      {entity.subtitle}
                                    </span>
                                  ) : null}
                                </span>
                                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                                  {entity.category}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ) : null}
            </div>
          ) : (
            <EmptyState
              as="div"
              compact
              description="Continue typing or clear the search to see available commands or entities."
              headingLevel={3}
              title="No matching commands"
            />
          )}
        </div>

        <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-ui-border bg-slate-50 px-4 py-3 text-xs text-slate-600 sm:px-5">
          <span>↑↓ Navigate</span>
          <span>Enter Open</span>
          <span>Alt+F Favorite</span>
          <span>Esc Close</span>
        </footer>
      </section>
    </div>
  );
}
