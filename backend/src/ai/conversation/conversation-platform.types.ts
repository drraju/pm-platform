import {
  CapabilityType,
  ContextType,
  ExecutionRequestMetadata,
  PromptCategory,
  ProviderFeature,
  ResourceReference,
} from '../common';
import { AiRequest, AiResponseMode, AiScope } from '../common/types';

export type ConversationLifecycleStatus =
  | 'draft'
  | 'preview'
  | 'active'
  | 'deprecated'
  | 'retired';

export type ConversationCategory =
  | 'internal-assistant'
  | 'project'
  | 'portfolio'
  | 'governance'
  | 'external-client';

export type ConversationSessionState =
  | 'created'
  | 'active'
  | 'idle'
  | 'closed'
  | 'expired';

export type ConversationDefinitionMetadata = {
  category: ConversationCategory;
  defaultCapabilityId: CapabilityType;
  description: string;
  id: string;
  lifecycleStatus: ConversationLifecycleStatus;
  name: string;
  owner: string;
  priority: number;
  requiredPromptCategories: readonly PromptCategory[];
  requiredProviderFeatures: readonly ProviderFeature[];
  supportedContextTypes: readonly ContextType[];
  version: string;
};

export type ConversationRegistryDiagnostics = {
  conversationCount: number;
  conversationLifecycle: readonly {
    conversationId: string;
    lifecycleStatus: ConversationLifecycleStatus;
  }[];
  disabledConversationIds: readonly string[];
  enabledConversationIds: readonly string[];
};

export type ConversationSessionMetadata = {
  actorId?: string;
  clientId: string;
  conversationId: string;
  createdAt: string;
  lastActivityAt: string;
  sessionId: string;
  state: ConversationSessionState;
  tenantId?: string;
  workspaceId?: string;
};

export type ConversationMemoryMetadata = {
  classification: 'none' | 'session' | 'working' | 'long-term';
  estimatedTokenSize: number;
  expiresAt?: string;
  memoryId: string;
  retentionPolicy: 'none' | 'session-only' | 'future-persistent';
  sessionId: string;
  sourceReferences: readonly ResourceReference[];
};

export type AIRequestDescriptorInput = ExecutionRequestMetadata & {
  input: unknown;
  metadata?: Readonly<Record<string, unknown>>;
  responseMode: AiResponseMode;
};

export type ConversationPlanDiagnostics = {
  memoryMetadataIds: readonly string[];
  selectedConversationId: string;
};

export type ConversationPlan = {
  diagnostics: ConversationPlanDiagnostics;
  memoryMetadata: readonly ConversationMemoryMetadata[];
  requestDescriptor: AIRequestDescriptor;
  session: ConversationSessionMetadata;
};

export class AIRequestDescriptor {
  readonly capabilityId: string;
  readonly correlationId: string;
  readonly input: unknown;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly requestId: string;
  readonly responseMode: AiResponseMode;
  readonly scope: AiScope;

  constructor(input: AIRequestDescriptorInput) {
    this.capabilityId = input.capabilityId;
    this.correlationId = input.correlationId;
    this.input = input.input;
    this.metadata = Object.freeze({ ...(input.metadata ?? {}) });
    this.requestId = input.requestId;
    this.responseMode = input.responseMode;
    this.scope = Object.freeze({ ...input.scope });
    Object.freeze(this);
  }

  toAiRequest(): AiRequest {
    return {
      capabilityId: this.capabilityId,
      correlationId: this.correlationId,
      input: this.input,
      metadata: this.metadata,
      requestId: this.requestId,
      responseMode: this.responseMode,
      scope: this.scope,
    };
  }
}
