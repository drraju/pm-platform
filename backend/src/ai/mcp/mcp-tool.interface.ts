import { McpToolMetadata } from './mcp-platform.types';

export interface McpTool {
  describeTool(): McpToolMetadata;
}
