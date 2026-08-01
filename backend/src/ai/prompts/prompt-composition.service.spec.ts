import { PromptCompositionService } from './prompt-composition.service';

describe('PromptCompositionService', () => {
  const service = new PromptCompositionService();

  it('composes deterministic ordered sections and omits empty context', () => {
    const request = {
      capabilityId: 'chat',
      input: 'What is blocked?',
      enterpriseContext: {
        calendars: [],
        documents: [],
        executionUpdates: [],
        generatedAt: '2026-08-01T00:00:00.000Z',
        members: [],
        portfolios: [],
        projects: [{ id: 'p-1', name: 'Apollo', status: 'active' }],
        raidItems: [],
        tasks: [{ id: 't-1', projectId: 'p-1', status: 'open', title: 'API' }],
        user: null,
        workspace: null,
      },
    };

    const first = service.compose(request);
    const second = service.compose(request);

    expect(first).toEqual(second);
    expect(first.prompt.sections.map((section) => section.type)).toEqual([
      'system',
      'user-intent',
      'project',
      'task',
    ]);
    expect(first.prompt.sections.some((section) => section.id === 'raid')).toBe(
      false,
    );
  });

  it('trims lower-priority sections to the configured token budget', () => {
    const result = service.compose({
      capabilityId: 'chat',
      enterpriseContext: null,
      input: 'A'.repeat(200),
      maxTokens: 30,
    });

    expect(result.diagnostics.tokenEstimate).toBeLessThanOrEqual(30);
    expect(result.diagnostics.omittedSectionIds).toEqual([]);
    expect(result.prompt.sections.at(-1)?.content.length).toBeLessThanOrEqual(
      30 * 4,
    );
  });
});
