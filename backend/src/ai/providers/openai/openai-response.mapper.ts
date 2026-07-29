import { Injectable } from '@nestjs/common';
import { AiProviderExecutionResult } from '../ai-provider.types';
import { OpenAIChatCompletionResponse } from './openai-provider.types';

@Injectable()
export class OpenAIResponseMapper {
  toProviderExecutionResult(
    response: OpenAIChatCompletionResponse,
    fallbackModel: string,
  ): AiProviderExecutionResult {
    return {
      content:
        response.choices?.[0]?.message?.content ??
        'OpenAI response contained no message content.',
      modelId: response.model ?? fallbackModel,
      providerId: 'openai',
    };
  }
}
