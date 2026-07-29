import { Inject, Injectable, Optional } from '@nestjs/common';
import { AIEventBusService, AI_MCP_TOOLS, AiConfigService } from '../common';
import { McpToolMetadata } from './mcp-platform.types';
import { McpRegistryBase } from './mcp-registry-base';

@Injectable()
export class McpToolRegistryService extends McpRegistryBase<McpToolMetadata> {
  constructor(
    private readonly eventBus: AIEventBusService,
    configService: AiConfigService,
    @Optional()
    @Inject(AI_MCP_TOOLS)
    tools: McpToolMetadata[] = [],
  ) {
    super(tools, configService, 'mcp-tool-registry', 'tool');
  }

  findToolById(toolId: string): McpToolMetadata | null {
    return this.findEntryById(toolId)?.mcpMetadata ?? null;
  }

  getTools(): McpToolMetadata[] {
    return this.getMetadata();
  }

  async registerToolMetadata(tool: McpToolMetadata): Promise<void> {
    this.register({
      mcpMetadata: tool,
      metadata: {
        enabled: tool.lifecycleStatus !== 'disabled',
        id: tool.id,
        lifecycleStatus:
          tool.lifecycleStatus === 'disabled' ? 'disabled' : 'registered',
        mcpEntryId: tool.id,
        name: tool.name,
        priority: tool.priority,
        version: tool.version,
      },
    });
    await this.eventBus.publish({
      eventId: `ToolRegistered:${tool.id}:${Date.now()}`,
      metadata: tool,
      name: 'ToolRegistered',
      occurredAt: new Date().toISOString(),
      source: 'mcp-tool-registry',
    });
  }
}
