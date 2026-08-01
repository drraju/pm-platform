import { ChatPromptFormatter } from './openai-prompt-formatter';

describe('ChatPromptFormatter', () => {
  it('maps provider-independent sections to ordered OpenAI messages', () => {
    const result = new ChatPromptFormatter().format({
      sections: [
        {
          content: 'You are helpful.',
          id: 'system',
          priority: 100,
          tokenEstimate: 4,
          type: 'system',
        },
        {
          content: 'Show blockers.',
          id: 'user-intent',
          priority: 90,
          tokenEstimate: 4,
          type: 'user-intent',
        },
      ],
    });

    expect(result).toEqual([
      { content: '[system]\nYou are helpful.', role: 'system' },
      { content: '[user-intent]\nShow blockers.', role: 'user' },
    ]);
  });
});
