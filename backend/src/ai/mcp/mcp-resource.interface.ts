import { McpResourceMetadata } from './mcp-platform.types';

export interface McpResource {
  describeResource(): McpResourceMetadata;
}
