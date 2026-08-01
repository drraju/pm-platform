export type ContextType =
  | 'execution'
  | 'project'
  | 'task'
  | 'document'
  | 'raid'
  | 'team'
  | 'user'
  | 'calendar'
  | 'portfolio'
  | 'workspace';

export type ResourceReferenceType = ContextType;

export type CapabilityType =
  | 'chat'
  | 'reasoning'
  | 'embeddings'
  | 'vision'
  | 'image-generation'
  | 'speech-to-text'
  | 'text-to-speech'
  | 'tool-calling'
  | 'structured-output'
  | 'streaming'
  | (string & {});

export type PromptCategory =
  | 'assistant'
  | 'analysis'
  | 'summarization'
  | 'generation'
  | 'governance'
  | 'integration';

export type ProviderFeature =
  | 'chat'
  | 'reasoning'
  | 'structured-output'
  | 'streaming'
  | 'tool-calling'
  | 'vision'
  | (string & {});

export type ResourceReference = {
  id?: string;
  type: ResourceReferenceType;
};

export type SecurityMetadata = Readonly<Record<string, unknown>>;

export type AuditMetadata = Readonly<Record<string, unknown>>;

export type TelemetryMetadata = Readonly<Record<string, unknown>>;
