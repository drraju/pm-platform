export class RegistryDuplicateEntryError extends Error {
  constructor(registryName: string, entryId: string) {
    super(`Duplicate registry entry '${entryId}' in ${registryName}.`);
    this.name = 'RegistryDuplicateEntryError';
  }
}

export class RegistryValidationError extends Error {
  constructor(
    registryName: string,
    entryId: string,
    readonly validationErrors: readonly string[],
  ) {
    super(
      `Invalid registry entry '${entryId}' in ${registryName}: ${validationErrors.join(
        ', ',
      )}`,
    );
    this.name = 'RegistryValidationError';
  }
}
