import { Inject, Injectable, Optional } from '@nestjs/common';
import { ConnectionHealth, ProviderType } from '../../domain';
import { IntegrationProviderAdapter } from '../ports/integration-provider.interface';
import { INTEGRATION_PROVIDER_ADAPTERS } from '../../infrastructure/integration.tokens';

@Injectable()
export class IntegrationProviderRegistry {
  private readonly providers = new Map<
    ProviderType,
    IntegrationProviderAdapter
  >();

  constructor(
    @Optional()
    @Inject(INTEGRATION_PROVIDER_ADAPTERS)
    providers: IntegrationProviderAdapter[] = [],
  ) {
    providers.forEach((provider) => this.register(provider));
  }

  discover(): IntegrationProviderAdapter[] {
    return [...this.providers.values()];
  }

  async health(): Promise<ConnectionHealth[]> {
    return Promise.all(this.discover().map((provider) => provider.health()));
  }

  register(provider: IntegrationProviderAdapter): void {
    if (this.providers.has(provider.providerType)) {
      throw new Error(`Provider already registered: ${provider.providerType}`);
    }
    this.providers.set(provider.providerType, provider);
  }

  resolve(providerType: ProviderType): IntegrationProviderAdapter {
    const provider = this.providers.get(providerType);
    if (!provider) {
      throw new Error(`Provider not registered: ${providerType}`);
    }
    return provider;
  }

  unregister(providerType: ProviderType): void {
    this.providers.delete(providerType);
  }
}
