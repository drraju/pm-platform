import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  AI_CAPABILITY_DEFINITIONS,
  AiCapability,
  BaseRegistry,
  RegistryEntry,
  RegistryMetadata,
} from '../common';

export const builtInAiCapabilities: AiCapability[] = [
  {
    description: 'Conversational text interaction capability.',
    id: 'chat',
    name: 'Chat',
    requiredPermissions: [],
    riskLevel: 'low',
    version: '1.0.0',
  },
  {
    description: 'Reasoning-oriented text capability.',
    id: 'reasoning',
    name: 'Reasoning',
    requiredPermissions: [],
    riskLevel: 'medium',
    version: '1.0.0',
  },
  {
    description: 'Embedding generation capability.',
    id: 'embeddings',
    name: 'Embeddings',
    requiredPermissions: [],
    riskLevel: 'medium',
    version: '1.0.0',
  },
  {
    description: 'Vision input capability.',
    id: 'vision',
    name: 'Vision',
    requiredPermissions: [],
    riskLevel: 'medium',
    version: '1.0.0',
  },
  {
    description: 'Image generation capability.',
    id: 'image-generation',
    name: 'Image Generation',
    requiredPermissions: [],
    riskLevel: 'high',
    version: '1.0.0',
  },
  {
    description: 'Speech-to-text capability.',
    id: 'speech-to-text',
    name: 'Speech to Text',
    requiredPermissions: [],
    riskLevel: 'medium',
    version: '1.0.0',
  },
  {
    description: 'Text-to-speech capability.',
    id: 'text-to-speech',
    name: 'Text to Speech',
    requiredPermissions: [],
    riskLevel: 'medium',
    version: '1.0.0',
  },
  {
    description: 'Tool calling capability.',
    id: 'tool-calling',
    name: 'Tool Calling',
    requiredPermissions: [],
    riskLevel: 'high',
    version: '1.0.0',
  },
  {
    description: 'Structured output capability.',
    id: 'structured-output',
    name: 'Structured Output',
    requiredPermissions: [],
    riskLevel: 'medium',
    version: '1.0.0',
  },
  {
    description: 'Streaming response capability.',
    id: 'streaming',
    name: 'Streaming',
    requiredPermissions: [],
    riskLevel: 'medium',
    version: '1.0.0',
  },
];

type AiCapabilityRegistryMetadata = RegistryMetadata & {
  capabilityId: string;
};

type AiCapabilityRegistryEntry = RegistryEntry<AiCapabilityRegistryMetadata> & {
  capability: AiCapability;
};

@Injectable()
export class AiCapabilityRegistryService extends BaseRegistry<AiCapabilityRegistryEntry> {
  constructor(
    @Optional()
    @Inject(AI_CAPABILITY_DEFINITIONS)
    capabilities: AiCapability[] = builtInAiCapabilities,
  ) {
    super(
      capabilities.map((capability, index) => ({
        capability,
        metadata: {
          capabilityId: capability.id,
          enabled: true,
          id: capability.id,
          lifecycleStatus: 'registered',
          name: capability.name,
          priority: index + 1,
          version: capability.version,
        },
      })),
      {
        registryName: 'ai-capability-registry',
      },
    );
  }

  findById(capabilityId: string): AiCapability | null {
    return this.findEntryById(capabilityId)?.capability ?? null;
  }

  getCapabilities(): AiCapability[] {
    return this.discover().map((entry) => entry.capability);
  }

  hasCapability(capabilityId: string): boolean {
    return this.findById(capabilityId) !== null;
  }
}
