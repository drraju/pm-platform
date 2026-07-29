import { Inject, Injectable } from '@nestjs/common';
import {
  AI_GATEWAY,
  AIEvent,
  AIEventBusService,
  AiErrorPayload,
  AiPlatformError,
  AiRequest,
} from '../common';
import { AiContextRegistryService } from '../context';
import type { AiGateway } from '../gateway';
import { AiPipelineEngineService } from '../gateway/pipeline';
import {
  AiProviderExecutionRequest,
  AiProviderRegistryService,
  AiProviderRoutingService,
} from '../providers';
import { AiPromptResolutionEngineService } from '../prompts';
import { AiSkillResolutionService } from '../skills';
import { AiExecutionStateMachineService } from './ai-execution-state-machine.service';
import {
  AiExecutionDiagnostics,
  AiExecutionPolicies,
  AiExecutionRequest,
  AiExecutionResult,
  AiExecutionStateMachineSnapshot,
} from './execution-engine.types';

@Injectable()
export class AiExecutionCoordinator {
  constructor(
    private readonly eventBus: AIEventBusService,
    @Inject(AI_GATEWAY)
    private readonly gateway: AiGateway,
    private readonly pipelineEngine: AiPipelineEngineService,
    private readonly contextRegistry: AiContextRegistryService,
    private readonly promptResolution: AiPromptResolutionEngineService,
    private readonly skillResolution: AiSkillResolutionService,
    private readonly providerRouting: AiProviderRoutingService,
    private readonly providerRegistry: AiProviderRegistryService,
    private readonly stateMachine: AiExecutionStateMachineService,
  ) {}

  async coordinate(input: AiExecutionRequest): Promise<AiExecutionResult> {
    const startedAt = new Date();
    const executionId =
      input.executionId ?? `${input.request.requestId}:execution`;
    const policies = this.resolvePolicies(input.policies);
    let snapshot = this.stateMachine.create(
      executionId,
      startedAt.toISOString(),
    );
    const eventNames: string[] = [];
    const errors: AiErrorPayload[] = [];

    await this.publishLifecycleEvent(
      'ExecutionStarted',
      input.request,
      executionId,
      { state: snapshot.currentState },
      eventNames,
    );

    const diagnostics: AiExecutionDiagnostics = {
      contextProviderIds: [],
      eventNames,
      policySummary: this.createPolicySummary(policies),
      promptCandidateIds: [],
      providerCandidateIds: [],
      skillCandidateIds: [],
      warnings: [],
    };

    try {
      snapshot = await this.transition(
        snapshot,
        'Validated',
        input.request,
        executionId,
        { capabilityId: input.request.capabilityId },
        eventNames,
      );

      this.assertNotCancelled(policies);

      const context = this.gateway.createExecutionContext(input.request);
      const pipelineResult = await this.pipelineEngine.execute(context);
      diagnostics.pipeline = pipelineResult.diagnostics;

      if (pipelineResult.status === 'failed') {
        if (pipelineResult.error) {
          errors.push(pipelineResult.error);
        }

        snapshot = await this.transition(
          snapshot,
          'Failed',
          input.request,
          executionId,
          { failedStageName: pipelineResult.diagnostics.failedStageName },
          eventNames,
        );

        return this.toResult(
          input,
          snapshot,
          diagnostics,
          policies,
          startedAt,
          {
            errors,
            status: 'failed',
          },
        );
      }

      snapshot = await this.transition(
        snapshot,
        'Planned',
        input.request,
        executionId,
        { pipelineStatus: pipelineResult.status },
        eventNames,
      );

      const contextProviders = this.contextRegistry.findProvidersByCapability(
        input.request.capabilityId,
      );
      diagnostics.contextProviderIds = contextProviders.map(
        (provider) => provider.id,
      );
      snapshot = await this.transition(
        snapshot,
        'ContextResolved',
        input.request,
        executionId,
        { contextProviderIds: diagnostics.contextProviderIds },
        eventNames,
      );

      const contextTypes = contextProviders.map(
        (provider) => provider.contextType,
      );
      const promptResult = this.promptResolution.resolvePrompt({
        capabilityId: input.request.capabilityId,
        contextTypes,
        executionContext: pipelineResult.context.toSnapshot(),
      });
      diagnostics.promptCandidateIds =
        promptResult.diagnostics.candidatePromptIds;
      snapshot = await this.transition(
        snapshot,
        'PromptResolved',
        input.request,
        executionId,
        { selectedPromptId: promptResult.prompt?.id },
        eventNames,
      );

      const skillResult = this.skillResolution.resolveSkill({
        capabilityId: input.request.capabilityId,
        contextTypes,
        promptCategories: promptResult.prompt
          ? [promptResult.prompt.category]
          : [],
        providerFeatures: ['chat'],
      });
      diagnostics.skillCandidateIds = skillResult.diagnostics.candidateSkillIds;
      snapshot = await this.transition(
        snapshot,
        'SkillResolved',
        input.request,
        executionId,
        { selectedSkillId: skillResult.skill?.id },
        eventNames,
      );

      const routePolicy = this.providerRouting.createRoutePolicy(
        input.request.capabilityId,
      );
      diagnostics.providerCandidateIds = routePolicy.priorityOrderedProviderIds;
      const requestedProviderId = this.readRequestedProviderId(input.request);
      const selectedProviderId =
        requestedProviderId ?? routePolicy.priorityOrderedProviderIds[0];
      const provider = selectedProviderId
        ? this.providerRegistry.findProviderAdapterById(selectedProviderId)
        : null;
      const selectedProviderMetadata = selectedProviderId
        ? this.providerRegistry.findProviderById(selectedProviderId)
        : null;

      if (!provider || !selectedProviderMetadata?.id) {
        throw new AiPlatformError({
          category: 'provider',
          code: 'AI_PROVIDER_NOT_SELECTED',
          correlationId: input.request.correlationId,
          message: 'No AI provider is available for execution.',
          retryable: false,
          safeDetail: 'Provider routing returned no executable provider.',
        });
      }

      snapshot = await this.transition(
        snapshot,
        'ProviderSelected',
        input.request,
        executionId,
        { selectedProviderId: selectedProviderMetadata.id },
        eventNames,
      );

      if (!provider.execute) {
        throw new AiPlatformError({
          category: 'provider',
          code: 'AI_PROVIDER_EXECUTION_UNSUPPORTED',
          correlationId: input.request.correlationId,
          message: 'Selected AI provider does not support execution.',
          retryable: false,
          safeDetail: selectedProviderMetadata.id,
        });
      }

      snapshot = await this.transition(
        snapshot,
        'Executing',
        input.request,
        executionId,
        { selectedProviderId: selectedProviderMetadata.id },
        eventNames,
      );

      const providerResult = await provider.execute(
        this.toProviderExecutionRequest(
          input.request,
          executionId,
          selectedProviderMetadata.id,
          promptResult.prompt?.id,
          skillResult.skill?.id,
          diagnostics.contextProviderIds,
        ),
      );

      snapshot = await this.transition(
        snapshot,
        'Completed',
        input.request,
        executionId,
        { selectedProviderId: providerResult.providerId },
        eventNames,
      );

      return this.toResult(input, snapshot, diagnostics, policies, startedAt, {
        mockResponse: {
          content: providerResult.content,
          modelId: providerResult.modelId,
          providerId: providerResult.providerId,
        },
        selectedContextMetadata: contextProviders.map((providerMetadata) => ({
          contextType: providerMetadata.contextType,
          id: providerMetadata.id,
          name: providerMetadata.name,
        })),
        selectedPrompt: promptResult.prompt ?? undefined,
        selectedProvider: selectedProviderMetadata,
        selectedSkill: skillResult.skill ?? undefined,
        status: 'success',
      });
    } catch (error) {
      const payload = this.toErrorPayload(error, input.request);
      errors.push(payload);
      const terminalState =
        payload.category === 'timeout'
          ? 'TimedOut'
          : payload.code === 'AI_EXECUTION_CANCELLED'
            ? 'Cancelled'
            : 'Failed';

      snapshot = await this.transition(
        snapshot,
        terminalState,
        input.request,
        executionId,
        { errorCode: payload.code },
        eventNames,
      );

      return this.toResult(input, snapshot, diagnostics, policies, startedAt, {
        errors,
        status:
          terminalState === 'TimedOut'
            ? 'timed_out'
            : terminalState === 'Cancelled'
              ? 'cancelled'
              : 'failed',
      });
    }
  }

  private assertNotCancelled(policies: AiExecutionPolicies): void {
    if (
      policies.cancellation.enabled &&
      policies.cancellation.cancellationToken
    ) {
      throw new AiPlatformError({
        category: 'governance',
        code: 'AI_EXECUTION_CANCELLED',
        message: 'AI execution was cancelled before provider execution.',
        retryable: false,
        safeDetail: policies.cancellation.cancellationToken,
      });
    }
  }

  private createPolicySummary(
    policies: AiExecutionPolicies,
  ): Readonly<Record<string, unknown>> {
    return Object.freeze({
      cancellationEnabled: policies.cancellation.enabled,
      executionMode: policies.executionMode.mode,
      maxConcurrentExecutions: policies.concurrency.maxConcurrentExecutions,
      retryEnabled: policies.retry.enabled,
      timeoutEnabled: policies.timeout.enabled,
      timeoutMs: policies.timeout.timeoutMs,
    });
  }

  private async publishLifecycleEvent(
    name: AIEvent['name'],
    request: AiRequest,
    executionId: string,
    metadata: Readonly<Record<string, unknown>>,
    eventNames: string[],
  ): Promise<void> {
    await this.eventBus.publish({
      correlationId: request.correlationId,
      eventId: `${executionId}:${eventNames.length + 1}:${name}`,
      metadata: {
        executionId,
        requestId: request.requestId,
        ...metadata,
      },
      name,
      occurredAt: new Date().toISOString(),
      source: 'ai-execution-engine',
    });
    eventNames.push(name);
  }

  private resolvePolicies(
    policies?: Partial<AiExecutionPolicies>,
  ): AiExecutionPolicies {
    return Object.freeze({
      cancellation: Object.freeze({
        cancellationToken: policies?.cancellation?.cancellationToken,
        enabled: policies?.cancellation?.enabled ?? false,
      }),
      concurrency: Object.freeze({
        executionGroup: policies?.concurrency?.executionGroup,
        maxConcurrentExecutions:
          policies?.concurrency?.maxConcurrentExecutions ?? 1,
      }),
      executionMode: Object.freeze({
        mode: policies?.executionMode?.mode ?? 'sync',
      }),
      retry: Object.freeze({
        enabled: policies?.retry?.enabled ?? false,
        maxAttempts: policies?.retry?.maxAttempts ?? 1,
        retryableErrorCategories:
          policies?.retry?.retryableErrorCategories ?? [],
      }),
      timeout: Object.freeze({
        enabled: policies?.timeout?.enabled ?? true,
        timeoutMs: policies?.timeout?.timeoutMs ?? 30000,
      }),
    });
  }

  private toErrorPayload(error: unknown, request: AiRequest): AiErrorPayload {
    if (error instanceof AiPlatformError) {
      return error.toPayload();
    }

    return new AiPlatformError({
      category: 'system',
      code: 'AI_EXECUTION_ENGINE_ERROR',
      correlationId: request.correlationId,
      message: 'AI execution engine failed.',
      retryable: false,
      safeDetail: error instanceof Error ? error.message : 'Unknown error',
    }).toPayload();
  }

  private toProviderExecutionRequest(
    request: AiRequest,
    executionId: string,
    providerId: string,
    promptId: string | undefined,
    skillId: string | undefined,
    contextMetadataIds: readonly string[],
  ): AiProviderExecutionRequest {
    return {
      capabilityId: request.capabilityId,
      contextMetadataIds,
      executionId,
      input: request.input,
      promptId,
      providerId,
      requestId: request.requestId,
      skillId,
    };
  }

  private readRequestedProviderId(request: AiRequest): string | undefined {
    const providerId = request.metadata?.requestedProviderId;

    return typeof providerId === 'string' && providerId.length > 0
      ? providerId
      : undefined;
  }

  private async transition(
    snapshot: AiExecutionStateMachineSnapshot,
    to: AiExecutionStateMachineSnapshot['currentState'],
    request: AiRequest,
    executionId: string,
    metadata: Readonly<Record<string, unknown>>,
    eventNames: string[],
  ): Promise<AiExecutionStateMachineSnapshot> {
    const next = this.stateMachine.transition(
      snapshot,
      to,
      `Execution transitioned to ${to}.`,
      metadata,
    );

    await this.publishLifecycleEvent(
      this.toEventName(to),
      request,
      executionId,
      metadata,
      eventNames,
    );

    return next;
  }

  private toEventName(
    state: AiExecutionStateMachineSnapshot['currentState'],
  ): AIEvent['name'] {
    if (state === 'Completed') {
      return 'ExecutionCompleted';
    }

    if (state === 'Failed') {
      return 'ExecutionFailed';
    }

    if (state === 'Cancelled') {
      return 'ExecutionCancelled';
    }

    if (state === 'TimedOut') {
      return 'ExecutionTimedOut';
    }

    return 'ExecutionStateChanged';
  }

  private toResult(
    input: AiExecutionRequest,
    snapshot: AiExecutionStateMachineSnapshot,
    diagnostics: AiExecutionDiagnostics,
    policies: AiExecutionPolicies,
    startedAt: Date,
    result: Partial<AiExecutionResult> & {
      status: AiExecutionResult['status'];
    },
  ): AiExecutionResult {
    const completedAt = new Date();

    return Object.freeze({
      diagnostics: Object.freeze({
        ...diagnostics,
        eventNames: Object.freeze([...diagnostics.eventNames]),
        warnings: Object.freeze([...diagnostics.warnings]),
      }),
      errors: Object.freeze([...(result.errors ?? [])]),
      executionId: snapshot.executionId,
      mockResponse: result.mockResponse,
      policies,
      requestId: input.request.requestId,
      selectedContextMetadata: Object.freeze([
        ...(result.selectedContextMetadata ?? []),
      ]),
      selectedPrompt: result.selectedPrompt,
      selectedProvider: result.selectedProvider,
      selectedSkill: result.selectedSkill,
      stateHistory: snapshot.history,
      status: result.status,
      timing: Object.freeze({
        completedAt: completedAt.toISOString(),
        durationMs: completedAt.getTime() - startedAt.getTime(),
        startedAt: startedAt.toISOString(),
      }),
    });
  }
}
