export type AIEventName =
  | 'ExecutionStarted'
  | 'ExecutionStateChanged'
  | 'ExecutionCompleted'
  | 'ExecutionFailed'
  | 'ExecutionCancelled'
  | 'ExecutionTimedOut'
  | 'PipelineStarted'
  | 'PipelineCompleted'
  | 'ContextResolved'
  | 'PromptResolved'
  | 'SkillResolved'
  | 'ProviderSelected'
  | 'McpSessionOpened'
  | 'McpSessionClosed'
  | 'McpServerInitialized'
  | 'McpServerStopped'
  | 'ToolRegistered'
  | 'ResourceRegistered'
  | 'McpPromptRegistered'
  | 'McpTransportRegistered';

export type AIEventMetadata = Readonly<Record<string, unknown>>;

export type AIEvent = {
  correlationId?: string;
  eventId: string;
  metadata: AIEventMetadata;
  name: AIEventName;
  occurredAt: string;
  source: string;
};

export type AIEventHandlerResult = {
  handled: boolean;
  message?: string;
};

export type AIEventHandler = {
  handle(event: AIEvent): Promise<AIEventHandlerResult>;
  supports(eventName: AIEventName): boolean;
};

export type AIEventHandlerMetadata = {
  enabled: boolean;
  eventName: AIEventName;
  handlerId: string;
  name: string;
  priority: number;
  version: string;
};

export type AIEventPublishResult = {
  deliveredHandlerIds: readonly string[];
  event: AIEvent;
  skippedHandlerIds: readonly string[];
};

export type AIEventDiagnostics = {
  disabledHandlerIds: readonly string[];
  enabledHandlerIds: readonly string[];
  eventCount: number;
  handlerCount: number;
  lastPublishedEventName?: AIEventName;
};
