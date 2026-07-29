import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  AI_PROVIDER_ADAPTERS,
  BaseRegistry,
  RegistryEntry,
  RegistryMetadata,
} from '../common';
import { AIProvider } from './ai-provider.interface';
import {
  AiProviderCapabilityId,
  AiProviderMetadata,
} from './ai-provider.types';

type AiProviderRegistryMetadata = RegistryMetadata & {
  providerId: string;
};

type AiProviderRegistryEntry = RegistryEntry<AiProviderRegistryMetadata> & {
  provider: AIProvider;
  providerMetadata: AiProviderMetadata;
};

@Injectable()
export class AiProviderRegistryService extends BaseRegistry<AiProviderRegistryEntry> {
  constructor(
    @Optional()
    @Inject(AI_PROVIDER_ADAPTERS)
    providers: AIProvider[] = [],
  ) {
    super(
      providers.map((provider) => {
        const providerMetadata = provider.describeProvider();

        return {
          provider,
          providerMetadata,
          metadata: {
            enabled: providerMetadata.availability === 'available',
            id: providerMetadata.id,
            lifecycleStatus:
              providerMetadata.availability === 'disabled'
                ? 'disabled'
                : 'registered',
            name: providerMetadata.name,
            priority: providerMetadata.priority,
            providerId: providerMetadata.id,
            version: providerMetadata.version,
          },
        };
      }),
      {
        registryName: 'ai-provider-registry',
      },
    );
  }

  findProviderById(providerId: string): AiProviderMetadata | null {
    return this.findEntryById(providerId)?.providerMetadata ?? null;
  }

  findProviderAdapterById(providerId: string): AIProvider | null {
    return this.findEntryById(providerId)?.provider ?? null;
  }

  findProvidersByCapability(
    capabilityId: AiProviderCapabilityId,
  ): AiProviderMetadata[] {
    return this.getEnabledEntries()
      .map((entry) => entry.providerMetadata)
      .filter(
        (provider) =>
          provider.availability === 'available' &&
          provider.supportedCapabilities.includes(capabilityId),
      )
      .sort((left, right) => left.priority - right.priority);
  }

  getProviders(): AiProviderMetadata[] {
    return this.discover().map((entry) => entry.providerMetadata);
  }
}
