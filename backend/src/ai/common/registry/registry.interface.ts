import {
  RegistryDiagnostics,
  RegistryEntry,
  RegistryValidationResult,
} from './registry.types';

export interface Registry<TEntry extends RegistryEntry> {
  deregister(entryId: string): boolean;
  discover(): readonly TEntry[];
  findEntryById(entryId: string): TEntry | null;
  getRegistryDiagnostics(): RegistryDiagnostics;
  getEnabledEntries(): readonly TEntry[];
  register(entry: TEntry): void;
  setEnabled(entryId: string, enabled: boolean): boolean;
  validate(entry: TEntry): RegistryValidationResult;
}
