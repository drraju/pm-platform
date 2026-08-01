import { AiResponseNormalizationService } from './ai-response-normalization.service';

describe('AiResponseNormalizationService', () => {
  const service = new AiResponseNormalizationService();

  it('normalizes structured summaries, findings, recommendations, actions, and risks', () => {
    const response = service.normalize({
      content: JSON.stringify({
        actionItems: [{ description: 'Confirm owner', priority: 'high' }],
        confidence: 'medium',
        findings: [{ description: 'Schedule is late', severity: 'high', title: 'Delay' }],
        recommendations: [{ description: 'Rebaseline', priority: 'medium', title: 'Plan' }],
        risks: [{ description: 'Delivery risk', impact: 'high', title: 'Schedule' }],
        summary: { businessImpact: 'Launch may move', overview: 'The project is delayed', title: 'Status' },
        unknownSection: true,
      }),
      modelId: 'model-1',
      providerId: 'provider-1',
    });

    expect(response).toMatchObject({
      confidence: 'medium',
      diagnostics: { normalized: true, unknownFields: ['unknownSection'] },
      metadata: { modelId: 'model-1', providerId: 'provider-1' },
      summary: { title: 'Status' },
    });
    expect(response.findings).toHaveLength(1);
    expect(response.recommendations).toHaveLength(1);
    expect(response.actionItems).toHaveLength(1);
    expect(response.risks).toHaveLength(1);
  });

  it('gracefully falls back for plain text and does not invent confidence', () => {
    const response = service.normalize({
      content: 'Provider explanation',
      modelId: 'model-1',
      providerId: 'provider-1',
    });

    expect(response).toMatchObject({
      diagnostics: { normalized: false },
      summary: { overview: 'Provider explanation', title: 'AI Response' },
    });
    expect(response.confidence).toBeUndefined();
    expect(response.rawContent).toBe('Provider explanation');
  });

  it('ignores malformed section items while retaining valid sections', () => {
    const response = service.normalize({
      content: JSON.stringify({
        findings: [{ title: 'Missing description' }, { description: 'Valid', title: 'Finding' }],
        warnings: ['Review source evidence'],
      }),
      modelId: 'model-1',
      providerId: 'provider-1',
    });

    expect(response.findings).toEqual([
      { description: 'Valid', title: 'Finding' },
    ]);
    expect(response.warnings).toEqual(['Review source evidence']);
  });
});
