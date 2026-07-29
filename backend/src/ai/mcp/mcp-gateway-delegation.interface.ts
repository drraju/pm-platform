import {
  McpGatewayDelegationRequest,
  McpGatewayDelegationResult,
} from './mcp-platform.types';

export interface McpGatewayDelegation {
  delegateToGateway(
    request: McpGatewayDelegationRequest,
  ): Promise<McpGatewayDelegationResult>;
}
