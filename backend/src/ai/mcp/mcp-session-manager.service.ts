import { Injectable } from '@nestjs/common';
import { AIEventBusService } from '../common';
import { McpSessionRegistryService } from './mcp-session-registry.service';
import {
  McpCapability,
  McpClientType,
  McpSessionMetadata,
} from './mcp-platform.types';

export type McpOpenSessionRequest = {
  capabilities: readonly McpCapability[];
  clientId: string;
  clientType: McpClientType;
  connectionId: string;
  protocolVersion: string;
  sessionId: string;
};

@Injectable()
export class McpSessionManagerService {
  constructor(
    private readonly eventBus: AIEventBusService,
    private readonly sessionRegistry: McpSessionRegistryService,
  ) {}

  async closeSession(sessionId: string): Promise<McpSessionMetadata | null> {
    const closedAt = new Date().toISOString();
    const session = this.sessionRegistry.closeSession(sessionId, closedAt);

    if (session) {
      await this.eventBus.publish({
        eventId: `McpSessionClosed:${sessionId}:${closedAt}`,
        metadata: session,
        name: 'McpSessionClosed',
        occurredAt: closedAt,
        source: 'mcp-session-manager',
      });
    }

    return session;
  }

  async openSession(
    request: McpOpenSessionRequest,
  ): Promise<McpSessionMetadata> {
    const createdAt = new Date().toISOString();
    const session: McpSessionMetadata = {
      capabilities: request.capabilities,
      clientId: request.clientId,
      clientType: request.clientType,
      connectionId: request.connectionId,
      createdAt,
      lastActivityAt: createdAt,
      protocolVersion: request.protocolVersion,
      sessionId: request.sessionId,
      state: 'active',
    };

    this.sessionRegistry.registerSession(session);
    await this.eventBus.publish({
      eventId: `McpSessionOpened:${request.sessionId}:${createdAt}`,
      metadata: session,
      name: 'McpSessionOpened',
      occurredAt: createdAt,
      source: 'mcp-session-manager',
    });

    return session;
  }
}
