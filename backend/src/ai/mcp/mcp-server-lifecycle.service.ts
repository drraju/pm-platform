import { Injectable } from '@nestjs/common';
import { AIEventBusService } from '../common';
import { McpServerMetadata, McpServerState } from './mcp-platform.types';

@Injectable()
export class McpServerLifecycleService {
  private state: McpServerState = 'created';

  constructor(private readonly eventBus: AIEventBusService) {}

  getMetadata(): McpServerMetadata {
    return {
      capabilities: ['tools', 'resources', 'prompts'],
      name: 'PM Platform MCP Foundation',
      protocolVersion: 'metadata-only',
      state: this.state,
      version: '1.0.0',
    };
  }

  async initialize(): Promise<McpServerMetadata> {
    this.state = 'ready';
    await this.publishLifecycleEvent('McpServerInitialized');

    return this.getMetadata();
  }

  async stop(): Promise<McpServerMetadata> {
    this.state = 'stopped';
    await this.publishLifecycleEvent('McpServerStopped');

    return this.getMetadata();
  }

  private publishLifecycleEvent(
    name: 'McpServerInitialized' | 'McpServerStopped',
  ): Promise<unknown> {
    return this.eventBus.publish({
      eventId: `${name}:${Date.now()}`,
      metadata: this.getMetadata(),
      name,
      occurredAt: new Date().toISOString(),
      source: 'mcp-server-lifecycle',
    });
  }
}
