import {
  AiConfigService,
  BaseRegistry,
  RegistryEntry,
  RegistryMetadata,
} from '../common';
import {
  McpLifecycleStatus,
  McpRegistryDiagnostics,
} from './mcp-platform.types';

export type McpRegistryMetadata = RegistryMetadata & {
  mcpEntryId: string;
};

export type McpRegistryEntry<TMetadata> = RegistryEntry<McpRegistryMetadata> & {
  mcpMetadata: TMetadata;
};

export abstract class McpRegistryBase<
  TMetadata extends {
    id: string;
    lifecycleStatus: McpLifecycleStatus;
    name: string;
    priority: number;
    version: string;
  },
> extends BaseRegistry<McpRegistryEntry<TMetadata>> {
  protected constructor(
    entries: readonly TMetadata[],
    configService: AiConfigService,
    registryName: string,
    entryType: string,
  ) {
    super(
      entries.map((entry) => ({
        mcpMetadata: entry,
        metadata: {
          enabled: entry.lifecycleStatus !== 'disabled',
          id: entry.id,
          lifecycleStatus:
            entry.lifecycleStatus === 'disabled' ? 'disabled' : 'registered',
          mcpEntryId: entry.id,
          name: entry.name,
          priority: entry.priority,
          version: entry.version,
        },
      })),
      {
        featureFlagResolver: (entry) =>
          configService.isMcpRegistryEntryEnabled(entryType, entry.metadata.id),
        registryName,
      },
    );
  }

  getDiagnostics(): McpRegistryDiagnostics {
    const diagnostics = this.getRegistryDiagnostics();

    return {
      disabledEntryIds: diagnostics.disabledEntryIds,
      enabledEntryIds: diagnostics.enabledEntryIds,
      entryCount: diagnostics.entryCount,
      registryName: diagnostics.registryName,
    };
  }

  getMetadata(): TMetadata[] {
    return this.discover().map((entry) => entry.mcpMetadata);
  }
}
