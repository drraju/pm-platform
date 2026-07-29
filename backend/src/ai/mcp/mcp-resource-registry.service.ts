import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  AIEventBusService,
  AI_MCP_RESOURCES,
  AiConfigService,
} from '../common';
import { McpResourceMetadata } from './mcp-platform.types';
import { McpRegistryBase } from './mcp-registry-base';

@Injectable()
export class McpResourceRegistryService extends McpRegistryBase<McpResourceMetadata> {
  constructor(
    private readonly eventBus: AIEventBusService,
    configService: AiConfigService,
    @Optional()
    @Inject(AI_MCP_RESOURCES)
    resources: McpResourceMetadata[] = [],
  ) {
    super(resources, configService, 'mcp-resource-registry', 'resource');
  }

  findResourceById(resourceId: string): McpResourceMetadata | null {
    return this.findEntryById(resourceId)?.mcpMetadata ?? null;
  }

  getResources(): McpResourceMetadata[] {
    return this.getMetadata();
  }

  async registerResourceMetadata(resource: McpResourceMetadata): Promise<void> {
    this.register({
      mcpMetadata: resource,
      metadata: {
        enabled: resource.lifecycleStatus !== 'disabled',
        id: resource.id,
        lifecycleStatus:
          resource.lifecycleStatus === 'disabled' ? 'disabled' : 'registered',
        mcpEntryId: resource.id,
        name: resource.name,
        priority: resource.priority,
        version: resource.version,
      },
    });
    await this.eventBus.publish({
      eventId: `ResourceRegistered:${resource.id}:${Date.now()}`,
      metadata: resource,
      name: 'ResourceRegistered',
      occurredAt: new Date().toISOString(),
      source: 'mcp-resource-registry',
    });
  }
}
