import {
  ConnectionHealth,
  IntegrationConnection,
  IntegrationProvider,
  ProviderCapabilities,
  ProviderType,
} from '../../domain';

export type IntegrationOperationStatus =
  | 'success'
  | 'failed'
  | 'not_implemented';

export type IntegrationOperationResult = Readonly<{
  message: string;
  status: IntegrationOperationStatus;
}>;

export type IntegrationConfigurationResult = Readonly<{
  errors: string[];
  valid: boolean;
}>;

export type IntegrationCommandContext = Readonly<{
  actorId?: string;
  connection?: IntegrationConnection;
  correlationId?: string;
}>;

export type IntegrationResource = Readonly<{
  id: string;
  metadata: Readonly<Record<string, unknown>>;
  title: string;
  type: string;
}>;

export type IntegrationResourceQuery = Readonly<{
  cursor?: string;
  limit?: number;
  parentId?: string;
  resourceType?: string;
}>;

export type IntegrationResourceList = Readonly<{
  cursor?: string;
  resources: IntegrationResource[];
}>;

export type IntegrationSearchQuery = Readonly<{
  limit?: number;
  query: string;
  resourceType?: string;
}>;

export type IntegrationWebhookDescriptor = Readonly<{
  events: string[];
  supported: boolean;
}>;

export interface IntegrationProviderAdapter {
  readonly provider: IntegrationProvider;
  readonly providerType: ProviderType;

  authenticate(
    context: IntegrationCommandContext,
  ): Promise<IntegrationOperationResult>;
  capabilities(): ProviderCapabilities;
  connect(
    context: IntegrationCommandContext,
  ): Promise<IntegrationOperationResult>;
  disconnect(
    context: IntegrationCommandContext,
  ): Promise<IntegrationOperationResult>;
  getResource(
    resourceId: string,
    context: IntegrationCommandContext,
  ): Promise<IntegrationResource>;
  health(context?: IntegrationCommandContext): Promise<ConnectionHealth>;
  listResources(
    query: IntegrationResourceQuery,
    context: IntegrationCommandContext,
  ): Promise<IntegrationResourceList>;
  refresh(
    context: IntegrationCommandContext,
  ): Promise<IntegrationOperationResult>;
  search(
    query: IntegrationSearchQuery,
    context: IntegrationCommandContext,
  ): Promise<IntegrationResourceList>;
  synchronize(
    context: IntegrationCommandContext,
  ): Promise<IntegrationOperationResult>;
  validateConfiguration(
    configuration: Readonly<Record<string, unknown>>,
  ): Promise<IntegrationConfigurationResult>;
  webhooks(): IntegrationWebhookDescriptor;
}
