import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  AI_CONVERSATION_DEFINITIONS,
  AiConfigService,
  BaseRegistry,
  RegistryEntry,
  RegistryMetadata,
} from '../common';
import { builtInConversationDefinitions } from './built-in-conversation-definitions';
import {
  ConversationDefinitionMetadata,
  ConversationRegistryDiagnostics,
} from './conversation-platform.types';

type ConversationRegistryMetadata = RegistryMetadata & {
  conversationId: string;
};

type ConversationRegistryEntry = RegistryEntry<ConversationRegistryMetadata> & {
  conversation: ConversationDefinitionMetadata;
};

@Injectable()
export class ConversationRegistryService extends BaseRegistry<ConversationRegistryEntry> {
  constructor(
    configService: AiConfigService,
    @Optional()
    @Inject(AI_CONVERSATION_DEFINITIONS)
    conversations: ConversationDefinitionMetadata[] = builtInConversationDefinitions,
  ) {
    super(
      conversations.map((conversation) => ({
        conversation,
        metadata: {
          conversationId: conversation.id,
          enabled: conversation.lifecycleStatus !== 'retired',
          id: conversation.id,
          lifecycleStatus:
            conversation.lifecycleStatus === 'retired'
              ? 'retired'
              : 'registered',
          name: conversation.name,
          priority: conversation.priority,
          version: conversation.version,
        },
      })),
      {
        featureFlagResolver: (entry) =>
          configService.isConversationDefinitionEnabled(entry.metadata.id),
        registryName: 'ai-conversation-registry',
      },
    );
  }

  findConversationById(
    conversationId: string,
  ): ConversationDefinitionMetadata | null {
    return this.findEntryById(conversationId)?.conversation ?? null;
  }

  getConversations(): ConversationDefinitionMetadata[] {
    return this.discover().map((entry) => entry.conversation);
  }

  getDiagnostics(): ConversationRegistryDiagnostics {
    const diagnostics = this.getRegistryDiagnostics();

    return {
      conversationCount: diagnostics.entryCount,
      conversationLifecycle: this.discover().map((entry) => ({
        conversationId: entry.conversation.id,
        lifecycleStatus: entry.conversation.lifecycleStatus,
      })),
      disabledConversationIds: diagnostics.disabledEntryIds,
      enabledConversationIds: diagnostics.enabledEntryIds,
    };
  }
}
