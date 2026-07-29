import { Injectable } from '@nestjs/common';
import { ConversationPlannerService } from '../conversation';
import { AiExecutionEngineService, AiExecutionResult } from '../execution';

export type InternalAssistantRequest = {
  actorId?: string;
  capabilityId?: string;
  clientId: string;
  conversationId?: string;
  correlationId: string;
  input: unknown;
  projectIds?: readonly string[];
  providerId?: string;
  requestId: string;
  sessionId: string;
  tenantId?: string;
  workspaceId?: string;
};

export type InternalAssistantAcceptedRequest = {
  executionResult: AiExecutionResult;
  plannedConversationId: string;
  requestId: string;
  sessionId: string;
};

@Injectable()
export class InternalAiAssistantService {
  constructor(
    private readonly conversationPlanner: ConversationPlannerService,
    private readonly executionEngine: AiExecutionEngineService,
  ) {}

  async submitRequest(
    request: InternalAssistantRequest,
  ): Promise<InternalAssistantAcceptedRequest> {
    const plan = this.conversationPlanner.plan({
      actorId: request.actorId,
      capabilityId: request.capabilityId,
      clientId: request.clientId,
      conversationId:
        request.conversationId ?? 'internal-assistant-conversation',
      correlationId: request.correlationId,
      input: request.input,
      projectIds: request.projectIds,
      providerId: request.providerId,
      requestId: request.requestId,
      sessionId: request.sessionId,
      tenantId: request.tenantId,
      workspaceId: request.workspaceId,
    });
    const executionResult = await this.executionEngine.execute({
      request: plan.requestDescriptor.toAiRequest(),
    });

    return {
      executionResult,
      plannedConversationId: plan.diagnostics.selectedConversationId,
      requestId: request.requestId,
      sessionId: request.sessionId,
    };
  }
}
