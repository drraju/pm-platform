import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  AI_ENTERPRISE_CAPABILITY_DEFINITIONS,
  BaseRegistry,
  RegistryEntry,
  RegistryMetadata,
} from '../common';
import { builtInEnterpriseCapabilityDefinitions } from './built-in-enterprise-capability-definitions';
import {
  EnterpriseCapabilityMetadata,
  EnterpriseCapabilityRegistryDiagnostics,
} from './enterprise-capability.types';

type EnterpriseCapabilityEntry = RegistryEntry<RegistryMetadata & { capabilityId: string }> & {
  capability: EnterpriseCapabilityMetadata;
};

@Injectable()
export class EnterpriseCapabilityRegistryService extends BaseRegistry<EnterpriseCapabilityEntry> {
  constructor(
    @Optional()
    @Inject(AI_ENTERPRISE_CAPABILITY_DEFINITIONS)
    capabilities: EnterpriseCapabilityMetadata[] = builtInEnterpriseCapabilityDefinitions,
  ) {
    super(
      capabilities.map((capability, index) => ({
        capability,
        metadata: {
          capabilityId: capability.id,
          enabled: true,
          id: capability.id,
          lifecycleStatus: 'registered',
          name: capability.displayName,
          priority: index + 1,
          version: capability.version,
        },
      })),
      {
        registryName: 'enterprise-ai-capability-registry',
        validation: (entry) => {
          const errors = EnterpriseCapabilityRegistryService.validateMetadata(entry.capability);
          return { errors, valid: errors.length === 0 };
        },
      },
    );
  }

  findById(capabilityId: string): EnterpriseCapabilityMetadata | null {
    return this.findEntryById(capabilityId)?.capability ?? null;
  }

  getCapabilities(): EnterpriseCapabilityMetadata[] {
    return this.discover().map((entry) => entry.capability);
  }

  getDiagnostics(): EnterpriseCapabilityRegistryDiagnostics {
    const diagnostics = this.getRegistryDiagnostics();
    return {
      capabilityCount: diagnostics.entryCount,
      disabledCapabilityIds: diagnostics.disabledEntryIds,
      enabledCapabilityIds: diagnostics.enabledEntryIds,
    };
  }

  registerCapability(capability: EnterpriseCapabilityMetadata): void {
    this.register({
      capability,
      metadata: {
        capabilityId: capability.id,
        enabled: true,
        id: capability.id,
        lifecycleStatus: 'registered',
        name: capability.displayName,
        priority: this.getCapabilities().length + 1,
        version: capability.version,
      },
    });
  }

  private static validateMetadata(capability: EnterpriseCapabilityMetadata): string[] {
    return [
      capability.displayName ? '' : 'displayName is required',
      capability.description ? '' : 'description is required',
      capability.supportedSkills.length > 0 ? '' : 'at least one supported skill is required',
      capability.requiredContext.length > 0 ? '' : 'at least one required context is required',
      capability.responseType ? '' : 'responseType is required',
      capability.executionCapabilityId ? '' : 'executionCapabilityId is required',
    ].filter(Boolean);
  }
}
