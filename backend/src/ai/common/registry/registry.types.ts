export type RegistryLifecycleStatus =
  | 'draft'
  | 'experimental'
  | 'registered'
  | 'enabled'
  | 'preview'
  | 'disabled'
  | 'deprecated'
  | 'retired';

export type RegistryMetadata = {
  enabled: boolean;
  extensionMetadata?: Readonly<Record<string, unknown>>;
  featureFlag?: string;
  id: string;
  lifecycleStatus: RegistryLifecycleStatus;
  name: string;
  priority: number;
  previousLifecycleStatus?: Exclude<RegistryLifecycleStatus, 'disabled'>;
  version: string;
};

export type RegistryEntry<
  TMetadata extends RegistryMetadata = RegistryMetadata,
> = {
  metadata: TMetadata;
};

export type RegistryDiagnostics = {
  disabledEntryIds: readonly string[];
  duplicateEntryIds: readonly string[];
  enabledEntryIds: readonly string[];
  entryCount: number;
  invalidEntryIds: readonly string[];
  registryName: string;
};

export type RegistryValidationResult = {
  errors: readonly string[];
  valid: boolean;
};

export type RegistryValidation<TEntry extends RegistryEntry> = (
  entry: TEntry,
) => RegistryValidationResult;

export type RegistryFeatureFlagResolver<TEntry extends RegistryEntry> = (
  entry: TEntry,
) => boolean;

export type RegistryOptions<TEntry extends RegistryEntry> = {
  featureFlagResolver?: RegistryFeatureFlagResolver<TEntry>;
  registryName: string;
  validation?: RegistryValidation<TEntry>;
};
