import { Injectable } from '@nestjs/common';

type AiProviderConfig = {
  enabled: boolean;
  name: string;
};

export type AiFeatureFlags = {
  assistant: boolean;
  contextCaching: boolean;
  contextSummarization: boolean;
  externalClients: boolean;
  gateway: boolean;
  mcp: boolean;
  platform: boolean;
  prompts: boolean;
  providers: boolean;
  skills: boolean;
  streaming: boolean;
};

export type AiRuntimeLimits = {
  maxContextTokens: number;
  maxPromptTokens: number;
  requestTimeoutMs: number;
};

export type AiTelemetryConfig = {
  auditEnabled: boolean;
  telemetryEnabled: boolean;
};

export type AiSecurityConfig = {
  piiMaskingEnabled: boolean;
  requireAuthorization: boolean;
};

export type AiPlatformConfig = {
  featureFlags: AiFeatureFlags;
  limits: AiRuntimeLimits;
  openai: OpenAIProviderConfiguration;
  providers: AiProviderConfig[];
  security: AiSecurityConfig;
  telemetry: AiTelemetryConfig;
};

export type OpenAIProviderConfiguration = {
  apiKeyConfigured: boolean;
  baseUrl: string;
  maxRetries: number;
  model: string;
  timeoutMs: number;
};

@Injectable()
export class AiConfigService {
  getConfig(): AiPlatformConfig {
    return {
      featureFlags: {
        assistant: this.readBoolean('AI_ASSISTANT_ENABLED', false),
        contextCaching: this.readBoolean('AI_CONTEXT_CACHING_ENABLED', false),
        contextSummarization: this.readBoolean(
          'AI_CONTEXT_SUMMARIZATION_ENABLED',
          false,
        ),
        externalClients: this.readBoolean('AI_EXTERNAL_CLIENTS_ENABLED', false),
        gateway: this.readBoolean('AI_GATEWAY_ENABLED', false),
        mcp: this.readBoolean('AI_MCP_ENABLED', false),
        platform: this.readBoolean('AI_PLATFORM_ENABLED', false),
        prompts: this.readBoolean('AI_PROMPTS_ENABLED', false),
        providers: this.readBoolean('AI_PROVIDERS_ENABLED', false),
        skills: this.readBoolean('AI_SKILLS_ENABLED', false),
        streaming: this.readBoolean('AI_STREAMING_ENABLED', false),
      },
      limits: {
        maxContextTokens: this.readNumber('AI_MAX_CONTEXT_TOKENS', 8000),
        maxPromptTokens: this.readNumber('AI_MAX_PROMPT_TOKENS', 12000),
        requestTimeoutMs: this.readNumber('AI_REQUEST_TIMEOUT_MS', 30000),
      },
      openai: this.getOpenAIConfiguration(),
      providers: this.readProviders(),
      security: {
        piiMaskingEnabled: this.readBoolean('AI_PII_MASKING_ENABLED', true),
        requireAuthorization: this.readBoolean(
          'AI_REQUIRE_AUTHORIZATION',
          true,
        ),
      },
      telemetry: {
        auditEnabled: this.readBoolean('AI_AUDIT_ENABLED', true),
        telemetryEnabled: this.readBoolean('AI_TELEMETRY_ENABLED', true),
      },
    };
  }

  isPipelineStageEnabled(stageName: string): boolean {
    const environmentName = `AI_PIPELINE_STAGE_${stageName.toUpperCase()}_ENABLED`;

    return this.readBoolean(environmentName, true);
  }

  isContextProviderEnabled(providerId: string): boolean {
    const environmentName = `AI_CONTEXT_PROVIDER_${providerId
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toUpperCase()}_ENABLED`;

    return this.readBoolean(environmentName, true);
  }

  isConversationDefinitionEnabled(conversationId: string): boolean {
    const environmentName = `AI_CONVERSATION_${conversationId
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toUpperCase()}_ENABLED`;

    return this.readBoolean(environmentName, true);
  }

  isPromptDefinitionEnabled(promptId: string): boolean {
    const environmentName = `AI_PROMPT_${promptId
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toUpperCase()}_ENABLED`;

    return this.readBoolean(environmentName, true);
  }

  isSkillDefinitionEnabled(skillId: string): boolean {
    const environmentName = `AI_SKILL_${skillId
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toUpperCase()}_ENABLED`;

    return this.readBoolean(environmentName, true);
  }

  isMcpRegistryEntryEnabled(entryType: string, entryId: string): boolean {
    const environmentName = `AI_MCP_${entryType
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toUpperCase()}_${entryId
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toUpperCase()}_ENABLED`;

    return this.readBoolean(environmentName, true);
  }

  isEventHandlerEnabled(handlerId: string): boolean {
    const environmentName = `AI_EVENT_HANDLER_${handlerId
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toUpperCase()}_ENABLED`;

    return this.readBoolean(environmentName, true);
  }

  getOpenAIConfiguration(): OpenAIProviderConfiguration {
    return {
      apiKeyConfigured: Boolean(process.env.OPENAI_API_KEY),
      baseUrl: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
      maxRetries: this.readNumber('OPENAI_MAX_RETRIES', 2),
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      timeoutMs: this.readNumber('OPENAI_TIMEOUT', 30000),
    };
  }

  getOpenAIApiKey(): string | undefined {
    return process.env.OPENAI_API_KEY;
  }

  private readBoolean(name: string, defaultValue: boolean): boolean {
    const value = process.env[name];

    if (value === undefined) {
      return defaultValue;
    }

    return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
  }

  private readNumber(name: string, defaultValue: number): number {
    const value = Number(process.env[name]);

    return Number.isFinite(value) && value > 0 ? value : defaultValue;
  }

  private readProviders(): AiProviderConfig[] {
    const value = process.env.AI_PROVIDER_NAMES;

    if (!value) {
      return [];
    }

    return value
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => ({
        enabled: this.readBoolean(
          `AI_PROVIDER_${name.toUpperCase()}_ENABLED`,
          false,
        ),
        name,
      }));
  }
}
