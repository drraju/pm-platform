import { AiCapability, AiRequest, AiResponse } from '../common';
import { AiExecutionContext } from './ai-execution-context';
import { AiGatewayExecutionHandle } from './ai-gateway-contracts';

export interface AiGateway {
  acceptRequest(request: AiRequest): Promise<AiGatewayExecutionHandle>;
  createExecutionContext(request: AiRequest): AiExecutionContext;
  executeRequest(request: AiRequest): Promise<AiResponse>;
  validateCapability(capabilityId: string): Promise<AiCapability | null>;
}
