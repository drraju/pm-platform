import { AiPromptMetadata } from './prompt-platform.types';

export const builtInPromptDefinitions: AiPromptMetadata[] = [
  {
    capabilityId: 'chat',
    category: 'assistant',
    estimatedTokens: 0,
    id: 'assistant-chat-foundation',
    lifecycleStatus: 'draft',
    name: 'Assistant Chat Foundation',
    owner: 'ai-platform',
    priority: 10,
    securityClassification: 'internal',
    supportedContextTypes: ['project', 'task', 'document', 'workspace'],
    variables: [
      {
        name: 'executionContext',
        required: true,
        scope: 'execution-context',
      },
      {
        name: 'capability',
        required: true,
        scope: 'capability',
      },
    ],
    version: '1.0.0',
  },
  {
    capabilityId: 'reasoning',
    category: 'analysis',
    estimatedTokens: 0,
    id: 'reasoning-analysis-foundation',
    lifecycleStatus: 'draft',
    name: 'Reasoning Analysis Foundation',
    owner: 'ai-platform',
    priority: 20,
    securityClassification: 'internal',
    supportedContextTypes: ['project', 'raid', 'portfolio', 'workspace'],
    variables: [
      {
        name: 'executionContext',
        required: true,
        scope: 'execution-context',
      },
      {
        name: 'capability',
        required: true,
        scope: 'capability',
      },
    ],
    version: '1.0.0',
  },
  {
    capabilityId: 'structured-output',
    category: 'generation',
    estimatedTokens: 0,
    id: 'structured-output-foundation',
    lifecycleStatus: 'draft',
    name: 'Structured Output Foundation',
    owner: 'ai-platform',
    priority: 30,
    securityClassification: 'internal',
    supportedContextTypes: ['project', 'task', 'workspace'],
    variables: [
      {
        name: 'executionContext',
        required: true,
        scope: 'execution-context',
      },
      {
        name: 'capability',
        required: true,
        scope: 'capability',
      },
    ],
    version: '1.0.0',
  },
];
