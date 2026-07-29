export type McpLifecycleStatus =
  | 'registered'
  | 'enabled'
  | 'disabled'
  | 'deprecated'
  | 'retired';

export type McpServerState =
  | 'created'
  | 'initializing'
  | 'ready'
  | 'draining'
  | 'stopped';

export type McpSessionState =
  | 'opening'
  | 'active'
  | 'idle'
  | 'closed'
  | 'revoked';

export type McpClientType =
  | 'chatgpt'
  | 'codex'
  | 'cursor'
  | 'ide-extension'
  | 'automation'
  | 'unknown';

export type McpCapability = 'tools' | 'resources' | 'prompts' | 'sampling';

export type McpServerMetadata = {
  capabilities: readonly McpCapability[];
  name: string;
  protocolVersion: string;
  state: McpServerState;
  version: string;
};

export type McpSessionMetadata = {
  capabilities: readonly McpCapability[];
  clientId: string;
  clientType: McpClientType;
  connectionId: string;
  createdAt: string;
  lastActivityAt: string;
  protocolVersion: string;
  sessionId: string;
  state: McpSessionState;
};

export type McpTransportMetadata = {
  id: string;
  lifecycleStatus: McpLifecycleStatus;
  name: string;
  priority: number;
  protocolVersions: readonly string[];
  transportType: 'in-process' | 'stdio' | 'custom';
  version: string;
};

export type McpToolMetadata = {
  capabilityId: string;
  id: string;
  inputSchema?: Readonly<Record<string, unknown>>;
  lifecycleStatus: McpLifecycleStatus;
  name: string;
  priority: number;
  requiredPermissions: readonly string[];
  title: string;
  version: string;
};

export type McpResourceMetadata = {
  id: string;
  lifecycleStatus: McpLifecycleStatus;
  name: string;
  priority: number;
  requiredPermissions: readonly string[];
  scopeRequirements: readonly string[];
  title: string;
  version: string;
};

export type McpPromptMetadata = {
  id: string;
  lifecycleStatus: McpLifecycleStatus;
  name: string;
  priority: number;
  promptId: string;
  requiredPermissions: readonly string[];
  title: string;
  version: string;
};

export type McpRegistryDiagnostics = {
  disabledEntryIds: readonly string[];
  enabledEntryIds: readonly string[];
  entryCount: number;
  registryName: string;
};

export type McpSessionRegistryDiagnostics = {
  activeSessionIds: readonly string[];
  closedSessionIds: readonly string[];
  sessionCount: number;
};

export type McpGatewayDelegationRequest = {
  correlationId: string;
  metadata: Readonly<Record<string, unknown>>;
  sessionId: string;
  target: 'gateway';
};

export type McpGatewayDelegationResult = {
  delegated: boolean;
  target: 'gateway';
};
