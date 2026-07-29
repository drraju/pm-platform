import { BaseRegistry } from './base-registry';
import { RegistryEntry, RegistryMetadata } from './registry.types';

type TestRegistryEntry = RegistryEntry<RegistryMetadata> & {
  value: string;
};

class TestRegistry extends BaseRegistry<TestRegistryEntry> {
  constructor(entries: readonly TestRegistryEntry[] = []) {
    super(entries, {
      featureFlagResolver: (entry) => entry.metadata.id !== 'flagged-off',
      registryName: 'test-registry',
    });
  }
}

const createEntry = (
  id: string,
  priority: number,
  enabled = true,
): TestRegistryEntry => ({
  metadata: {
    enabled,
    id,
    lifecycleStatus: enabled ? 'registered' : 'disabled',
    name: id,
    priority,
    version: '1.0.0',
  },
  value: id,
});

describe('BaseRegistry', () => {
  it('registers, discovers, and orders entries by priority', () => {
    const registry = new TestRegistry([
      createEntry('second', 20),
      createEntry('first', 10),
    ]);

    expect(registry.discover().map((entry) => entry.metadata.id)).toEqual([
      'first',
      'second',
    ]);
    expect(registry.findEntryById('first')?.value).toBe('first');
  });

  it('supports enablement, deregistration, diagnostics, and feature flags', () => {
    const registry = new TestRegistry([
      createEntry('enabled', 10),
      createEntry('disabled', 20, false),
      createEntry('flagged-off', 30),
    ]);

    expect(
      registry.getEnabledEntries().map((entry) => entry.metadata.id),
    ).toEqual(['enabled']);
    expect(registry.setEnabled('disabled', true)).toBe(true);
    expect(registry.deregister('flagged-off')).toBe(true);
    expect(registry.getRegistryDiagnostics()).toMatchObject({
      disabledEntryIds: [],
      enabledEntryIds: ['enabled', 'disabled'],
      entryCount: 2,
      registryName: 'test-registry',
    });
  });

  it('restores the previous lifecycle state when re-enabled', () => {
    const registry = new TestRegistry([
      {
        ...createEntry('preview-entry', 10),
        metadata: {
          ...createEntry('preview-entry', 10).metadata,
          lifecycleStatus: 'preview',
        },
      },
    ]);

    expect(registry.setEnabled('preview-entry', false)).toBe(true);
    expect(registry.findEntryById('preview-entry')?.metadata).toMatchObject({
      lifecycleStatus: 'disabled',
      previousLifecycleStatus: 'preview',
    });
    expect(registry.setEnabled('preview-entry', true)).toBe(true);
    expect(registry.findEntryById('preview-entry')?.metadata).toMatchObject({
      lifecycleStatus: 'preview',
    });
  });

  it('rejects duplicate entries', () => {
    const registry = new TestRegistry([createEntry('duplicate', 10)]);

    expect(() => registry.register(createEntry('duplicate', 20))).toThrow(
      "Duplicate registry entry 'duplicate' in test-registry.",
    );
  });
});
