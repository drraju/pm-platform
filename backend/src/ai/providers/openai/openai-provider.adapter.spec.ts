import { AiConfigService } from '../../common';
import {
  AIHttpClient,
  AIHttpException,
  APIKeyAuthenticationProvider,
} from '../http';
import { OpenAIErrorMapper } from './openai-error.mapper';
import { OpenAIProviderAdapter } from './openai-provider.adapter';
import { OpenAIRequestMapper } from './openai-request.mapper';
import { OpenAIResponseMapper } from './openai-response.mapper';

describe('OpenAIProviderAdapter', () => {
  const originalApiKey = process.env.OPENAI_API_KEY;

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalApiKey;
    }
  });

  it('describes disabled provider metadata when API key is missing', () => {
    delete process.env.OPENAI_API_KEY;
    const adapter = createAdapter();

    expect(adapter.describeProvider()).toMatchObject({
      availability: 'disabled',
      id: 'openai',
      health: {
        configured: false,
        status: 'unknown',
      },
    });
  });

  it('normalizes OpenAI responses into provider execution results', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    const send = jest.fn().mockResolvedValue({
      body: {
        choices: [{ message: { content: 'OpenAI result' } }],
        model: 'gpt-test',
      },
    });
    const httpClient = {
      send,
    } as unknown as AIHttpClient;
    const adapter = createAdapter(httpClient);
    adapter.onModuleInit();

    await expect(
      adapter.execute({
        capabilityId: 'chat',
        contextMetadataIds: [],
        executionId: 'exec-1',
        input: 'hello',
        providerId: 'openai',
        requestId: 'req-1',
      }),
    ).resolves.toEqual({
      content: 'OpenAI result',
      modelId: 'gpt-test',
      providerId: 'openai',
    });
    const [configuration, request] = send.mock.calls[0] ?? [];
    expect(configuration).toMatchObject({
      defaultHeaders: {
        Authorization: 'Bearer test-key',
      },
    });
    expect(request).toMatchObject({
      body: {
        messages: [{ content: 'hello', role: 'user' }],
      },
    });
  });

  it('normalizes provider errors into platform errors', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    const send = jest.fn().mockRejectedValue(
      new AIHttpException({
        category: 'provider',
        code: 'AI_HTTP_RATE_LIMITED',
        message: 'rate limited',
        retryable: true,
        status: 429,
      }),
    );
    const httpClient = {
      send,
    } as unknown as AIHttpClient;
    const adapter = createAdapter(httpClient);
    adapter.onModuleInit();

    await expect(
      adapter.execute({
        capabilityId: 'chat',
        contextMetadataIds: [],
        executionId: 'exec-1',
        input: 'hello',
        providerId: 'openai',
        requestId: 'req-1',
      }),
    ).rejects.toMatchObject({
      category: 'provider',
      code: 'AI_RATE_LIMIT_EXCEPTION',
      retryable: true,
    });
  });
});

const createAdapter = (httpClient = new AIHttpClient()) =>
  new OpenAIProviderAdapter(
    new AiConfigService(),
    httpClient,
    new APIKeyAuthenticationProvider(),
    new OpenAIRequestMapper(),
    new OpenAIResponseMapper(),
    new OpenAIErrorMapper(),
  );
