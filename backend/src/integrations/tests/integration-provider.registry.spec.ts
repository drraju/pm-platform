import { Test } from '@nestjs/testing';
import {
  AuthenticationType,
  ConnectionHealth,
  IntegrationProvider,
  IntegrationProviderAdapter,
  IntegrationProviderRegistry,
  IntegrationStatus,
  ProviderCapabilities,
  ProviderType,
  SynchronizationPolicy,
} from '..';
import { INTEGRATION_PROVIDER_ADAPTERS } from '../infrastructure/integration.tokens';

function createProvider(
  providerType: ProviderType,
): IntegrationProviderAdapter {
  const provider = new IntegrationProvider(
    providerType,
    providerType,
    AuthenticationType.NONE,
    IntegrationStatus.ACTIVE,
    ProviderCapabilities.placeholder(),
    SynchronizationPolicy.disabled(),
  );

  return {
    provider,
    providerType,
    authenticate: jest.fn().mockResolvedValue({
      message: 'Not Implemented',
      status: 'not_implemented',
    }),
    capabilities: jest.fn(() => provider.capabilities),
    connect: jest.fn().mockResolvedValue({
      message: 'Not Implemented',
      status: 'not_implemented',
    }),
    disconnect: jest.fn().mockResolvedValue({
      message: 'Not Implemented',
      status: 'not_implemented',
    }),
    getResource: jest.fn().mockResolvedValue({
      id: 'resource-id',
      metadata: {},
      title: 'Resource',
      type: 'test',
    }),
    health: jest
      .fn()
      .mockResolvedValue(
        new ConnectionHealth(
          providerType,
          IntegrationStatus.ACTIVE,
          new Date(),
        ),
      ),
    listResources: jest.fn().mockResolvedValue({ resources: [] }),
    refresh: jest.fn().mockResolvedValue({
      message: 'Not Implemented',
      status: 'not_implemented',
    }),
    search: jest.fn().mockResolvedValue({ resources: [] }),
    synchronize: jest.fn().mockResolvedValue({
      message: 'Not Implemented',
      status: 'not_implemented',
    }),
    validateConfiguration: jest.fn().mockResolvedValue({
      errors: [],
      valid: true,
    }),
    webhooks: jest.fn(() => ({ events: [], supported: false })),
  };
}

describe('IntegrationProviderRegistry', () => {
  it('registers and resolves providers without direct instantiation by consumers', () => {
    const provider = createProvider(ProviderType.SLACK);
    const registry = new IntegrationProviderRegistry();

    registry.register(provider);

    expect(registry.resolve(ProviderType.SLACK)).toBe(provider);
    expect(registry.discover()).toEqual([provider]);
  });

  it('unregisters providers', () => {
    const provider = createProvider(ProviderType.GITHUB);
    const registry = new IntegrationProviderRegistry([provider]);

    registry.unregister(ProviderType.GITHUB);

    expect(registry.discover()).toEqual([]);
    expect(() => registry.resolve(ProviderType.GITHUB)).toThrow(
      'Provider not registered: github',
    );
  });

  it('prevents duplicate provider registration', () => {
    const provider = createProvider(ProviderType.ONEDRIVE);
    const registry = new IntegrationProviderRegistry([provider]);

    expect(() => registry.register(provider)).toThrow(
      'Provider already registered: onedrive',
    );
  });

  it('collects provider health through the registry', async () => {
    const provider = createProvider(ProviderType.SERVICENOW);
    const health = jest.spyOn(provider, 'health');
    const registry = new IntegrationProviderRegistry([provider]);

    const results = await registry.health();

    expect(results).toHaveLength(1);
    expect(results[0].providerType).toBe(ProviderType.SERVICENOW);
    expect(health).toHaveBeenCalledTimes(1);
  });

  it('resolves Google Drive through Nest dependency injection', async () => {
    const provider = createProvider(ProviderType.GOOGLE_DRIVE);
    const moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: INTEGRATION_PROVIDER_ADAPTERS,
          useValue: [provider],
        },
        IntegrationProviderRegistry,
      ],
    }).compile();

    const registry = moduleRef.get(IntegrationProviderRegistry);
    const resolvedProvider = registry.resolve(ProviderType.GOOGLE_DRIVE);

    expect(resolvedProvider.providerType).toBe(ProviderType.GOOGLE_DRIVE);
    await expect(resolvedProvider.connect({})).resolves.toEqual({
      message: 'Not Implemented',
      status: 'not_implemented',
    });
  });

  it('supports provider registration through the adapter injection token', async () => {
    const provider = createProvider(ProviderType.AZURE_DEVOPS);
    const moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: INTEGRATION_PROVIDER_ADAPTERS,
          useValue: [provider],
        },
        IntegrationProviderRegistry,
      ],
    }).compile();

    const registry = moduleRef.get(IntegrationProviderRegistry);

    expect(registry.resolve(ProviderType.AZURE_DEVOPS)).toBe(provider);
  });
});
