import { Injectable } from '@nestjs/common';
import { McpGatewayDelegation } from './mcp-gateway-delegation.interface';
import {
  McpGatewayDelegationRequest,
  McpGatewayDelegationResult,
} from './mcp-platform.types';

@Injectable()
export class McpGatewayDelegationService implements McpGatewayDelegation {
  delegateToGateway(
    request: McpGatewayDelegationRequest,
  ): Promise<McpGatewayDelegationResult> {
    return Promise.resolve({
      delegated: request.target === 'gateway',
      target: 'gateway',
    });
  }
}
