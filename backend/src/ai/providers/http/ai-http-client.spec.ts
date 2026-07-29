import { AIHttpClient } from './ai-http-client';
import { AIHttpException, AIHttpFetch } from './ai-http.types';

const createResponse = (input: {
  body: unknown;
  ok: boolean;
  status: number;
}) => ({
  headers: {
    forEach: (callback: (value: string, key: string) => void) =>
      callback('application/json', 'content-type'),
  },
  json: () => Promise.resolve(input.body),
  ok: input.ok,
  status: input.status,
  text: () => Promise.resolve(JSON.stringify(input.body)),
});

describe('AIHttpClient', () => {
  it('sends correlated HTTPS requests with headers and diagnostics', async () => {
    const fetcher = jest
      .fn<ReturnType<AIHttpFetch>, Parameters<AIHttpFetch>>()
      .mockResolvedValue(
        createResponse({
          body: { ok: true },
          ok: true,
          status: 200,
        }),
      );
    const client = new AIHttpClient(fetcher);

    const response = await client.send(
      {
        baseUrl: 'https://provider.example/v1',
        defaultHeaders: { Authorization: 'Bearer test' },
        maxRetries: 0,
        timeoutMs: 1000,
      },
      {
        correlationId: 'corr-1',
        method: 'POST',
        path: '/chat/completions',
      },
    );

    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe('https://provider.example/v1/chat/completions');
    expect(init?.headers.Authorization).toBe('Bearer test');
    expect(init?.headers['X-Correlation-Id']).toBe('corr-1');
    expect(init?.method).toBe('POST');
    expect(response).toMatchObject({
      body: { ok: true },
      diagnostics: {
        attempts: 1,
        status: 200,
      },
      status: 200,
    });
  });

  it('normalizes rate limit responses into retryable exceptions', async () => {
    const client = new AIHttpClient(
      jest
        .fn<ReturnType<AIHttpFetch>, Parameters<AIHttpFetch>>()
        .mockResolvedValue(
          createResponse({
            body: { error: { message: 'slow down' } },
            ok: false,
            status: 429,
          }),
        ),
    );

    await expect(
      client.send(
        {
          baseUrl: 'https://provider.example/v1',
          maxRetries: 0,
          timeoutMs: 1000,
        },
        {
          correlationId: 'corr-1',
          method: 'POST',
          path: '/chat/completions',
        },
      ),
    ).rejects.toMatchObject<Partial<AIHttpException>>({
      code: 'AI_HTTP_RATE_LIMITED',
      retryable: true,
    });
  });
});
