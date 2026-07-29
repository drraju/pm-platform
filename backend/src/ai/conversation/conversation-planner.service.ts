import { Injectable } from '@nestjs/common';
import { ConversationRegistryService } from './conversation-registry.service';
import { ConversationSessionRegistryService } from './conversation-session-registry.service';
import {
  AIRequestDescriptor,
  ConversationMemoryMetadata,
  ConversationPlan,
} from './conversation-platform.types';

export type ConversationPlanningRequest = {
  actorId?: string;
  capabilityId?: string;
  clientId: string;
  conversationId: string;
  correlationId: string;
  input: unknown;
  projectIds?: readonly string[];
  providerId?: string;
  requestId: string;
  sessionId: string;
  tenantId?: string;
  workspaceId?: string;
};

@Injectable()
export class ConversationPlannerService {
  constructor(
    private readonly conversationRegistry: ConversationRegistryService,
    private readonly sessionRegistry: ConversationSessionRegistryService,
  ) {}

  plan(request: ConversationPlanningRequest): ConversationPlan {
    const conversation = this.conversationRegistry.findConversationById(
      request.conversationId,
    );

    if (!conversation) {
      throw new Error(`Conversation not registered: ${request.conversationId}`);
    }
    const plannedAt = new Date().toISOString();
    const session = {
      actorId: request.actorId,
      clientId: request.clientId,
      conversationId: conversation.id,
      createdAt: plannedAt,
      lastActivityAt: plannedAt,
      sessionId: request.sessionId,
      state: 'active' as const,
      tenantId: request.tenantId,
      workspaceId: request.workspaceId,
    };
    const memoryMetadata: ConversationMemoryMetadata[] = [
      {
        classification: 'session',
        estimatedTokenSize: 0,
        memoryId: `${request.sessionId}:memory:metadata`,
        retentionPolicy: 'session-only',
        sessionId: request.sessionId,
        sourceReferences: [],
      },
    ];
    const requestDescriptor = new AIRequestDescriptor({
      capabilityId: request.capabilityId ?? conversation.defaultCapabilityId,
      correlationId: request.correlationId,
      input: request.input,
      metadata: {
        conversationId: conversation.id,
        conversationSessionId: request.sessionId,
        memoryMetadataIds: memoryMetadata.map((memory) => memory.memoryId),
        requestedProviderId: request.providerId,
      },
      requestId: request.requestId,
      responseMode: 'sync',
      scope: {
        actorId: request.actorId,
        clientId: request.clientId,
        projectIds: request.projectIds ? [...request.projectIds] : undefined,
        tenantId: request.tenantId,
        workspaceId: request.workspaceId,
      },
    });

    this.sessionRegistry.registerSession(session);

    return {
      diagnostics: {
        memoryMetadataIds: memoryMetadata.map((memory) => memory.memoryId),
        selectedConversationId: conversation.id,
      },
      memoryMetadata,
      requestDescriptor,
      session,
    };
  }
}
