import { Injectable } from '@nestjs/common';
import { InternalAiAssistantService } from '../assistant';
import {
  AiCapabilityRegistryService,
  EnterpriseCapabilityRegistryService,
} from '../capabilities';
import { AIEventBusService } from '../common';
import {
  ConversationRegistryService,
  ConversationSessionRegistryService,
} from '../conversation';
import { AiProviderRegistryService } from '../providers';
import { AiPromptRegistryService } from '../prompts';
import { AiSkillRegistryService } from '../skills';
import {
  PlaygroundDiagnostics,
  PlaygroundEventTimelineEntry,
  PlaygroundExecutionHistoryItem,
  PlaygroundExecutionTrace,
  PlaygroundRegistrySnapshot,
  PlaygroundRequest,
  PlaygroundResponse,
} from './playground.types';

@Injectable()
export class AiPlaygroundService {
  private readonly history: PlaygroundExecutionTrace[] = [];

  constructor(
    private readonly assistant: InternalAiAssistantService,
    private readonly capabilities: AiCapabilityRegistryService,
    private readonly enterpriseCapabilities: EnterpriseCapabilityRegistryService,
    private readonly conversations: ConversationRegistryService,
    private readonly sessions: ConversationSessionRegistryService,
    private readonly prompts: AiPromptRegistryService,
    private readonly skills: AiSkillRegistryService,
    private readonly providers: AiProviderRegistryService,
    private readonly eventBus: AIEventBusService,
  ) {}

  async execute(request: PlaygroundRequest): Promise<PlaygroundResponse> {
    const normalizedRequest = this.normalizeRequest(request);
    const accepted = await this.assistant.submitRequest({
      actorId: normalizedRequest.actorId,
      capabilityId: normalizedRequest.capabilityId,
      clientId: 'ai-platform-playground',
      conversationId: normalizedRequest.conversationId,
      correlationId: normalizedRequest.correlationId,
      input: {
        capabilityId: normalizedRequest.capabilityId,
        playgroundInput: normalizedRequest.input,
      },
      projectIds: normalizedRequest.projectIds,
      providerId: normalizedRequest.providerId,
      requestId: normalizedRequest.requestId,
      sessionId: normalizedRequest.sessionId,
      tenantId: normalizedRequest.tenantId,
      workspaceId: normalizedRequest.workspaceId,
    });

    const trace = this.createTrace(
      normalizedRequest,
      accepted.plannedConversationId,
      accepted.executionResult,
    );
    this.recordHistory(trace);

    return {
      trace,
    };
  }

  getExecutionHistory(): readonly PlaygroundExecutionHistoryItem[] {
    return Object.freeze(
      this.history.map((trace) =>
        Object.freeze({
          capability: trace.selectedCapability,
          durationMs: trace.finalResult.timing.durationMs,
          executionId: trace.executionId,
          provider:
            typeof trace.selectedProvider?.id === 'string'
              ? trace.selectedProvider.id
              : undefined,
          request: this.describeRequest(trace.request.input),
          requestId: trace.requestId,
          status: trace.finalResult.status,
        }),
      ),
    );
  }

  findExecutionTrace(executionId: string): PlaygroundExecutionTrace | null {
    return (
      this.history.find((trace) => trace.executionId === executionId) ?? null
    );
  }

  async replayByExecutionId(executionId: string): Promise<PlaygroundResponse> {
    const trace = this.findExecutionTrace(executionId);

    if (!trace) {
      throw new Error(`Playground execution trace not found: ${executionId}`);
    }

    return this.replay(trace);
  }

  inspectRegistries(): PlaygroundRegistrySnapshot {
    return this.freezeRegistrySnapshot({
      capabilities: this.capabilities.getCapabilities(),
      enterpriseCapabilities: this.enterpriseCapabilities.getCapabilities(),
      conversations: this.conversations.getConversations(),
      providers: this.providers.getProviders(),
      prompts: this.prompts.getPrompts(),
      sessions: this.sessions.getSessions(),
      skills: this.skills.getSkills(),
    });
  }

  async replay(trace: PlaygroundExecutionTrace): Promise<PlaygroundResponse> {
    return this.execute({
      ...trace.request,
      correlationId: `${trace.request.correlationId}:replay`,
      requestId: `${trace.requestId}:replay`,
      sessionId: `${trace.executionId}:replay-session`,
    });
  }

  private createEventTimeline(
    events: readonly PlaygroundExecutionTrace['eventBusEvents'][number][],
  ): readonly PlaygroundEventTimelineEntry[] {
    return Object.freeze(
      events.map((event, index) => {
        const previous = index > 0 ? events[index - 1] : undefined;
        const previousTime = previous
          ? new Date(previous.occurredAt).getTime()
          : undefined;
        const currentTime = new Date(event.occurredAt).getTime();

        return Object.freeze({
          durationMs:
            previousTime === undefined ? undefined : currentTime - previousTime,
          eventName: event.name,
          executionId:
            typeof event.metadata.executionId === 'string'
              ? event.metadata.executionId
              : '',
          timestamp: event.occurredAt,
        });
      }),
    );
  }

  private describeRequest(input: unknown): string {
    if (typeof input === 'string') {
      return input;
    }

    if (
      input &&
      typeof input === 'object' &&
      'playgroundInput' in input &&
      typeof input.playgroundInput === 'string'
    ) {
      return input.playgroundInput;
    }

    return JSON.stringify(input);
  }

  private recordHistory(trace: PlaygroundExecutionTrace): void {
    this.history.unshift(trace);

    if (this.history.length > 20) {
      this.history.splice(20);
    }
  }

  private createDiagnostics(
    result: PlaygroundExecutionTrace['finalResult'],
  ): PlaygroundDiagnostics {
    return Object.freeze({
      architectureValidation: Object.freeze({
        externalProviderExecution: false,
        gatewayBoundaryPreserved: true,
        mockProviderOnly: true,
        readOnlyRegistryInspection: true,
      }),
      errors: Object.freeze([...result.errors]),
      executionDurationMs: result.timing.durationMs,
      pipelineDecisions: Object.freeze([
        ...(result.diagnostics.pipeline?.stages ?? []),
      ]),
      providerResolution: Object.freeze([
        ...result.diagnostics.providerCandidateIds,
      ]),
      registryResolution: Object.freeze({
        contextProviderIds: Object.freeze([
          ...result.diagnostics.contextProviderIds,
        ]),
        promptCandidateIds: Object.freeze([
          ...result.diagnostics.promptCandidateIds,
        ]),
        providerCandidateIds: Object.freeze([
          ...result.diagnostics.providerCandidateIds,
        ]),
        skillCandidateIds: Object.freeze([
          ...result.diagnostics.skillCandidateIds,
        ]),
      }),
      stateHistory: Object.freeze([...result.stateHistory]),
      warnings: Object.freeze([...result.diagnostics.warnings]),
    });
  }

  private createTrace(
    request: Required<
      Pick<
        PlaygroundRequest,
        'capabilityId' | 'correlationId' | 'requestId' | 'sessionId'
      >
    > &
      PlaygroundRequest,
    conversationId: string,
    result: PlaygroundExecutionTrace['finalResult'],
  ): PlaygroundExecutionTrace {
    const selectedConversation =
      this.conversations.findConversationById(conversationId);
    const eventBusEvents = Object.freeze(
      this.eventBus
        .getPublishedEvents()
        .filter((event) => event.metadata.executionId === result.executionId),
    );

    return Object.freeze({
      conversationId,
      diagnostics: this.createDiagnostics(result),
      eventBusEvents,
      eventTimeline: this.createEventTimeline(eventBusEvents),
      executionId: result.executionId,
      executionStates: Object.freeze([...result.stateHistory]),
      finalResult: result,
      input: request.input,
      pipelineStages: Object.freeze([
        ...(result.diagnostics.pipeline?.stages ?? []),
      ]),
      registrySnapshot: this.inspectRegistries(),
      request: Object.freeze({ ...request }),
      requestId: request.requestId,
      selectedCapability: request.capabilityId,
      selectedContextMetadata: Object.freeze([
        ...result.selectedContextMetadata,
      ]),
      selectedConversation: selectedConversation
        ? Object.freeze({ ...selectedConversation })
        : null,
      selectedPrompt: result.selectedPrompt,
      selectedProvider: result.selectedProvider,
      selectedSkill: result.selectedSkill,
      timing: Object.freeze({ ...result.timing }),
    });
  }

  private freezeRegistrySnapshot(
    snapshot: PlaygroundRegistrySnapshot,
  ): PlaygroundRegistrySnapshot {
    return Object.freeze({
      capabilities: Object.freeze([...snapshot.capabilities]),
      conversations: Object.freeze([...snapshot.conversations]),
      providers: Object.freeze([...snapshot.providers]),
      prompts: Object.freeze([...snapshot.prompts]),
      sessions: Object.freeze([...snapshot.sessions]),
      skills: Object.freeze([...snapshot.skills]),
    });
  }

  private normalizeRequest(
    request: PlaygroundRequest,
  ): Required<
    Pick<
      PlaygroundRequest,
      'capabilityId' | 'correlationId' | 'requestId' | 'sessionId'
    >
  > &
    PlaygroundRequest {
    const requestId = request.requestId ?? `playground-${Date.now()}`;

    return {
      ...request,
      capabilityId: request.capabilityId ?? 'chat',
      correlationId: request.correlationId ?? `${requestId}:correlation`,
      requestId,
      sessionId: request.sessionId ?? `${requestId}:session`,
    };
  }
}
