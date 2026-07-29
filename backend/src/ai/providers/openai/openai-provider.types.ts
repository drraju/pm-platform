export type OpenAIChatCompletionRequest = {
  messages: readonly {
    content: string;
    role: 'user';
  }[];
  model: string;
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
