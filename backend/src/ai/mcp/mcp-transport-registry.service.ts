import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  AIEventBusService,
  AI_MCP_TRANSPORTS,
  AiConfigService,
} from '../common';
import { McpTransportMetadata } from './mcp-platform.types';
import { McpRegistryBase } from './mcp-registry-base';

@Injectable()
export class McpTransportRegistryService extends McpRegistryBase<McpTransportMetadata> {
  constructor(
    private readonly eventBus: AIEventBusService,
    configService: AiConfigService,
    @Optional()
    @Inject(AI_MCP_TRANSPORTS)
    transports: McpTransportMetadata[] = [],
  ) {
    super(transports, configService, 'mcp-transport-registry', 'transport');
  }

  findTransportById(transportId: string): McpTransportMetadata | null {
    return this.findEntryById(transportId)?.mcpMetadata ?? null;
  }

  getTransports(): McpTransportMetadata[] {
    return this.getMetadata();
  }

  async registerTransportMetadata(
    transport: McpTransportMetadata,
  ): Promise<void> {
    this.register({
      mcpMetadata: transport,
      metadata: {
        enabled: transport.lifecycleStatus !== 'disabled',
        id: transport.id,
        lifecycleStatus:
          transport.lifecycleStatus === 'disabled' ? 'disabled' : 'registered',
        mcpEntryId: transport.id,
        name: transport.name,
        priority: transport.priority,
        version: transport.version,
      },
    });
    await this.eventBus.publish({
      eventId: `McpTransportRegistered:${transport.id}:${Date.now()}`,
      metadata: transport,
      name: 'McpTransportRegistered',
      occurredAt: new Date().toISOString(),
      source: 'mcp-transport-registry',
    });
  }
}
