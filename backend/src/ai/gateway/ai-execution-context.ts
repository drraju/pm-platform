import {
  AiExecutionState,
  AiFeatureFlags,
  AiLifecycleState,
  AiRequest,
  AiScope,
  AiUserIdentity,
} from '../common';

type AiExecutionContextMetadata = Readonly<Record<string, unknown>>;

export type AiExecutionContextSnapshot = {
  auditMetadata: AiExecutionContextMetadata;
  contextReferences: readonly string[];
  correlationId: string;
  effectivePermissions: readonly string[];
  executionState: AiExecutionState;
  extensionMetadata: AiExecutionContextMetadata;
  featureFlags: AiFeatureFlags;
  organizationId?: string;
  projectId?: string;
  promptMetadata: AiExecutionContextMetadata;
  requestId: string;
  requestMetadata: AiExecutionContextMetadata;
  requestedCapabilityId: string;
  requestedSkillId?: string;
  scope: AiScope;
  selectedProviderId?: string;
  sessionId?: string;
  telemetryMetadata: AiExecutionContextMetadata;
  tenantId?: string;
  timestamp: string;
  traceId: string;
  userIdentity: AiUserIdentity;
  userRoles: readonly string[];
  workspaceId?: string;
};

export class AiExecutionContext {
  readonly auditMetadata: AiExecutionContextMetadata;
  readonly contextReferences: readonly string[];
  readonly correlationId: string;
  readonly effectivePermissions: readonly string[];
  readonly executionState: AiExecutionState;
  readonly extensionMetadata: AiExecutionContextMetadata;
  readonly featureFlags: AiFeatureFlags;
  readonly organizationId?: string;
  readonly projectId?: string;
  readonly promptMetadata: AiExecutionContextMetadata;
  readonly requestId: string;
  readonly requestMetadata: AiExecutionContextMetadata;
  readonly requestedCapabilityId: string;
  readonly requestedSkillId?: string;
  readonly scope: AiScope;
  readonly selectedProviderId?: string;
  readonly sessionId?: string;
  readonly telemetryMetadata: AiExecutionContextMetadata;
  readonly tenantId?: string;
  readonly timestamp: string;
  readonly traceId: string;
  readonly userIdentity: AiUserIdentity;
  readonly userRoles: readonly string[];
  readonly workspaceId?: string;

  private constructor(snapshot: AiExecutionContextSnapshot) {
    this.auditMetadata = Object.freeze({ ...snapshot.auditMetadata });
    this.contextReferences = Object.freeze([...snapshot.contextReferences]);
    this.correlationId = snapshot.correlationId;
    this.effectivePermissions = Object.freeze([
      ...snapshot.effectivePermissions,
    ]);
    this.executionState = Object.freeze({ ...snapshot.executionState });
    this.extensionMetadata = Object.freeze({ ...snapshot.extensionMetadata });
    this.featureFlags = Object.freeze({ ...snapshot.featureFlags });
    this.organizationId = snapshot.organizationId;
    this.projectId = snapshot.projectId;
    this.promptMetadata = Object.freeze({ ...snapshot.promptMetadata });
    this.requestId = snapshot.requestId;
    this.requestMetadata = Object.freeze({ ...snapshot.requestMetadata });
    this.requestedCapabilityId = snapshot.requestedCapabilityId;
    this.requestedSkillId = snapshot.requestedSkillId;
    this.scope = Object.freeze({ ...snapshot.scope });
    this.selectedProviderId = snapshot.selectedProviderId;
    this.sessionId = snapshot.sessionId;
    this.telemetryMetadata = Object.freeze({ ...snapshot.telemetryMetadata });
    this.tenantId = snapshot.tenantId;
    this.timestamp = snapshot.timestamp;
    this.traceId = snapshot.traceId;
    this.userIdentity = Object.freeze({ ...snapshot.userIdentity });
    this.userRoles = Object.freeze([...snapshot.userRoles]);
    this.workspaceId = snapshot.workspaceId;
    Object.freeze(this);
  }

  static create(input: {
    featureFlags: AiFeatureFlags;
    request: AiRequest;
    timestamp?: string;
    traceId?: string;
  }): AiExecutionContext {
    const timestamp = input.timestamp ?? new Date().toISOString();

    return new AiExecutionContext({
      auditMetadata: {},
      contextReferences: [],
      correlationId: input.request.correlationId,
      effectivePermissions: [],
      executionState: {
        lastTransitionAt: timestamp,
        lifecycleState: 'received',
      },
      extensionMetadata: {},
      featureFlags: input.featureFlags,
      organizationId: undefined,
      projectId: input.request.scope.projectIds?.[0],
      promptMetadata: {},
      requestId: input.request.requestId,
      requestMetadata: input.request.metadata ?? {},
      requestedCapabilityId: input.request.capabilityId,
      requestedSkillId: undefined,
      scope: input.request.scope,
      selectedProviderId: undefined,
      sessionId: undefined,
      telemetryMetadata: {},
      tenantId: input.request.scope.tenantId,
      timestamp,
      traceId: input.traceId ?? input.request.correlationId,
      userIdentity: {
        userId: input.request.scope.actorId,
      },
      userRoles: [],
      workspaceId: input.request.scope.workspaceId,
    });
  }

  transitionTo(
    lifecycleState: AiLifecycleState,
    transitionedAt = new Date().toISOString(),
  ): AiExecutionContext {
    return new AiExecutionContext({
      ...this.toSnapshot(),
      executionState: {
        lastTransitionAt: transitionedAt,
        lifecycleState,
      },
    });
  }

  withSelectedProvider(selectedProviderId?: string): AiExecutionContext {
    return new AiExecutionContext({
      ...this.toSnapshot(),
      selectedProviderId,
    });
  }

  withContextReferences(
    contextReferences: readonly string[],
  ): AiExecutionContext {
    return new AiExecutionContext({
      ...this.toSnapshot(),
      contextReferences: [...contextReferences],
    });
  }

  withPromptMetadata(
    promptMetadata: AiExecutionContextMetadata,
  ): AiExecutionContext {
    return new AiExecutionContext({
      ...this.toSnapshot(),
      promptMetadata: {
        ...this.promptMetadata,
        ...promptMetadata,
      },
    });
  }

  toSnapshot(): AiExecutionContextSnapshot {
    return {
      auditMetadata: this.auditMetadata,
      contextReferences: this.contextReferences,
      correlationId: this.correlationId,
      effectivePermissions: this.effectivePermissions,
      executionState: this.executionState,
      extensionMetadata: this.extensionMetadata,
      featureFlags: this.featureFlags,
      organizationId: this.organizationId,
      projectId: this.projectId,
      promptMetadata: this.promptMetadata,
      requestId: this.requestId,
      requestMetadata: this.requestMetadata,
      requestedCapabilityId: this.requestedCapabilityId,
      requestedSkillId: this.requestedSkillId,
      scope: this.scope,
      selectedProviderId: this.selectedProviderId,
      sessionId: this.sessionId,
      telemetryMetadata: this.telemetryMetadata,
      tenantId: this.tenantId,
      timestamp: this.timestamp,
      traceId: this.traceId,
      userIdentity: this.userIdentity,
      userRoles: this.userRoles,
      workspaceId: this.workspaceId,
    };
  }
}
