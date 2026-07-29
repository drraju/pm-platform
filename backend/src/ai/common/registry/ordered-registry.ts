import { BaseRegistry } from './base-registry';
import { RegistryEntry, RegistryOptions } from './registry.types';

export abstract class OrderedRegistry<
  TEntry extends RegistryEntry,
> extends BaseRegistry<TEntry> {
  protected constructor(
    initialEntries: readonly TEntry[],
    options: RegistryOptions<TEntry>,
  ) {
    super(initialEntries, options);
  }

  getOrderedEntries(): readonly TEntry[] {
    return this.discover();
  }
}
