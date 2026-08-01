import { Injectable } from '@nestjs/common';

@Injectable()
export class ChatPromptFormatter {
  readonly providerId = 'openai';

  format(prompt: ChatPromptModel): readonly ChatPromptMessage[] {
    return prompt.sections.map((section) => ({
      content: `[${section.type}]\n${section.content}`,
      role: section.type === 'system' ? 'system' : section.type === 'user-intent' ? 'user' : 'developer',
    }));
  }
}

export type ChatPromptMessage = {
  content: string;
  role: 'developer' | 'system' | 'user';
};

type ChatPromptModel = {
  sections: readonly {
    content: string;
    type: string;
  }[];
};
