import type { ConversationDefinitionMetadata } from './conversation-platform.types';

export const builtInConversationDefinitions: ConversationDefinitionMetadata[] =
  [
    {
      category: 'internal-assistant',
      defaultCapabilityId: 'chat',
      description:
        'Metadata contract for the internal assistant conversation foundation.',
      id: 'internal-assistant-conversation',
      lifecycleStatus: 'draft',
      name: 'Internal Assistant Conversation',
      owner: 'ai-platform',
      priority: 10,
      requiredPromptCategories: ['assistant'],
      requiredProviderFeatures: ['chat'],
      supportedContextTypes: ['project', 'task', 'workspace'],
      version: '1.0.0',
    },
  ];
