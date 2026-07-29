import { Inject, Injectable, Optional } from '@nestjs/common';
import { AIEventBusService, AI_MCP_PROMPTS, AiConfigService } from '../common';
import { McpPromptMetadata } from './mcp-platform.types';
import { McpRegistryBase } from './mcp-registry-base';

@Injectable()
export class McpPromptRegistryService extends McpRegistryBase<McpPromptMetadata> {
  constructor(
    private readonly eventBus: AIEventBusService,
    configService: AiConfigService,
    @Optional()
    @Inject(AI_MCP_PROMPTS)
    prompts: McpPromptMetadata[] = [],
  ) {
    super(prompts, configService, 'mcp-prompt-registry', 'prompt');
  }

  findPromptById(promptId: string): McpPromptMetadata | null {
    return this.findEntryById(promptId)?.mcpMetadata ?? null;
  }

  getPrompts(): McpPromptMetadata[] {
    return this.getMetadata();
  }

  async registerPromptMetadata(prompt: McpPromptMetadata): Promise<void> {
    this.register({
      mcpMetadata: prompt,
      metadata: {
        enabled: prompt.lifecycleStatus !== 'disabled',
        id: prompt.id,
        lifecycleStatus:
          prompt.lifecycleStatus === 'disabled' ? 'disabled' : 'registered',
        mcpEntryId: prompt.id,
        name: prompt.name,
        priority: prompt.priority,
        version: prompt.version,
      },
    });
    await this.eventBus.publish({
      eventId: `McpPromptRegistered:${prompt.id}:${Date.now()}`,
      metadata: prompt,
      name: 'McpPromptRegistered',
      occurredAt: new Date().toISOString(),
      source: 'mcp-prompt-registry',
    });
  }
}
