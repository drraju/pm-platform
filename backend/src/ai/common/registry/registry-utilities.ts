import {
  RegistryEntry,
  RegistryMetadata,
  RegistryValidationResult,
} from './registry.types';

export class RegistryUtilities {
  static createMetadata(
    input: Omit<RegistryMetadata, 'enabled'> & { enabled?: boolean },
  ): RegistryMetadata {
    return {
      ...input,
      enabled: input.enabled ?? true,
    };
  }

  static findDuplicateIds<TEntry extends RegistryEntry>(
    entries: readonly TEntry[],
  ): string[] {
    const seenIds = new Set<string>();
    const duplicateIds = new Set<string>();

    for (const entry of entries) {
      if (seenIds.has(entry.metadata.id)) {
        duplicateIds.add(entry.metadata.id);
      }

      seenIds.add(entry.metadata.id);
    }

    return [...duplicateIds].sort();
  }

  static prioritySort<TEntry extends RegistryEntry>(
    entries: readonly TEntry[],
  ): TEntry[] {
    return [...entries].sort(
      (left, right) => left.metadata.priority - right.metadata.priority,
    );
  }

  static validateMetadata(entry: RegistryEntry): RegistryValidationResult {
    const errors = [
      entry.metadata.id ? '' : 'id is required',
      entry.metadata.name ? '' : 'name is required',
      entry.metadata.version ? '' : 'version is required',
      Number.isFinite(entry.metadata.priority)
        ? ''
        : 'priority must be a finite number',
    ].filter(Boolean);

    return {
      errors,
      valid: errors.length === 0,
    };
  }
}
