import { Injectable } from '@nestjs/common';
import { AiProviderExecutionRequest } from '../ai-provider.types';
import { OpenAIChatCompletionRequest } from './openai-provider.types';

@Injectable()
export class OpenAIRequestMapper {
  toChatCompletionRequest(
    request: AiProviderExecutionRequest,
    model: string,
  ): OpenAIChatCompletionRequest {
    return {
      messages: [
        {
          content: this.toPromptText(request.input),
          role: 'user',
        },
      ],
      model,
    };
  }

  private toPromptText(input: unknown): string {
    if (
      input &&
      typeof input === 'object' &&
      'playgroundInput' in input &&
      typeof input.playgroundInput === 'string'
    ) {
      return input.playgroundInput;
    }

    return typeof input === 'string' ? input : JSON.stringify(input);
  }
}
