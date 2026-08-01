import { Injectable } from '@nestjs/common';
import { AiProviderExecutionRequest } from '../ai-provider.types';
import { ChatPromptFormatter } from './openai-prompt-formatter';
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
      'promptModel' in input &&
      input.promptModel &&
      typeof input.promptModel === 'object'
    ) {
      return new ChatPromptFormatter()
        .format(input.promptModel as { sections: readonly { content: string; type: string }[] })
        .map((message) => `${message.role}: ${message.content}`)
        .join('\n\n');
    }
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
