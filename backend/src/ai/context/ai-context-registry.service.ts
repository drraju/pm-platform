import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  AI_CONTEXT_PROVIDERS,
  AiConfigService,
  BaseRegistry,
  RegistryEntry,
  RegistryMetadata,
} from '../common';
import { ContextProvider } from './context-provider.interface';
import {
  AiContextProviderDescriptor,
  AiContextProviderSelection,
  AiContextRegistryDiagnostic,
  AiContextRequestedResource,
  AiContextSelectionRequest,
} from './context-provider.types';

type AiContextRegistryMetadata = RegistryMetadata & {
  contextProviderId: string;
};

type AiContextRegistryEntry = RegistryEntry<AiContextRegistryMetadata> & {
  descriptor: AiContextProviderDescriptor;
  provider: ContextProvider;
};

@Injectable()
export class AiContextRegistryService extends BaseRegistry<AiContextRegistryEntry> {
  constructor(
    configService: AiConfigService,
    @Optional()
    @Inject(AI_CONTEXT_PROVIDERS)
    providers: ContextProvider[] = [],
  ) {
    super(
      providers.map((provider) => {
        const descriptor = provider.describeContextProvider();

        return {
          descriptor,
          provider,
          metadata: {
            contextProviderId: descriptor.id,
            enabled: descriptor.lifecycleState !== 'disabled',
            id: descriptor.id,
            lifecycleStatus:
              descriptor.lifecycleState === 'disabled'
                ? 'disabled'
                : 'registered',
            name: descriptor.name,
            priority: descriptor.priority,
            version: descriptor.version,
          },
        };
      }),
      {
        featureFlagResolver: (entry) =>
          configService.isContextProviderEnabled(entry.metadata.id),
        registryName: 'ai-context-registry',
      },
    );
  }

  getDiagnostics(): AiContextRegistryDiagnostic {
    const diagnostics = this.getRegistryDiagnostics();

    return {
      disabledProviderIds: diagnostics.disabledEntryIds,
      enabledProviderIds: diagnostics.enabledEntryIds,
      providerCount: diagnostics.entryCount,
      providerLifecycle: this.discover().map((entry) => ({
        lifecycleState: entry.descriptor.lifecycleState,
        providerId: entry.descriptor.id,
      })),
    };
  }

  getProviders(): AiContextProviderDescriptor[] {
    return this.discover().map((entry) => entry.descriptor);
  }

  getEnabledProviders(): AiContextProviderDescriptor[] {
    return this.getEnabledEntries().map((entry) => entry.descriptor);
  }

  findProviderById(providerId: string): AiContextProviderDescriptor | null {
    return this.findEntryById(providerId)?.descriptor ?? null;
  }

  findProvidersByCapability(
    capabilityId: string,
  ): AiContextProviderDescriptor[] {
    return this.getEnabledProviders().filter((provider) =>
      provider.supportedCapabilities.includes(capabilityId),
    );
  }

  findProvidersByResource(
    requestedResource: AiContextRequestedResource,
  ): AiContextProviderDescriptor[] {
    return this.getEnabledProviders().filter((provider) =>
      provider.supportedResources.includes(requestedResource.type),
    );
  }

  async selectContextMetadata(
    request: AiContextSelectionRequest,
  ): Promise<AiContextProviderSelection[]> {
    const candidateProviders = this.resolveCandidateProviders(request);
    const selections = await Promise.all(
      candidateProviders.map(async (provider) => ({
        metadata: await provider.selectContext(request),
        provider: provider.describeContextProvider(),
      })),
    );

    return selections.filter((selection) => selection.metadata.length > 0);
  }

  private resolveCandidateProviders(
    request: AiContextSelectionRequest,
  ): ContextProvider[] {
    return this.getEnabledEntries()
      .filter((provider) => {
        const descriptor = provider.descriptor;

        return (
          descriptor.supportedCapabilities.includes(request.capabilityId) &&
          this.supportsRequestedResources(descriptor, request)
        );
      })
      .map((entry) => entry.provider);
  }

  private supportsRequestedResources(
    provider: AiContextProviderDescriptor,
    request: AiContextSelectionRequest,
  ): boolean {
    if (!request.requestedResources?.length) {
      return true;
    }

    return request.requestedResources.some((requestedResource) =>
      provider.supportedResources.includes(requestedResource.type),
    );
  }
}
