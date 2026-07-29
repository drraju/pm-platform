import { McpTransportMetadata } from './mcp-platform.types';

export interface McpTransport {
  describeTransport(): McpTransportMetadata;
}
