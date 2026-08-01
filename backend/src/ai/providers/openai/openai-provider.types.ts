export type OpenAIChatCompletionRequest = {
  messages: readonly OpenAIChatCompletionMessage[];
  model: string;
};

export type OpenAIChatCompletionMessage = {
  content: string;
  role: 'developer' | 'system' | 'user';
};

export type OpenAIChatCompletionResponse = {
  choices?: readonly {
    message?: {
      content?: string;
    };
  }[];
  id?: string;
  model?: string;
};
