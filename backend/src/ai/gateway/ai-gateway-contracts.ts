import { AiErrorPayload, AiRequest, AiResponse } from '../common';
import { AiExecutionContext } from './ai-execution-context';

export type AiGatewayRequest = AiRequest;

export type AiGatewayResponse = AiResponse;

export type AiGatewayLifecycleEvent = {
  context: AiExecutionContext;
  name: string;
  timestamp: string;
};

export type AiGatewayMiddlewareResult = {
  context: AiExecutionContext;
  error?: AiErrorPayload;
};

export interface AiGatewayLifecycleHook {
  onLifecycleEvent(event: AiGatewayLifecycleEvent): Promise<void> | void;
}

export interface AiGatewayMiddleware {
  handle(
    context: AiExecutionContext,
  ): Promise<AiGatewayMiddlewareResult> | AiGatewayMiddlewareResult;
}

export interface AiGatewayPipelineStage {
  readonly name: string;
  process(
    context: AiExecutionContext,
  ): Promise<AiExecutionContext> | AiExecutionContext;
}

export interface AiGatewayExtension {
  readonly id: string;
  readonly version: string;
}

export type AiGatewayExecutionHandle = {
  context: AiExecutionContext;
  accepted: boolean;
};
