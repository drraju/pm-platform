import { McpPromptMetadata } from './mcp-platform.types';

export interface McpPrompt {
  describePrompt(): McpPromptMetadata;
}
