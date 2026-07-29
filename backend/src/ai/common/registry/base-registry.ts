import { Registry } from './registry.interface';
import {
  RegistryDuplicateEntryError,
  RegistryValidationError,
} from './registry-errors';
import {
  RegistryDiagnostics,
  RegistryEntry,
  RegistryOptions,
  RegistryValidationResult,
} from './registry.types';
import { RegistryUtilities } from './registry-utilities';

export abstract class BaseRegistry<
  TEntry extends RegistryEntry,
> implements Registry<TEntry> {
  private readonly entries = new Map<string, TEntry>();
  private readonly invalidEntryIds = new Set<string>();

  protected constructor(
    initialEntries: readonly TEntry[],
    private readonly options: RegistryOptions<TEntry>,
  ) {
    for (const entry of initialEntries) {
      this.register(entry);
    }
  }

  register(entry: TEntry): void {
    const validation = this.validate(entry);

    if (!validation.valid) {
      this.invalidEntryIds.add(entry.metadata.id);
      throw new RegistryValidationError(
        this.options.registryName,
        entry.metadata.id,
        validation.errors,
      );
    }

    if (this.entries.has(entry.metadata.id)) {
      throw new RegistryDuplicateEntryError(
        this.options.registryName,
        entry.metadata.id,
      );
    }

    this.entries.set(entry.metadata.id, entry);
  }

  deregister(entryId: string): boolean {
    this.invalidEntryIds.delete(entryId);

    return this.entries.delete(entryId);
  }

  discover(): readonly TEntry[] {
    return RegistryUtilities.prioritySort([...this.entries.values()]);
  }

  findEntryById(entryId: string): TEntry | null {
    return this.entries.get(entryId) ?? null;
  }

  getRegistryDiagnostics(): RegistryDiagnostics {
    const entries = this.discover();

    return {
      disabledEntryIds: entries
        .filter((entry) => !this.isEnabled(entry))
        .map((entry) => entry.metadata.id),
      duplicateEntryIds: RegistryUtilities.findDuplicateIds(entries),
      enabledEntryIds: entries
        .filter((entry) => this.isEnabled(entry))
        .map((entry) => entry.metadata.id),
      entryCount: entries.length,
      invalidEntryIds: [...this.invalidEntryIds].sort(),
      registryName: this.options.registryName,
    };
  }

  getEnabledEntries(): readonly TEntry[] {
    return this.discover().filter((entry) => this.isEnabled(entry));
  }

  setEnabled(entryId: string, enabled: boolean): boolean {
    const entry = this.entries.get(entryId);

    if (!entry) {
      return false;
    }
    const lifecycleStatus = enabled
      ? (entry.metadata.previousLifecycleStatus ?? 'registered')
      : 'disabled';
    const previousLifecycleStatus = enabled
      ? undefined
      : entry.metadata.lifecycleStatus === 'disabled'
        ? entry.metadata.previousLifecycleStatus
        : entry.metadata.lifecycleStatus;

    this.entries.set(entryId, {
      ...entry,
      metadata: {
        ...entry.metadata,
        enabled,
        lifecycleStatus,
        previousLifecycleStatus,
      },
    });

    return true;
  }

  validate(entry: TEntry): RegistryValidationResult {
    const metadataValidation = RegistryUtilities.validateMetadata(entry);
    const customValidation = this.options.validation?.(entry) ?? {
      errors: [],
      valid: true,
    };
    const errors = [...metadataValidation.errors, ...customValidation.errors];

    return {
      errors,
      valid: errors.length === 0,
    };
  }

  protected isEnabled(entry: TEntry): boolean {
    return (
      entry.metadata.enabled &&
      entry.metadata.lifecycleStatus !== 'disabled' &&
      (this.options.featureFlagResolver?.(entry) ?? true)
    );
  }
}
