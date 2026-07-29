import { Injectable } from '@nestjs/common';
import { AiProviderRegistryService } from './ai-provider-registry.service';
import { AiProviderRoutePolicy } from './ai-provider.types';

@Injectable()
export class AiProviderRoutingService {
  constructor(private readonly providerRegistry: AiProviderRegistryService) {}

  createRoutePolicy(capabilityId: string): AiProviderRoutePolicy {
    return {
      capabilityId,
      futureFailoverEnabled: false,
      futureLoadBalancingEnabled: false,
      priorityOrderedProviderIds: this.providerRegistry
        .findProvidersByCapability(capabilityId)
        .map((provider) => provider.id),
    };
  }
}
