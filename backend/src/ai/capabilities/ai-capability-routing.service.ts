import { Injectable } from '@nestjs/common';
import { AiProviderMetadata, AiProviderRegistryService } from '../providers';
import { AiCapabilityRegistryService } from './ai-capability-registry.service';

export type AiCapabilityRoute = {
  capabilityId: string;
  providers: AiProviderMetadata[];
  selectedProvider: AiProviderMetadata | null;
};

@Injectable()
export class AiCapabilityRoutingService {
  constructor(
    private readonly capabilityRegistry: AiCapabilityRegistryService,
    private readonly providerRegistry: AiProviderRegistryService,
  ) {}

  resolveCapabilityRoute(capabilityId: string): AiCapabilityRoute | null {
    const capability = this.capabilityRegistry.findById(capabilityId);

    if (!capability) {
      return null;
    }

    const providers =
      this.providerRegistry.findProvidersByCapability(capabilityId);

    return {
      capabilityId: capability.id,
      providers,
      selectedProvider: providers[0] ?? null,
    };
  }
}
