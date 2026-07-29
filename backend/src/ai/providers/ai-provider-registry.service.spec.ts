import { Test } from '@nestjs/testing';
import {
  AI_PROVIDER_ADAPTERS,
  AiCapabilityRegistryService,
  AiCapabilityRoutingService,
  AiModule,
  AIProvider,
  AiProviderRegistryService,
  AiProviderRoutingService,
} from '..';

describe('AiProviderRegistryService', () => {
  it('discovers metadata-only mock provider capabilities', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AiModule],
    }).compile();

    const registry = moduleRef.get(AiProviderRegistryService);
    const providers = registry.getProviders();

    expect(providers).toHaveLength(1);
    expect(providers[0]).toMatchObject({
      authenticationType: 'none',
      availability: 'available',
      id: 'mock',
      name: 'Mock AI Provider',
      version: '1.0.0',
    });
    expect(providers[0].supportedCapabilities).toContain('chat');

    await moduleRef.close();
  });

  it('resolves providers by capability using metadata only', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AiModule],
    }).compile();

    const registry = moduleRef.get(AiProviderRegistryService);

    expect(registry.findProvidersByCapability('chat')[0]?.id).toBe('mock');
    expect(registry.findProvidersByCapability('embeddings')).toEqual([]);

    await moduleRef.close();
  });

  it('creates priority route policies without invoking providers', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AiModule],
    }).compile();

    const routing = moduleRef.get(AiProviderRoutingService);
    const policy = routing.createRoutePolicy('chat');

    expect(policy).toEqual({
      capabilityId: 'chat',
      futureFailoverEnabled: false,
      futureLoadBalancingEnabled: false,
      priorityOrderedProviderIds: ['mock'],
    });

    await moduleRef.close();
  });

  it('resolves capability routes through capability registry before provider registry', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AiModule],
    }).compile();

    const capabilities = moduleRef.get(AiCapabilityRegistryService);
    const capabilityRouting = moduleRef.get(AiCapabilityRoutingService);

    expect(capabilities.hasCapability('chat')).toBe(true);
    expect(capabilityRouting.resolveCapabilityRoute('chat')).toMatchObject({
      capabilityId: 'chat',
      selectedProvider: {
        id: 'mock',
      },
    });
    expect(
      capabilityRouting.resolveCapabilityRoute('not-registered'),
    ).toBeNull();

    await moduleRef.close();
  });

  it('keeps provider adapters behind the registry token', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AiModule],
    }).compile();

    const adapters = moduleRef.get<AIProvider[]>(AI_PROVIDER_ADAPTERS);

    expect(adapters).toHaveLength(1);
    expect(adapters[0].describeProvider().id).toBe('mock');

    await moduleRef.close();
  });
});
